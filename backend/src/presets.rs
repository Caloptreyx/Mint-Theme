//! Custom theme presets and the presets users may pick as their own theme. Both live in the
//! `presets` setting as one JSON object: `{ custom: [Preset], builtin: [id] }`. A preset's theme is
//! the editor's JSON, opaque here like the saved theme; the frontend normalizes it before use.
//! Built in presets exist only in the frontend (`PRESETS`), so they are listed by id (a slug of the
//! name) and an unknown id is simply ignored there.

use serde::{Deserialize, Serialize};
use shared::State;
use std::collections::HashSet;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

const MAX_NAME_CHARS: usize = 40;
const MAX_CUSTOM: usize = 20;
const MAX_BUILTIN: usize = 50;
const MAX_BUILTIN_ID_CHARS: usize = 40;
/// Each preset's theme gets the theme PUT's cap, all of them together four times that.
const MAX_TOTAL_BYTES: usize = 4 * crate::routes::MAX_THEME_BYTES;

#[derive(ToSchema, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Preset {
    id: uuid::Uuid,
    name: String,
    /// A full editor config.
    #[schema(value_type = Object)]
    theme: serde_json::Value,
    /// Users can pick it as their own theme on the account page.
    #[serde(default)]
    users: bool,
}

#[derive(ToSchema, Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct Library {
    custom: Vec<Preset>,
    /// Ids of the built in presets users can pick.
    builtin: Vec<String>,
}

/// What signed in users get: only the presets they may pick.
#[derive(ToSchema, Serialize, Clone, Debug, Default, PartialEq)]
pub struct Choices {
    builtin: Vec<String>,
    custom: Vec<Choice>,
}

#[derive(ToSchema, Serialize, Clone, Debug, PartialEq)]
pub struct Choice {
    id: uuid::Uuid,
    name: String,
    #[schema(value_type = Object)]
    theme: serde_json::Value,
}

/// Trimmed, 1 to 40 characters, no control characters; the message is shown to the admin as is.
fn validate_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    let chars = name.chars().count();
    if chars == 0 {
        return Err("name: must not be empty".into());
    }
    if chars > MAX_NAME_CHARS {
        return Err(format!("name: must be at most {MAX_NAME_CHARS} characters"));
    }
    if name.chars().any(char::is_control) {
        return Err("name: must not contain control characters".into());
    }
    Ok(name.into())
}

fn validate_theme(theme: serde_json::Value) -> Result<serde_json::Value, String> {
    if !theme.is_object() {
        return Err("theme must be an object".into());
    }
    if crate::routes::json_len(&theme) > crate::routes::MAX_THEME_BYTES {
        return Err("theme is too large".into());
    }
    Ok(theme)
}

/// The frontend's `builtinId()`: lowercase letters, digits and dashes. Never a uuid, which is a custom preset.
fn valid_builtin_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_BUILTIN_ID_CHARS
        && id
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && uuid::Uuid::parse_str(id).is_err()
}

