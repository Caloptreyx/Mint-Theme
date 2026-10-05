use shared::State;
use std::sync::{Arc, PoisonError, RwLock};
use utoipa_axum::{router::OpenApiRouter, routes};

pub(crate) const MAX_THEME_BYTES: usize = 64 * 1024;

/// Empty or unparsable settings mean "use the built-in look".
pub(crate) fn parse(raw: &str) -> Option<serde_json::Value> {
    serde_json::from_str::<serde_json::Value>(raw)
        .ok()
        .filter(|v| v.is_object())
}

/// The length of `value` as JSON, counted without building the string.
pub(crate) fn json_len(value: &impl serde::Serialize) -> usize {
    struct Counter(usize);

    impl std::io::Write for Counter {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            self.0 += buf.len();
            Ok(buf.len())
        }

        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    let mut counter = Counter(0);
    match serde_json::to_writer(&mut counter, value) {
        Ok(()) => counter.0,
        Err(_) => usize::MAX,
    }
}

/// Identifies a stored theme string: the public route's ETag and the `base` the editor sends back.
/// Empty for the built-in look (nothing stored).
pub(crate) fn version(stored: &str) -> String {
    use sha2::Digest;

    if stored.is_empty() {
        return String::new();
    }
    hex::encode(sha2::Sha256::digest(stored.as_bytes()))
}

#[derive(Debug)]
pub(crate) enum StoreError {
    /// Shown to the admin as is.
    Bad(&'static str),
    /// The stored theme is not the one the editor loaded.
    Conflict,
    Internal(serde_json::Error),
}

/// Saves `theme` (None: the built-in look) as the site theme and returns its version. The replaced
/// theme moves to the history unless nothing changed. With a `base`, the save is refused when the
/// stored theme is no longer that version, so one admin's save never silently drops another's.
pub(crate) fn store_theme(
    stored: &mut crate::settings::ExtensionSettingsData,
    theme: Option<serde_json::Value>,
    base: Option<&str>,
    user: &str,
    at: i64,
) -> Result<String, StoreError> {
    let serialized = match theme {
        None => String::new(),
        Some(theme) if theme.is_object() => theme.to_string(),
        Some(_) => return Err(StoreError::Bad("theme must be an object")),
    };
    if serialized.len() > MAX_THEME_BYTES {
        return Err(StoreError::Bad("theme is too large"));
    }
    if let Some(base) = base
        && base != version(&stored.theme)
    {
        return Err(StoreError::Conflict);
    }

    if stored.theme != serialized.as_str() {
        stored.theme_history = crate::history::push(&stored.theme_history, &stored.theme, at, user)
            .map_err(StoreError::Internal)?
            .into();
    }
    stored.theme = serialized.into();

    Ok(version(&stored.theme))
}

#[derive(utoipa::ToSchema, serde::Serialize)]
struct ThemeResponse {
    theme: Option<serde_json::Value>,
    /// Identifies the stored theme; empty for the built-in look. Also the ETag.
    version: String,
}

/// The public route's answer for one stored theme string, built once per saved version.
struct Built {
    stored: compact_str::CompactString,
    etag: String,
    body: axum::body::Bytes,
}

static BUILT: RwLock<Option<Arc<Built>>> = RwLock::new(None);

fn build(stored: &str) -> Built {
    let version = version(stored);
    let etag = format!("\"{version}\"");
    let body = serde_json::to_vec(&ThemeResponse {
        theme: parse(stored),
        version,
    })
    .unwrap_or_else(|_| b"{}".to_vec());

    Built {
        stored: stored.into(),
        etag,
        body: body.into(),
    }
}

fn built(stored: &str) -> Arc<Built> {
    let cached = BUILT.read().unwrap_or_else(PoisonError::into_inner).clone();
    if let Some(cached) = cached
        && cached.stored == stored
    {
        return cached;
    }

    let fresh = Arc::new(build(stored));
    *BUILT.write().unwrap_or_else(PoisonError::into_inner) = Some(fresh.clone());
    fresh
}

/// Whether an `If-None-Match` header names `etag` (weak tags compare equal, `*` matches anything).
fn etag_matches(if_none_match: &str, etag: &str) -> bool {
    if_none_match
        .split(',')
        .map(str::trim)
        .any(|tag| tag == "*" || tag.strip_prefix("W/").unwrap_or(tag) == etag)
}

mod get {
    use axum::{
        body::Body,
        http::{HeaderMap, StatusCode, header::IF_NONE_MATCH},
    };
    use shared::{
        GetState,
        response::{ApiResponse, ApiResponseResult},
    };

