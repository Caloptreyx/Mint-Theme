//! The last saved themes. Every theme save that changes something moves the theme it replaces into
//! the `theme_history` setting, with when and by whom that theme had been saved, so the editor can
//! load an older one back into its draft.

use serde::{Deserialize, Serialize};
use shared::State;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

const MAX_ENTRIES: usize = 10;
const MAX_USER_CHARS: usize = 255;
/// Every Mint setting is rewritten with any core settings save and reloaded by every process, so
/// the history as a whole gets the presets' cap: the oldest entries go until it fits.
const MAX_TOTAL_BYTES: usize = 4 * crate::routes::MAX_THEME_BYTES;

#[derive(ToSchema, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Entry {
    /// When this theme was saved, in unix milliseconds; null if that was before the history existed.
    at: Option<i64>,
    /// The username that saved it; null if that was before the history existed.
    user: Option<String>,
    /// The editor config; `{}` is the built-in look.
    #[schema(value_type = Object)]
    theme: serde_json::Value,
}

#[derive(ToSchema, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Saved {
    at: i64,
    user: String,
}

#[derive(ToSchema, Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct History {
    /// Who saved the theme in use and when; null until the first save that kept history.
    current: Option<Saved>,
    /// Newest first.
    entries: Vec<Entry>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct RawHistory {
    current: Option<serde_json::Value>,
    entries: Vec<serde_json::Value>,
}

/// Empty or unparsable settings mean no history; entries that do not parse are dropped.
fn parse(raw: &str) -> History {
    let raw = serde_json::from_str::<RawHistory>(raw).unwrap_or_default();
    History {
        current: raw
            .current
            .and_then(|value| serde_json::from_value(value).ok()),
        entries: raw
            .entries
            .into_iter()
            .filter_map(|value| serde_json::from_value::<Entry>(value).ok())
            .filter(|entry| entry.theme.is_object())
            .take(MAX_ENTRIES)
            .collect(),
    }
}

pub(crate) fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as i64)
}

/// Moves `previous` (the stored theme string, empty for the built-in look) to the top of the history
/// and records `user` as the author of the theme replacing it.
fn record(history: &mut History, previous: &str, at: i64, user: &str) {
    let saved = history.current.take();
    history.entries.insert(
        0,
        Entry {
            at: saved.as_ref().map(|s| s.at),
            user: saved.map(|s| s.user),
            theme: crate::routes::parse(previous).unwrap_or_else(|| serde_json::json!({})),
        },
    );
    history.entries.truncate(MAX_ENTRIES);
    history.current = Some(Saved {
        at,
        user: user.chars().take(MAX_USER_CHARS).collect(),
    });
    while !history.entries.is_empty() && crate::routes::json_len(&*history) > MAX_TOTAL_BYTES {
        history.entries.pop();
    }
}

/// Called by the theme PUT with the settings still locked: `previous` is what is stored now.
pub fn push(
    raw_history: &str,
    previous: &str,
    at: i64,
    user: &str,
) -> Result<String, serde_json::Error> {
    let mut history = parse(raw_history);
    record(&mut history, previous, at, user);
    serde_json::to_string(&history)
}

mod get {
    use shared::{
        GetState,
        models::user::GetPermissionManager,
        response::{ApiResponse, ApiResponseResult},
    };

    #[utoipa::path(get, path = "/", responses((status = OK, body = super::History)))]
    pub async fn route(state: GetState, permissions: GetPermissionManager) -> ApiResponseResult {
        permissions.has_admin_permission("settings.read")?;

        let settings = state.settings.get().await?;
        let history = settings
            .find_extension_settings::<crate::settings::ExtensionSettingsData>()
            .map(|s| super::parse(&s.theme_history))
            .unwrap_or_default();
        drop(settings);

        ApiResponse::new_serialized(history).ok()
    }
}