fn fits(library: &Library) -> bool {
    crate::routes::json_len(library) <= MAX_TOTAL_BYTES
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct RawLibrary {
    custom: Vec<serde_json::Value>,
    builtin: Vec<serde_json::Value>,
}

/// Empty or unparsable settings mean no presets; entries that no longer pass are dropped one by one.
fn parse(raw: &str) -> Library {
    let raw = serde_json::from_str::<RawLibrary>(raw).unwrap_or_default();

    let mut ids = HashSet::new();
    let custom = raw
        .custom
        .into_iter()
        .filter_map(|value| serde_json::from_value::<Preset>(value).ok())
        .filter_map(|preset| {
            Some(Preset {
                name: validate_name(&preset.name).ok()?,
                theme: validate_theme(preset.theme).ok()?,
                ..preset
            })
        })
        .filter(|preset| ids.insert(preset.id))
        .take(MAX_CUSTOM)
        .collect();

    let mut builtin_ids = HashSet::new();
    let builtin = raw
        .builtin
        .into_iter()
        .filter_map(|value| value.as_str().map(str::to_owned))
        .filter(|id| valid_builtin_id(id) && builtin_ids.insert(id.clone()))
        .take(MAX_BUILTIN)
        .collect();

    Library { custom, builtin }
}

/// The presets users may pick, for the client theme choices route.
pub fn choices(raw: &str) -> Choices {
    let library = parse(raw);
    Choices {
        builtin: library.builtin,
        custom: library
            .custom
            .into_iter()
            .filter(|preset| preset.users)
            .map(|preset| Choice {
                id: preset.id,
                name: preset.name,
                theme: preset.theme,
            })
            .collect(),
    }
}

/// Applies one change to the library; the message is shown to the admin as is.
#[derive(Debug)]
enum Change {
    Create {
        name: String,
        theme: serde_json::Value,
        users: bool,
    },
    Update {
        id: String,
        name: Option<String>,
        theme: Option<serde_json::Value>,
        users: Option<bool>,
    },
    Delete {
        id: String,
    },
}

#[derive(Debug, PartialEq)]
enum ChangeError {
    Bad(String),
    NotFound,
}

/// Returns the preset's id and name for the activity log; on an error the library is left untouched.
fn apply(library: &mut Library, change: Change) -> Result<(String, String), ChangeError> {
    let mut next = library.clone();
    let logged = edit(&mut next, change)?;
    if !fits(&next) {
        return Err(ChangeError::Bad(
            "presets are too large together, delete one first".into(),
        ));
    }
    *library = next;
    Ok(logged)
}

fn edit(library: &mut Library, change: Change) -> Result<(String, String), ChangeError> {
    let bad = |message: &str| Err(ChangeError::Bad(message.into()));

    Ok(match change {
        Change::Create { name, theme, users } => {
            let name = validate_name(&name).map_err(ChangeError::Bad)?;
            let theme = validate_theme(theme).map_err(ChangeError::Bad)?;
            if library.custom.len() >= MAX_CUSTOM {
                return bad(&format!(
                    "at most {MAX_CUSTOM} presets can be saved, delete one first"
                ));
            }
            let id = uuid::Uuid::new_v4();
            library.custom.push(Preset {
                id,
                name: name.clone(),
                theme,
                users,
            });
            (id.to_string(), name)
        }
        Change::Update {
            id,
            name,
            theme,
            users,
        } => {
            let custom = uuid::Uuid::parse_str(&id)
                .ok()
                .and_then(|uuid| library.custom.iter_mut().find(|p| p.id == uuid));
            if let Some(preset) = custom {
                if let Some(name) = name {
                    preset.name = validate_name(&name).map_err(ChangeError::Bad)?;
                }
                // the id stays, so users who picked this preset keep it with its new look
                if let Some(theme) = theme {
                    preset.theme = validate_theme(theme).map_err(ChangeError::Bad)?;
                }
                if let Some(users) = users {
                    preset.users = users;
                }
                (id, preset.name.clone())
            } else if valid_builtin_id(&id) {
                if name.is_some() {
                    return bad("built in presets cannot be renamed");
                }
                if theme.is_some() {
                    return bad("built in presets cannot be changed");
                }
                match users {
                    Some(true) if !library.builtin.contains(&id) => {
                        if library.builtin.len() >= MAX_BUILTIN {
                            return bad("too many built in presets are selectable");
                        }
                        library.builtin.push(id.clone());
                    }
                    Some(false) => library.builtin.retain(|b| b != &id),
                    _ => {}
                }
                (id.clone(), id)
            } else {
                return Err(ChangeError::NotFound);
            }
        }
        Change::Delete { id } => {
            let uuid = uuid::Uuid::parse_str(&id).map_err(|_| ChangeError::NotFound)?;
            let index = library
                .custom
                .iter()
                .position(|p| p.id == uuid)
                .ok_or(ChangeError::NotFound)?;
            (id, library.custom.remove(index).name)
        }
    })
}

/// Reads the library, applies the change, saves it and logs `event`.
async fn change(
    state: &State,
    activity_logger: &shared::models::admin_activity::AdminActivityLogger,
    event: &str,
    change: Change,
) -> shared::response::ApiResponseResult {
    use axum::http::StatusCode;
    use shared::response::ApiResponse;

    let users = match &change {
        Change::Create { users, .. } => Some(*users),
        Change::Update { users, .. } => *users,
        Change::Delete { .. } => None,
    };

    let mut settings = state.settings.get_mut().await?;
    let stored =
        settings.find_mut_extension_settings::<crate::settings::ExtensionSettingsData>()?;
    let mut library = parse(&stored.presets);

    let (id, name) = match apply(&mut library, change) {
        Ok(logged) => logged,
        Err(ChangeError::Bad(message)) => {
            return ApiResponse::error(&message)
                .with_status(StatusCode::BAD_REQUEST)
                .ok();
        }
        Err(ChangeError::NotFound) => {
            return ApiResponse::error("preset not found")
                .with_status(StatusCode::NOT_FOUND)
                .ok();
        }
    };

    stored.presets = serde_json::to_string(&library)?.into();
    settings.save().await?;

    activity_logger
        .log(
            event,
            serde_json::json!({ "id": id, "name": name, "users": users }),
        )
        .await;

    ApiResponse::new_serialized(library).ok()
}

mod get {
    use shared::{
        GetState,
        models::user::GetPermissionManager,
        response::{ApiResponse, ApiResponseResult},
    };

    #[utoipa::path(get, path = "/", responses((status = OK, body = super::Library)))]
    pub async fn route(state: GetState, permissions: GetPermissionManager) -> ApiResponseResult {
        crate::permissions::can_read(&permissions)?;

        let settings = state.settings.get().await?;
        let library = settings
            .find_extension_settings::<crate::settings::ExtensionSettingsData>()
            .map(|s| super::parse(&s.presets))
            .unwrap_or_default();
        drop(settings);

        ApiResponse::new_serialized(library).ok()
    }
}

mod post {
    use serde::Deserialize;
    use shared::{
        ApiError, GetState,
        models::{admin_activity::GetAdminActivityLogger, user::GetPermissionManager},
        response::ApiResponseResult,
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Deserialize)]
    pub struct Payload {
        name: String,
        /// A full editor config.
        #[schema(value_type = Object)]
        theme: serde_json::Value,
        #[serde(default)]
        users: bool,
    }

    #[utoipa::path(post, path = "/", responses(
        (status = OK, body = super::Library),
        (status = BAD_REQUEST, body = ApiError),
    ), request_body = inline(Payload))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        activity_logger: GetAdminActivityLogger,
        shared::Payload(data): shared::Payload<Payload>,
    ) -> ApiResponseResult {
        crate::permissions::can_update(&permissions)?;

        super::change(
            &state,
            &activity_logger,
            "mint:preset.create",
            super::Change::Create {
                name: data.name,
                theme: data.theme,
                users: data.users,
            },
        )
        .await
    }
}

