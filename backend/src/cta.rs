//! Call to action buttons on panel announcements. Core's `announcements` table has no room for
//! extension fields, so the buttons live in this extension's settings as one JSON map keyed by the
//! announcement's uuid. The frontend matches a rendered announcement to its uuid and adds the button.

use serde::{Deserialize, Serialize};
use shared::State;
use std::collections::{BTreeMap, HashSet};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

const MAX_TITLE_CHARS: usize = 60;
const MAX_URL_BYTES: usize = 500;
const MAX_ENTRIES: usize = 100;
/// Pruning lists every announcement 100 at a time; past this many pages it is skipped.
const MAX_PRUNE_PAGES: i64 = 20;

#[derive(ToSchema, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Cta {
    /// The text on the button.
    title: String,
    /// Where it goes: `https://...`, `http://...` or a root relative `/path`.
    url: String,
}

type CtaMap = BTreeMap<uuid::Uuid, Cta>;

fn strip_prefix_ignore_case<'a>(s: &'a str, prefix: &str) -> Option<&'a str> {
    let head = s.as_bytes().get(..prefix.len())?;
    // the prefix is ASCII, so a match ends on a char boundary
    head.eq_ignore_ascii_case(prefix.as_bytes()).then(|| &s[prefix.len()..])
}

/// The frontend's `SAFE_URL`: http(s) or root relative (`/x`, never `//host`), and none of the
/// characters that could leave an attribute or a CSS `url()`. A backslash is refused too, browsers
/// read `/\host` as another origin.
fn valid_url(url: &str) -> bool {
    if url.len() > MAX_URL_BYTES {
        return false;
    }

    let rest = if let Some(rest) = strip_prefix_ignore_case(url, "https://")
        .or_else(|| strip_prefix_ignore_case(url, "http://"))
    {
        rest
    } else if let Some(rest) = url.strip_prefix('/') {
        if rest.starts_with('/') {
            return false;
        }
        rest
    } else {
        return false;
    };

    !rest.is_empty()
        && rest.chars().all(|c| {
            !c.is_whitespace()
                && !c.is_control()
                && !matches!(
                    c,
                    '\u{feff}' | '"' | '\'' | '(' | ')' | '\\' | '<' | '>' | ';' | '{' | '}'
                )
        })
}

/// Trims both fields and checks them; the message is shown to the admin as is.
fn validate(title: &str, url: &str) -> Result<Cta, String> {
    let title = title.trim();
    let chars = title.chars().count();
    if chars == 0 {
        return Err("title: must not be empty".into());
    }
    if chars > MAX_TITLE_CHARS {
        return Err(format!("title: must be at most {MAX_TITLE_CHARS} characters"));
    }
    if title.chars().any(char::is_control) {
        return Err("title: must not contain control characters".into());
    }

    let url = url.trim();
    if url.len() > MAX_URL_BYTES {
        return Err(format!("url: must be at most {MAX_URL_BYTES} characters"));
    }
    if !valid_url(url) {
        return Err("url: must start with https://, http:// or a single / and must not contain spaces, quotes, angle brackets, parentheses, braces, semicolons or backslashes".into());
    }

    Ok(Cta {
        title: title.into(),
        url: url.into(),
    })
}

/// Empty or unparsable settings mean no buttons; entries that no longer pass are dropped.
fn parse(raw: &str) -> CtaMap {
    serde_json::from_str::<CtaMap>(raw)
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(uuid, cta)| validate(&cta.title, &cta.url).ok().map(|cta| (uuid, cta)))
        .collect()
}

/// Every announcement's uuid, or None when there are too many to list cheaply.
async fn known_announcements(state: &State) -> Result<Option<HashSet<uuid::Uuid>>, anyhow::Error> {
    use shared::models::announcement::Announcement;

    let mut known = HashSet::new();
    for page in 1..=MAX_PRUNE_PAGES {
        let batch = Announcement::all_with_pagination(&state.database, page, 100, None).await?;
        let len = batch.data.len();
        known.extend(batch.data.into_iter().map(|announcement| announcement.uuid));
        if len < 100 || known.len() as i64 >= batch.total {
            return Ok(Some(known));
        }
    }

    Ok(None)
}

mod get {
    use serde::Serialize;
    use shared::{
        GetState,
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {
        /// Announcement uuid to its button.
        #[schema(value_type = std::collections::BTreeMap<String, super::Cta>)]
        ctas: super::CtaMap,
    }

    #[utoipa::path(get, path = "/", responses((status = OK, body = inline(Response))))]
    pub async fn route(state: GetState) -> ApiResponseResult {
        let settings = state.settings.get().await?;
        let ctas = settings
            .find_extension_settings::<crate::settings::ExtensionSettingsData>()
            .map(|s| super::parse(&s.announcement_ctas))
            .unwrap_or_default();
        drop(settings);

        ApiResponse::new_serialized(Response { ctas }).ok()
    }
}

mod put {
    use axum::http::StatusCode;
    use serde::{Deserialize, Serialize};
    use shared::{
        ApiError, GetState,
        models::{
            ByUuid, admin_activity::GetAdminActivityLogger, announcement::Announcement,
            user::GetPermissionManager,
        },
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Deserialize)]
    pub struct Payload {
        announcement: uuid::Uuid,
        /// The button, or null to remove it.
        cta: Option<super::Cta>,
    }

    #[derive(ToSchema, Serialize)]
    struct Response {
        /// The button as stored (trimmed), or null.
        cta: Option<super::Cta>,
    }