/// `GET`, gated by `settings.read` like the editor; entries are written by the theme PUT.
pub fn admin(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route))
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    use super::{MAX_ENTRIES, MAX_TOTAL_BYTES, parse, record};
    use crate::routes::MAX_THEME_BYTES;
    use serde_json::json;

    #[test]
    fn parse_is_lenient() {
        assert_eq!(parse(""), super::History::default());
        assert_eq!(parse("{broken"), super::History::default());
        assert_eq!(parse("[]"), super::History::default());

        let history = parse(
            r##"{
                "current": {"at": 5, "user": "admin"},
                "entries": [
                    {"at": 1, "user": "a", "theme": {"accent": "#123456"}},
                    {"at": null, "user": null, "theme": {}},
                    {"at": 2, "user": "b", "theme": [1]},
                    {"at": "x", "user": "c", "theme": {}}
                ]
            }"##,
        );
        assert_eq!(history.current.unwrap().user, "admin");
        assert_eq!(history.entries.len(), 2);
        assert_eq!(history.entries[1].at, None);
    }

    #[test]
    fn record_moves_the_previous_theme_with_its_author() {
        let mut history = super::History::default();

        // an install from before the history: the old theme has no known author
        record(&mut history, r##"{"accent":"#111111"}"##, 10, "alice");
        assert_eq!(history.entries.len(), 1);
        assert_eq!(history.entries[0].at, None);
        assert_eq!(history.entries[0].user, None);
        assert_eq!(history.entries[0].theme, json!({ "accent": "#111111" }));

        record(&mut history, r##"{"accent":"#222222"}"##, 20, "bob");
        assert_eq!(history.entries[0].at, Some(10));
        assert_eq!(history.entries[0].user.as_deref(), Some("alice"));
        assert_eq!(history.entries[0].theme, json!({ "accent": "#222222" }));
        let current = history.current.as_ref().unwrap();
        assert_eq!((current.at, current.user.as_str()), (20, "bob"));

        // the built-in look (nothing stored) comes back as an empty theme
        record(&mut history, "", 30, "carol");
        assert_eq!(history.entries[0].theme, json!({}));
    }

    #[test]
    fn record_keeps_the_newest_entries() {
        let mut history = super::History::default();
        for i in 0..(MAX_ENTRIES as i64 + 5) {
            record(&mut history, &format!(r#"{{"radius":{i}}}"#), i, "admin");
        }
        assert_eq!(history.entries.len(), MAX_ENTRIES);
        assert_eq!(
            history.entries[0].theme,
            json!({ "radius": MAX_ENTRIES as i64 + 4 })
        );
    }

    #[test]
    fn record_caps_the_total_size() {
        let mut history = super::History::default();
        // themes just under the theme PUT's cap: only a few fit together
        for i in 0..MAX_ENTRIES {
            let banner = format!("{i}{}", "a".repeat(MAX_THEME_BYTES - 40));
            let theme = serde_json::json!({ "homeBanner": banner });
            record(&mut history, &theme.to_string(), i as i64, "admin");
            assert!(crate::routes::json_len(&history) <= MAX_TOTAL_BYTES);
        }
        assert!(history.entries.len() < MAX_ENTRIES);
        assert!(history.entries.len() >= 3);
        // the newest stays, the oldest went
        let newest = history.entries[0].theme["homeBanner"].as_str().unwrap();
        assert!(newest.starts_with(&(MAX_ENTRIES - 1).to_string()));

        // small entries are not affected
        let mut small = super::History::default();
        for i in 0..MAX_ENTRIES {
            record(&mut small, &format!(r#"{{"radius":{i}}}"#), i as i64, "admin");
        }
        assert_eq!(small.entries.len(), MAX_ENTRIES);
    }

    #[test]
    fn push_round_trips() {
        let raw = super::push("", r##"{"accent":"#111111"}"##, 1, "alice").unwrap();
        let raw = super::push(&raw, r##"{"accent":"#222222"}"##, 2, "bob").unwrap();
        let history = parse(&raw);
        assert_eq!(history.entries.len(), 2);
        assert_eq!(history.entries[0].user.as_deref(), Some("alice"));
        assert_eq!(history.current.unwrap().user, "bob");
    }
}