mod patch {
    use axum::extract::Path;
    use serde::Deserialize;
    use shared::{
        ApiError, GetState,
        models::{admin_activity::GetAdminActivityLogger, user::GetPermissionManager},
        response::ApiResponseResult,
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Deserialize)]
    pub struct Payload {
        /// Custom presets only.
        name: Option<String>,
        /// Custom presets only: replaces the preset's look (a full editor config), keeping its id.
        theme: Option<serde_json::Value>,
        users: Option<bool>,
    }

    #[utoipa::path(patch, path = "/", responses(
        (status = OK, body = super::Library),
        (status = BAD_REQUEST, body = ApiError),
        (status = NOT_FOUND, body = ApiError),
    ), params(
        ("preset" = String, description = "A custom preset's uuid or a built in preset's id"),
    ), request_body = inline(Payload))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        activity_logger: GetAdminActivityLogger,
        Path(preset): Path<String>,
        shared::Payload(data): shared::Payload<Payload>,
    ) -> ApiResponseResult {
        crate::permissions::can_update(&permissions)?;

        super::change(
            &state,
            &activity_logger,
            "mint:preset.update",
            super::Change::Update {
                id: preset,
                name: data.name,
                theme: data.theme,
                users: data.users,
            },
        )
        .await
    }
}

mod delete {
    use axum::extract::Path;
    use shared::{
        ApiError, GetState,
        models::{admin_activity::GetAdminActivityLogger, user::GetPermissionManager},
        response::ApiResponseResult,
    };

