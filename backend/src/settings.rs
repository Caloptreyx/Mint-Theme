use serde::{Deserialize, Serialize};
use shared::extensions::settings::{
    ExtensionSettings, SettingsDeserializeExt, SettingsDeserializer, SettingsSerializeExt,
    SettingsSerializer,
};
use utoipa::ToSchema;

/// The theme editor's config as a JSON string. The frontend owns the shape and
/// validates it before use, so new editor options never need a backend change.
/// `announcement_ctas` is the JSON map of announcement buttons, see `cta.rs`;
/// `presets` the custom presets and user choices, see `presets.rs`; `theme_history`
/// the previously saved themes, see `history.rs`. All are empty on older installs.
/// `email_templates` turns Mint's email templates on, see `mail.rs`; off unless saved as "true".
#[derive(ToSchema, Serialize, Deserialize, Clone, Default)]
pub struct ExtensionSettingsData {
    pub theme: compact_str::CompactString,
    pub announcement_ctas: compact_str::CompactString,
    pub presets: compact_str::CompactString,
    pub theme_history: compact_str::CompactString,
    pub email_templates: bool,
}

/// Reads a stored flag: only "true" is on, so a missing or unknown value is off.
fn flag(raw: Option<compact_str::CompactString>) -> bool {
    raw.is_some_and(|value| value == "true")
}

#[async_trait::async_trait]
impl SettingsSerializeExt for ExtensionSettingsData {
    async fn serialize(
        &self,
        serializer: SettingsSerializer,
    ) -> Result<SettingsSerializer, anyhow::Error> {
        Ok(serializer
            .write_raw_setting("theme", self.theme.clone())
            .write_raw_setting("announcement_ctas", self.announcement_ctas.clone())
            .write_raw_setting("presets", self.presets.clone())
            .write_raw_setting("theme_history", self.theme_history.clone())
            .write_raw_setting(
                "email_templates",
                if self.email_templates { "true" } else { "false" },
            ))
    }
}

pub struct ExtensionSettingsDataDeserializer;

#[async_trait::async_trait]
impl SettingsDeserializeExt for ExtensionSettingsDataDeserializer {
    async fn deserialize_boxed(
        &self,
        mut deserializer: SettingsDeserializer<'_>,
    ) -> Result<ExtensionSettings, anyhow::Error> {
        Ok(Box::new(ExtensionSettingsData {
            theme: deserializer.take_raw_setting("theme").unwrap_or_default(),
            announcement_ctas: deserializer
                .take_raw_setting("announcement_ctas")
                .unwrap_or_default(),
            presets: deserializer.take_raw_setting("presets").unwrap_or_default(),
            theme_history: deserializer
                .take_raw_setting("theme_history")
                .unwrap_or_default(),
            email_templates: flag(deserializer.take_raw_setting("email_templates")),
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_templates_are_off_unless_stored_on() {
        assert!(!ExtensionSettingsData::default().email_templates);
        assert!(!flag(None));
        assert!(!flag(Some("false".into())));
        assert!(!flag(Some("".into())));
        assert!(flag(Some("true".into())));
    }
}