    #[utoipa::path(get, path = "/", responses(
        (status = OK, body = inline(super::ThemeResponse)),
        (status = NOT_MODIFIED, description = "The If-None-Match version is still current"),
    ))]
    pub async fn route(state: GetState, headers: HeaderMap) -> ApiResponseResult {
        let settings = state.settings.get().await?;
        let built = super::built(
            settings
                .find_extension_settings::<crate::settings::ExtensionSettingsData>()
                .map(|s| s.theme.as_str())
                .unwrap_or_default(),
        );
        drop(settings);

        let unchanged = headers
            .get(IF_NONE_MATCH)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| super::etag_matches(value, &built.etag));

        let response = if unchanged {
            ApiResponse::new(Body::empty()).with_status(StatusCode::NOT_MODIFIED)
        } else {
            ApiResponse::new(Body::from(built.body.clone()))
                .with_header("content-type", "application/json")
        };

        // every load revalidates, so a saved theme shows on the next one
        response
            .with_header("etag", &built.etag)
            .with_header("cache-control", "no-cache")
            .ok()
    }
}

mod put {
    use axum::http::StatusCode;
    use serde::{Deserialize, Serialize};
    use shared::{
        GetState,
        models::{
            admin_activity::GetAdminActivityLogger,
            user::{GetPermissionManager, GetUser},
        },
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    /// Tells a missing field (None) from an explicit null (Some(None)).
    fn present<'de, D: serde::Deserializer<'de>>(
        deserializer: D,
    ) -> Result<Option<Option<serde_json::Value>>, D::Error> {
        Option::<serde_json::Value>::deserialize(deserializer).map(Some)
    }

    #[derive(ToSchema, Deserialize)]
    pub struct Payload {
        /// The editor config, or null to go back to the built-in look. Required, so a body
        /// without it never resets the theme by accident.
        #[serde(default, deserialize_with = "present")]
        #[schema(value_type = Object)]
        theme: Option<Option<serde_json::Value>>,
        /// The `version` the editor loaded. When the stored theme has changed since, nothing is
        /// saved and the answer is 409.
        #[serde(default)]
        base: Option<String>,
    }

    #[derive(ToSchema, Serialize)]
    struct Response {
        /// The saved theme's version, the `base` for the next save.
        version: String,
    }

    #[utoipa::path(put, path = "/", responses(
        (status = OK, body = inline(Response)),
        (status = BAD_REQUEST, body = shared::ApiError),
        (status = CONFLICT, body = shared::ApiError),
    ), request_body = inline(Payload))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        user: GetUser,
        activity_logger: GetAdminActivityLogger,
        shared::Payload(data): shared::Payload<Payload>,
    ) -> ApiResponseResult {
        permissions.has_admin_permission("settings.update")?;

        let Some(theme) = data.theme else {
            return ApiResponse::error(
                "theme: required, send null to go back to the built-in look",
            )
            .with_status(StatusCode::BAD_REQUEST)
            .ok();
        };

        let mut settings = state.settings.get_mut().await?;
        let stored =
            settings.find_mut_extension_settings::<crate::settings::ExtensionSettingsData>()?;
        let version = match super::store_theme(
            stored,
            theme,
            data.base.as_deref(),
            &user.username,
            crate::history::now(),
        ) {
            Ok(version) => version,
            Err(super::StoreError::Bad(message)) => {
                return ApiResponse::error(message)
                    .with_status(StatusCode::BAD_REQUEST)
                    .ok();
            }
            Err(super::StoreError::Conflict) => {
                return ApiResponse::error(
                    "the theme was saved by someone else since you loaded it, reload it or save again to overwrite",
                )
                .with_status(StatusCode::CONFLICT)
                .ok();
            }
            Err(super::StoreError::Internal(err)) => return Err(err.into()),
        };
        settings.save().await?;

        activity_logger
            .log("mint:theme.update", serde_json::json!({}))
            .await;

        ApiResponse::new_serialized(Response { version }).ok()
    }
}

pub fn public(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .nest("/theme", OpenApiRouter::new().routes(routes!(get::route)))
        .with_state(state.clone())
}