    #[utoipa::path(delete, path = "/", responses(
        (status = OK, body = super::Library),
        (status = NOT_FOUND, body = ApiError),
    ), params(
        ("preset" = uuid::Uuid, description = "The custom preset's uuid"),
    ))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        activity_logger: GetAdminActivityLogger,
        Path(preset): Path<String>,
    ) -> ApiResponseResult {
        crate::permissions::can_update(&permissions)?;

        super::change(
            &state,
            &activity_logger,
            "mint:preset.delete",
            super::Change::Delete { id: preset },
        )
        .await
    }
}

mod choices_get {
    use serde::Serialize;
    use shared::{
        GetState,
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {
        choices: super::Choices,
    }

    #[utoipa::path(get, path = "/", responses((status = OK, body = inline(Response))))]
    pub async fn route(state: GetState) -> ApiResponseResult {
        let settings = state.settings.get().await?;
        let choices = settings
            .find_extension_settings::<crate::settings::ExtensionSettingsData>()
            .map(|s| super::choices(&s.presets))
            .unwrap_or_default();
        drop(settings);

        ApiResponse::new_serialized(Response { choices }).ok()
    }
}

/// `GET` the presets users may pick, for any signed in user: a pick only applies signed in, so
/// visitors of the public theme route never get the presets' themes.
pub fn client(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(choices_get::route))
        .with_state(state.clone())
}