    #[utoipa::path(put, path = "/", responses(
        (status = OK, body = inline(Response)),
        (status = BAD_REQUEST, body = ApiError),
        (status = NOT_FOUND, body = ApiError),
    ), request_body = inline(Payload))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        activity_logger: GetAdminActivityLogger,
        shared::Payload(data): shared::Payload<Payload>,
    ) -> ApiResponseResult {
        // the same gate as editing the announcement itself
        permissions.has_admin_permission("announcements.update")?;

        let bad = |message: &str| {
            ApiResponse::error(message)
                .with_status(StatusCode::BAD_REQUEST)
                .ok()
        };

        let cta = match data.cta {
            Some(cta) => match super::validate(&cta.title, &cta.url) {
                Ok(cta) => Some(cta),
                Err(message) => return bad(&message),
            },
            None => None,
        };

        if cta.is_some()
            && Announcement::by_uuid_optional(&state.database, data.announcement)
                .await?
                .is_none()
        {
            return ApiResponse::error("announcement not found")
                .with_status(StatusCode::NOT_FOUND)
                .ok();
        }

        // listed before taking the settings lock, buttons of deleted announcements are dropped below
        let known = super::known_announcements(&state).await?;

        let mut settings = state.settings.get_mut().await?;
        let stored =
            settings.find_mut_extension_settings::<crate::settings::ExtensionSettingsData>()?;

        let mut ctas = super::parse(&stored.announcement_ctas);
        if let Some(known) = &known {
            ctas.retain(|uuid, _| known.contains(uuid));
        }
        match &cta {
            Some(cta) => {
                if !ctas.contains_key(&data.announcement) && ctas.len() >= super::MAX_ENTRIES {
                    return bad("too many announcements have a call to action, remove one first");
                }
                ctas.insert(data.announcement, cta.clone());
            }
            None => {
                ctas.remove(&data.announcement);
            }
        }

        stored.announcement_ctas = serde_json::to_string(&ctas)?.into();
        settings.save().await?;

        activity_logger
            .log(
                "mint:announcement-cta.update",
                serde_json::json!({
                    "announcement": data.announcement,
                    "cta": &cta,
                }),
            )
            .await;

        ApiResponse::new_serialized(Response { cta }).ok()
    }
}

/// `GET`, for signed in users: the panel only shows announcements inside the signed in layout.
pub fn client(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route))
        .with_state(state.clone())
}

/// `PUT`, gated by `announcements.update`.
pub fn admin(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(put::route))
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    use super::{MAX_TITLE_CHARS, MAX_URL_BYTES, parse, valid_url, validate};

    #[test]
    fn url_accepts_http_and_root_relative() {
        assert!(valid_url("https://example.com/store?a=1&b=2#top"));
        assert!(valid_url("http://example.com"));
        assert!(valid_url("HTTPS://Example.com"));
        assert!(valid_url("/admin/announcements"));
        assert!(valid_url("/server/abc123/console"));
    }

    #[test]
    fn url_rejects_other_origins_and_schemes() {
        assert!(!valid_url(""));
        assert!(!valid_url("/"));
        assert!(!valid_url("https://"));
        assert!(!valid_url("//evil.example"));
        assert!(!valid_url("/\\evil.example"));
        assert!(!valid_url("javascript:alert(1)"));
        assert!(!valid_url("data:text/html,x"));
        assert!(!valid_url("ftp://example.com"));
        assert!(!valid_url("example.com"));
        assert!(!valid_url("admin/foo"));
    }

    #[test]
    fn url_rejects_breakout_characters() {
        for bad in [
            "/a b", "/a\tb", "/a\"b", "/a'b", "/a<b", "/a>b", "/a(b", "/a)b", "/a;b", "/a{b",
            "/a}b", "/a\\b", "/a\u{0}b", "/a\u{a0}b", "/a\u{feff}b",
        ] {
            assert!(!valid_url(bad), "{bad:?} should be refused");
        }
    }

    #[test]
    fn url_length_is_capped() {
        let ok = format!("/{}", "a".repeat(MAX_URL_BYTES - 1));
        assert!(valid_url(&ok));
        assert!(!valid_url(&format!("{ok}a")));
        assert!(validate("Go", &format!("{ok}a")).is_err());
    }

    #[test]
    fn title_is_trimmed_and_bounded() {
        let cta = validate("  Visit the store  ", " https://example.com ").unwrap();
        assert_eq!(cta.title, "Visit the store");
        assert_eq!(cta.url, "https://example.com");

        assert!(validate("", "/a").is_err());
        assert!(validate("   ", "/a").is_err());
        assert!(validate("a\nb", "/a").is_err());
        assert!(validate(&"é".repeat(MAX_TITLE_CHARS), "/a").is_ok());
        assert!(validate(&"é".repeat(MAX_TITLE_CHARS + 1), "/a").is_err());
    }

    #[test]
    fn parse_keeps_valid_entries_only() {
        assert!(parse("").is_empty());
        assert!(parse("{broken").is_empty());
        assert!(parse(r#"{"not-a-uuid":{"title":"a","url":"/a"}}"#).is_empty());

        let map = parse(
            r#"{
                "00000000-0000-0000-0000-000000000001":{"title":"Store","url":"/store"},
                "00000000-0000-0000-0000-000000000002":{"title":"Bad","url":"javascript:x"}
            }"#,
        );
        assert_eq!(map.len(), 1);
        assert_eq!(map.values().next().unwrap().url, "/store");
    }

    #[test]
    fn parse_round_trips_what_is_stored() {
        let mut map = super::CtaMap::new();
        map.insert(uuid::Uuid::nil(), validate("Go", "/a").unwrap());
        assert_eq!(parse(&serde_json::to_string(&map).unwrap()), map);
    }
}