pub fn admin(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .nest("/theme", OpenApiRouter::new().routes(routes!(put::route)))
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    use super::{
        MAX_THEME_BYTES, StoreError, build, etag_matches, json_len, parse, store_theme, version,
    };
    use crate::settings::ExtensionSettingsData;
    use serde_json::json;

    fn history_len(stored: &ExtensionSettingsData) -> usize {
        serde_json::from_str::<serde_json::Value>(&stored.theme_history)
            .ok()
            .and_then(|h| h["entries"].as_array().map(Vec::len))
            .unwrap_or(0)
    }

    #[test]
    fn parse_accepts_objects_only() {
        assert!(parse(r##"{"accent":"#1e88c7"}"##).is_some());
        assert!(parse("").is_none());
        assert!(parse("[1,2]").is_none());
        assert!(parse("\"x\"").is_none());
        assert!(parse("{broken").is_none());
    }

    #[test]
    fn json_len_matches_the_serialized_length() {
        let value = json!({ "accent": "#1e88c7", "name": "é\"\n", "list": [1, 2.5, null] });
        assert_eq!(json_len(&value), value.to_string().len());
    }

    #[test]
    fn version_identifies_the_stored_string() {
        assert_eq!(version(""), "");
        assert_eq!(version("{}").len(), 64);
        assert_eq!(version("{}"), version("{}"));
        assert_ne!(version("{}"), version(r#"{"a":1}"#));
    }

    #[test]
    fn store_theme_checks_shape_and_size() {
        let mut stored = ExtensionSettingsData::default();
        assert!(matches!(
            store_theme(&mut stored, Some(json!([1])), None, "admin", 1),
            Err(StoreError::Bad(_))
        ));
        let huge = json!({ "homeBanner": "a".repeat(MAX_THEME_BYTES) });
        assert!(matches!(
            store_theme(&mut stored, Some(huge), None, "admin", 1),
            Err(StoreError::Bad(_))
        ));
        assert_eq!(stored.theme, "", "a refused theme is not saved");

        // just under the cap still fits
        let padding = MAX_THEME_BYTES - r#"{"homeBanner":""}"#.len();
        let fits = json!({ "homeBanner": "a".repeat(padding) });
        store_theme(&mut stored, Some(fits), None, "admin", 1).unwrap();
        assert_eq!(stored.theme.len(), MAX_THEME_BYTES);
    }

    #[test]
    fn store_theme_records_history_only_on_change() {
        let mut stored = ExtensionSettingsData::default();
        let theme = json!({ "accent": "#123456" });

        let first = store_theme(&mut stored, Some(theme.clone()), None, "alice", 1).unwrap();
        assert_eq!(first, version(&stored.theme));
        assert_eq!(history_len(&stored), 1, "the built-in look it replaced");

        let again = store_theme(&mut stored, Some(theme), None, "bob", 2).unwrap();
        assert_eq!(again, first);
        assert_eq!(
            history_len(&stored),
            1,
            "saving the same theme adds nothing"
        );

        let reset = store_theme(&mut stored, None, None, "carol", 3).unwrap();
        assert_eq!(reset, "");
        assert_eq!(stored.theme, "");
        assert_eq!(history_len(&stored), 2);
    }

    #[test]
    fn store_theme_refuses_a_stale_base() {
        let mut stored = ExtensionSettingsData::default();
        // nothing stored yet: the editor loaded version ""
        let loaded = store_theme(
            &mut stored,
            Some(json!({ "radius": 1 })),
            Some(""),
            "alice",
            1,
        )
        .unwrap();

        // bob loaded the same version, alice saves first
        let alice = store_theme(
            &mut stored,
            Some(json!({ "radius": 2 })),
            Some(loaded.as_str()),
            "alice",
            2,
        )
        .unwrap();
        let before = stored.theme.clone();
        assert!(matches!(
            store_theme(
                &mut stored,
                Some(json!({ "radius": 3 })),
                Some(loaded.as_str()),
                "bob",
                3
            ),
            Err(StoreError::Conflict)
        ));
        assert_eq!(stored.theme, before, "a refused save changes nothing");
        assert_eq!(history_len(&stored), 2);

        // with the current version, or no base at all (overwrite), it saves
        store_theme(
            &mut stored,
            Some(json!({ "radius": 3 })),
            Some(alice.as_str()),
            "bob",
            3,
        )
        .unwrap();
        store_theme(&mut stored, Some(json!({ "radius": 4 })), None, "bob", 4).unwrap();
    }

    #[test]
    fn built_body_carries_theme_and_version() {
        let stored = r##"{"accent":"#1e88c7"}"##;
        let built = build(stored);
        let body: serde_json::Value = serde_json::from_slice(&built.body).unwrap();
        assert_eq!(body["theme"], json!({ "accent": "#1e88c7" }));
        assert_eq!(body["version"], version(stored));
        assert!(body.get("choices").is_none());
        assert_eq!(built.etag, format!("\"{}\"", version(stored)));

        let empty: serde_json::Value = serde_json::from_slice(&build("").body).unwrap();
        assert_eq!(empty, json!({ "theme": null, "version": "" }));
    }

    #[test]
    fn if_none_match_lists_and_weak_tags() {
        assert!(etag_matches("\"abc\"", "\"abc\""));
        assert!(etag_matches("W/\"abc\"", "\"abc\""));
        assert!(etag_matches("\"x\", \"abc\"", "\"abc\""));
        assert!(etag_matches("*", "\"abc\""));
        assert!(!etag_matches("\"abd\"", "\"abc\""));
        assert!(!etag_matches("", "\"abc\""));
    }
}