/// `GET` (`settings.read` or `mint-theme.update`) and `POST` on the library, `PATCH` and `DELETE` on one preset
/// (writes: `settings.update` or `mint-theme.update`).
pub fn admin(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route, post::route))
        .nest(
            "/{preset}",
            OpenApiRouter::new().routes(routes!(patch::route, delete::route)),
        )
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    use super::{
        Change, ChangeError, Library, MAX_CUSTOM, MAX_NAME_CHARS, apply, choices, parse,
        valid_builtin_id, validate_name,
    };
    use crate::routes::MAX_THEME_BYTES;
    use serde_json::json;

    fn create(library: &mut Library, name: &str) -> Result<(String, String), ChangeError> {
        apply(
            library,
            Change::Create {
                name: name.into(),
                theme: json!({ "accent": "#2fbf8f" }),
                users: false,
            },
        )
    }

    #[test]
    fn name_is_trimmed_and_bounded() {
        assert_eq!(validate_name("  Ocean  ").unwrap(), "Ocean");
        assert!(validate_name("").is_err());
        assert!(validate_name("   ").is_err());
        assert!(validate_name("a\nb").is_err());
        assert!(validate_name(&"é".repeat(MAX_NAME_CHARS)).is_ok());
        assert!(validate_name(&"é".repeat(MAX_NAME_CHARS + 1)).is_err());
    }

    #[test]
    fn builtin_ids_are_slugs() {
        assert!(valid_builtin_id("mint"));
        assert!(valid_builtin_id("deep-sea-2"));
        assert!(!valid_builtin_id(""));
        assert!(!valid_builtin_id("Mint"));
        assert!(!valid_builtin_id("a b"));
        assert!(!valid_builtin_id("a\"b"));
        assert!(!valid_builtin_id(&"a".repeat(41)));
        // custom presets are addressed by uuid, so a uuid never names a built in one
        assert!(!valid_builtin_id("00000000-0000-0000-0000-000000000000"));
    }

    #[test]
    fn create_checks_name_theme_and_count() {
        let mut library = Library::default();
        let (id, name) = create(&mut library, " Ocean ").unwrap();
        assert_eq!(name, "Ocean");
        assert_eq!(library.custom[0].id.to_string(), id);
        assert!(!library.custom[0].users);

        assert!(matches!(create(&mut library, ""), Err(ChangeError::Bad(_))));
        let not_object = Change::Create {
            name: "x".into(),
            theme: json!([1]),
            users: false,
        };
        assert!(matches!(
            apply(&mut library, not_object),
            Err(ChangeError::Bad(_))
        ));
        let huge = Change::Create {
            name: "x".into(),
            theme: json!({ "homeBanner": "a".repeat(MAX_THEME_BYTES) }),
            users: false,
        };
        assert!(matches!(
            apply(&mut library, huge),
            Err(ChangeError::Bad(_))
        ));

        for i in 1..MAX_CUSTOM {
            create(&mut library, &format!("P{i}")).unwrap();
        }
        assert_eq!(library.custom.len(), MAX_CUSTOM);
        assert!(matches!(
            create(&mut library, "one more"),
            Err(ChangeError::Bad(_))
        ));
    }

    #[test]
    fn total_size_is_capped() {
        let mut library = Library::default();
        let big = || Change::Create {
            name: "big".into(),
            theme: json!({ "homeBanner": "a".repeat(MAX_THEME_BYTES - 20) }),
            users: false,
        };
        // three fit under four times the single theme cap, a fourth does not
        for _ in 0..3 {
            apply(&mut library, big()).unwrap();
        }
        assert!(matches!(
            apply(&mut library, big()),
            Err(ChangeError::Bad(_))
        ));
        assert_eq!(
            library.custom.len(),
            3,
            "a refused change leaves the library as it was"
        );
        // small ones still fit
        create(&mut library, "small").unwrap();
    }

    #[test]
    fn update_renames_and_toggles() {
        let mut library = Library::default();
        let (id, _) = create(&mut library, "Ocean").unwrap();

        let rename = Change::Update {
            id: id.clone(),
            name: Some(" Deep ".into()),
            theme: None,
            users: Some(true),
        };
        assert_eq!(apply(&mut library, rename).unwrap().1, "Deep");
        assert_eq!(library.custom[0].name, "Deep");
        assert!(library.custom[0].users);

        let empty = Change::Update {
            id: id.clone(),
            name: Some(" ".into()),
            theme: None,
            users: None,
        };
        assert!(matches!(
            apply(&mut library, empty),
            Err(ChangeError::Bad(_))
        ));
        assert_eq!(library.custom[0].name, "Deep");

        let missing = Change::Update {
            id: uuid::Uuid::nil().to_string(),
            name: None,
            theme: None,
            users: Some(true),
        };
        // a uuid is no valid built in id either
        assert_eq!(
            apply(&mut library, missing).unwrap_err(),
            ChangeError::NotFound
        );
    }

    #[test]
    fn update_replaces_a_custom_theme_and_keeps_the_id() {
        let mut library = Library::default();
        let (id, _) = create(&mut library, "Ocean").unwrap();
        let retheme = |theme| Change::Update {
            id: id.clone(),
            name: None,
            theme: Some(theme),
            users: None,
        };

        apply(&mut library, retheme(json!({ "accent": "#123456" }))).unwrap();
        assert_eq!(library.custom[0].id.to_string(), id);
        assert_eq!(library.custom[0].name, "Ocean");
        assert_eq!(library.custom[0].theme, json!({ "accent": "#123456" }));

        for bad in [
            json!([1]),
            json!({ "homeBanner": "a".repeat(MAX_THEME_BYTES) }),
        ] {
            assert!(matches!(
                apply(&mut library, retheme(bad)),
                Err(ChangeError::Bad(_))
            ));
        }
        assert_eq!(library.custom[0].theme, json!({ "accent": "#123456" }));
    }

    #[test]
    fn update_keeps_the_total_size_cap() {
        let mut library = Library::default();
        let big = json!({ "homeBanner": "a".repeat(MAX_THEME_BYTES - 20) });
        for _ in 0..3 {
            apply(
                &mut library,
                Change::Create {
                    name: "big".into(),
                    theme: big.clone(),
                    users: false,
                },
            )
            .unwrap();
        }
        let (id, _) = create(&mut library, "small").unwrap();
        let grow = Change::Update {
            id,
            name: None,
            theme: Some(big),
            users: None,
        };
        assert!(matches!(
            apply(&mut library, grow),
            Err(ChangeError::Bad(_))
        ));
        assert_eq!(library.custom[3].theme, json!({ "accent": "#2fbf8f" }));
    }

    #[test]
    fn builtin_presets_toggle_once() {
        let mut library = Library::default();
        let toggle = |users| Change::Update {
            id: "mint".into(),
            name: None,
            theme: None,
            users: Some(users),
        };
        apply(&mut library, toggle(true)).unwrap();
        apply(&mut library, toggle(true)).unwrap();
        assert_eq!(library.builtin, vec!["mint"]);
        apply(&mut library, toggle(false)).unwrap();
        assert!(library.builtin.is_empty());

        let rename = Change::Update {
            id: "mint".into(),
            name: Some("Mine".into()),
            theme: None,
            users: None,
        };
        assert!(matches!(
            apply(&mut library, rename),
            Err(ChangeError::Bad(_))
        ));
        let retheme = Change::Update {
            id: "mint".into(),
            name: None,
            theme: Some(json!({ "accent": "#123456" })),
            users: Some(true),
        };
        assert!(matches!(
            apply(&mut library, retheme),
            Err(ChangeError::Bad(_))
        ));
        assert!(library.builtin.is_empty(), "a refused change toggles nothing");

        let bad_id = Change::Update {
            id: "Not A Slug".into(),
            name: None,
            theme: None,
            users: Some(true),
        };
        assert_eq!(
            apply(&mut library, bad_id).unwrap_err(),
            ChangeError::NotFound
        );
    }

    #[test]
    fn delete_removes_custom_presets_only() {
        let mut library = Library::default();
        let (id, _) = create(&mut library, "Ocean").unwrap();
        let delete = |id: &str| Change::Delete { id: id.into() };
        assert_eq!(
            apply(&mut library, delete("mint")).unwrap_err(),
            ChangeError::NotFound
        );
        assert_eq!(apply(&mut library, delete(&id)).unwrap().1, "Ocean");
        assert!(library.custom.is_empty());
        assert_eq!(
            apply(&mut library, delete(&id)).unwrap_err(),
            ChangeError::NotFound
        );
    }

    #[test]
    fn parse_keeps_valid_entries_only() {
        assert_eq!(parse(""), Library::default());
        assert_eq!(parse("{broken"), Library::default());
        assert_eq!(parse("[1]"), Library::default());

        let library = parse(
            r##"{
                "custom": [
                    {"id":"00000000-0000-0000-0000-000000000001","name":" A ","theme":{"accent":"#123456"},"users":true},
                    {"id":"00000000-0000-0000-0000-000000000001","name":"Duplicate","theme":{}},
                    {"id":"00000000-0000-0000-0000-000000000002","name":"","theme":{}},
                    {"id":"00000000-0000-0000-0000-000000000003","name":"List","theme":[1]},
                    {"id":"nope","name":"Bad id","theme":{}},
                    {"id":"00000000-0000-0000-0000-000000000004","name":"No flag","theme":{}}
                ],
                "builtin": ["mint", "mint", "Bad Id", 3, "ember"]
            }"##,
        );
        let names: Vec<_> = library.custom.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["A", "No flag"]);
        assert!(library.custom[0].users);
        assert!(!library.custom[1].users);
        assert_eq!(library.builtin, vec!["mint", "ember"]);
    }

    #[test]
    fn parse_round_trips_what_is_stored() {
        let mut library = Library::default();
        create(&mut library, "Ocean").unwrap();
        apply(
            &mut library,
            Change::Update {
                id: "ember".into(),
                name: None,
                theme: None,
                users: Some(true),
            },
        )
        .unwrap();
        assert_eq!(parse(&serde_json::to_string(&library).unwrap()), library);
    }

    #[test]
    fn choices_list_user_selectable_presets_only() {
        let mut library = Library::default();
        let (id, _) = create(&mut library, "Ocean").unwrap();
        create(&mut library, "Hidden").unwrap();
        apply(
            &mut library,
            Change::Update {
                id,
                name: None,
                theme: None,
                users: Some(true),
            },
        )
        .unwrap();
        library.builtin.push("mint".into());

        let choices = choices(&serde_json::to_string(&library).unwrap());
        assert_eq!(choices.builtin, vec!["mint"]);
        assert_eq!(choices.custom.len(), 1);
        assert_eq!(choices.custom[0].name, "Ocean");
        assert_eq!(choices.custom[0].theme, json!({ "accent": "#2fbf8f" }));
        assert_eq!(super::choices(""), super::Choices::default());
    }
}
