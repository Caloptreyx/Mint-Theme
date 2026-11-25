//! Mint's email templates (opt-in) and live theme-to-email syncing.
//!
//! Off by default (`email_templates` setting). While it is on, Mint saves its table-based HTML layout as
//! the content of the 10 core Calagopus email templates (the same rows core's Mail Templates editor
//! writes), keeping every core `{{ vars.* }}` text fragment so panel translations and wording edits keep
//! working, and syncs colours, radii, logo and footer into global `mint_email_*` variables on each theme
//! save. Turning it off clears every template whose content is exactly a layout Mint shipped, which
//! restores core's stock template; HTML an operator saved by hand is never touched either way.

use shared::{
    State,
    extensions::email_templates::{
        ExtensionEmailTemplateBuilder, UpdateEmailTemplate, UpdateEmailVariable,
    },
};
use utoipa_axum::{router::OpenApiRouter, routes};

const DEFAULT_ACCENT: &str = "#1e88c7";
const DEFAULT_HIGHLIGHT: &str = "#8fe3c8";
const DEFAULT_BACKGROUND: &str = "#16122a";
const DEFAULT_SURFACE: &str = "#110b21";
const DEFAULT_TEXT: &str = "#e6e4f0";
const DEFAULT_SUCCESS: &str = "#2fbf8f";
const DEFAULT_RADIUS: i64 = 10;
const DEFAULT_ELEMENT_RADIUS: i64 = 6;
const DARK_SHADOW: &str = "0 12px 32px rgba(0, 0, 0, 0.35)";
const LIGHT_SHADOW: &str = "0 8px 30px rgba(15, 23, 42, 0.08)";
const MAX_FOOTER_CHARS: usize = 200;

/// Core template identifiers Mint writes while its templates are on, paired with Mint's HTML.
const TEMPLATES: &[(&str, &str)] = &[
    ("account_created", include_str!("../mails/account_created.html")),
    ("password_reset", include_str!("../mails/password_reset.html")),
    (
        "email_verification",
        include_str!("../mails/email_verification.html"),
    ),
    ("two_factor_code", include_str!("../mails/two_factor_code.html")),
    ("session_created", include_str!("../mails/session_created.html")),
    ("connection_test", include_str!("../mails/connection_test.html")),
    ("added_to_server", include_str!("../mails/added_to_server.html")),
    (
        "removed_from_server",
        include_str!("../mails/removed_from_server.html"),
    ),
    (
        "server_installed",
        include_str!("../mails/server_installed.html"),
    ),
    ("server_restored", include_str!("../mails/server_restored.html")),
];

/// SHA-256 of every template HTML a Mint release has shipped, per template. Saved content hashing to one
/// of these is Mint's own; anything else is the operator's. When a file in `mails/` changes, add its new
/// hash and keep the old ones, so an upgrade still recognises (and replaces or restores) older layouts.
const RELEASED_TEMPLATE_SHA256: &[(&str, &str)] = &[
    // 2.4.9 (installed as the panel's defaults) and 2.4.10
    (
        "account_created",
        "8f76948911dc918bb3b9357e50ecd10bbe90b448dd70c76c089d0459cabef6fb",
    ),
    (
        "added_to_server",
        "73494d65f6baa6494eccf0ef9ae58a7368f032ccd716f98e5f384edccc4b9562",
    ),
    (
        "connection_test",
        "f426b8357e24c260d7c303e86bfe9887df2c8b5f55f226713f3299b6184222ed",
    ),
    (
        "email_verification",
        "c8db1086603c609e27d886bfb222014305067f2d12747b0c836ab7197e5702f3",
    ),
    (
        "password_reset",
        "a05d8db01be14cdfef9543aec291df3e348b6e107a57939a3c76ed0c1dacda38",
    ),
    (
        "removed_from_server",
        "4beb58252447efe3594f7d147419d8657ee983df35142f01c7d32f5bb9fc1e5b",
    ),
    (
        "server_installed",
        "73494d65f6baa6494eccf0ef9ae58a7368f032ccd716f98e5f384edccc4b9562",
    ),
    (
        "server_restored",
        "73494d65f6baa6494eccf0ef9ae58a7368f032ccd716f98e5f384edccc4b9562",
    ),
    (
        "session_created",
        "67512338a28503d235e8073f804d761b474a5a2553ae9d38e0aa4bf292303daa",
    ),
    (
        "two_factor_code",
        "d37a71b99e0640263b8955d46f7d7deebe3e0cf089b3facec03c5a5e7badd60d",
    ),
];

/// Default global variables registered on boot (the resolved dark palette of `DEFAULT_THEME`).
const GLOBAL_DEFAULTS: &[(&str, &str)] = &[
    ("mint_email_color_scheme", "dark"),
    ("mint_email_bg", "#16122a"),
    ("mint_email_surface", "#110b21"),
    ("mint_email_surface_raised", "#1c162b"),
    ("mint_email_border", "#332f46"),
    ("mint_email_shadow", DARK_SHADOW),
    ("mint_email_text", "#e6e4f0"),
    ("mint_email_body", "#c4c1cf"),
    ("mint_email_muted", "#8f8c9d"),
    ("mint_email_accent", "#1e88c7"),
    ("mint_email_highlight", "#8fe3c8"),
    ("mint_email_accent_text", "#ffffff"),
    ("mint_email_success", "#2fbf8f"),
    ("mint_email_success_bg", "#152430"),
    ("mint_email_success_text", "#2fbf8f"),
    ("mint_email_radius", "10px"),
    ("mint_email_button_radius", "6px"),
    ("mint_email_logo", ""),
    ("mint_email_footer", ""),
];

/// Declares Mint's global style variables on the panel's builder. Core's stock templates never read
/// them; they are declared on every boot so turning the templates on needs no restart.
pub(crate) fn register(mut builder: ExtensionEmailTemplateBuilder) -> ExtensionEmailTemplateBuilder {
    for &(name, default_value) in GLOBAL_DEFAULTS {
        builder = builder.add_template_variable(None, name, default_value);
    }
    builder
}

/// Where a core template's saved content comes from.
#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub(crate) enum TemplateState {
    /// Nothing saved: core's stock template.
    Stock,
    /// Mint's current layout.
    Mint,
    /// A layout an older Mint release wrote.
    Outdated,
    /// HTML the operator saved by hand.
    Custom,
}

pub(crate) fn classify(identifier: &str, content: Option<&str>) -> TemplateState {
    use sha2::Digest;

    let Some(content) = content else {
        return TemplateState::Stock;
    };
    if TEMPLATES
        .iter()
        .any(|&(id, html)| id == identifier && html == content)
    {
        return TemplateState::Mint;
    }
    let hash = hex::encode(sha2::Sha256::digest(content.as_bytes()));
    if RELEASED_TEMPLATE_SHA256
        .iter()
        .any(|&(id, known)| id == identifier && known == hash)
    {
        TemplateState::Outdated
    } else {
        TemplateState::Custom
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Mode {
    /// The setting is off: Mint's layouts (any release) go back to core's stock.
    Off,
    /// The setting is on, at boot: older Mint layouts are brought up to date. Templates the operator
    /// reset to stock or edited stay as they are.
    Refresh,
    /// The setting was just turned on: stock templates and older Mint layouts get Mint's.
    Enable,
    /// "Use Mint layout": every template gets Mint's, hand-saved HTML included.
    Overwrite,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Change {
    /// Save Mint's current layout as the template's content.
    Write,
    /// Clear the saved content, which restores core's stock template.
    Clear,
}

pub(crate) fn plan(mode: Mode, state: TemplateState) -> Option<Change> {
    use TemplateState::*;

    match mode {
        Mode::Off => matches!(state, Mint | Outdated).then_some(Change::Clear),
        Mode::Refresh => (state == Outdated).then_some(Change::Write),
        Mode::Enable => matches!(state, Stock | Outdated).then_some(Change::Write),
        Mode::Overwrite => (state != Mint).then_some(Change::Write),
    }
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct ResolvedEmailVars {
    pub color_scheme: &'static str,
    pub bg: String,
    pub surface: String,
    pub surface_raised: String,
    pub border: String,
    pub shadow: &'static str,
    pub text: String,
    pub body: String,
    pub muted: String,
    pub accent: String,
    pub highlight: String,
    pub accent_text: String,
    pub success: String,
    pub success_bg: String,
    pub success_text: String,
    pub radius: String,
    pub button_radius: String,
    pub logo: String,
    pub footer: String,
}

impl ResolvedEmailVars {
    pub(crate) fn pairs(&self) -> [(&'static str, &str); 19] {
        [
            ("mint_email_color_scheme", self.color_scheme),
            ("mint_email_bg", &self.bg),
            ("mint_email_surface", &self.surface),
            ("mint_email_surface_raised", &self.surface_raised),
            ("mint_email_border", &self.border),
            ("mint_email_shadow", self.shadow),
            ("mint_email_text", &self.text),
            ("mint_email_body", &self.body),
            ("mint_email_muted", &self.muted),
            ("mint_email_accent", &self.accent),
            ("mint_email_highlight", &self.highlight),
            ("mint_email_accent_text", &self.accent_text),
            ("mint_email_success", &self.success),
            ("mint_email_success_bg", &self.success_bg),
            ("mint_email_success_text", &self.success_text),
            ("mint_email_radius", &self.radius),
            ("mint_email_button_radius", &self.button_radius),
            ("mint_email_logo", &self.logo),
            ("mint_email_footer", &self.footer),
        ]
    }
}

fn is_hex_color(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 7 && bytes[0] == b'#' && bytes[1..].iter().all(|b| b.is_ascii_hexdigit())
}

fn to_rgb(hex: &str) -> [f64; 3] {
    let r = u8::from_str_radix(&hex[1..3], 16).unwrap_or(0) as f64;
    let g = u8::from_str_radix(&hex[3..5], 16).unwrap_or(0) as f64;
    let b = u8::from_str_radix(&hex[5..7], 16).unwrap_or(0) as f64;
    [r, g, b]
}

fn to_hex(rgb: [f64; 3]) -> String {
    let c = |v: f64| v.round().clamp(0.0, 255.0) as u8;
    format!("#{:02x}{:02x}{:02x}", c(rgb[0]), c(rgb[1]), c(rgb[2]))
}

/// Matches `frontend/src/lib/color.ts` `mix(a, b, weight)`.
fn mix(a: &str, b: &str, weight: f64) -> String {
    let x = to_rgb(a);
    let y = to_rgb(b);
    to_hex([
        x[0] * weight + y[0] * (1.0 - weight),
        x[1] * weight + y[1] * (1.0 - weight),
        x[2] * weight + y[2] * (1.0 - weight),
    ])
}

/// Matches `frontend/src/lib/color.ts` `luminance(hex)`.
fn luminance(hex: &str) -> f64 {
    let [r, g, b] = to_rgb(hex).map(|v| {
        let c = v / 255.0;
        if c <= 0.03928 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    });
    0.2126 * r + 0.7152 * g + 0.0722 * b
}

/// Matches `frontend/src/lib/color.ts` `contrastRatio(a, b)`.
fn contrast_ratio(a: &str, b: &str) -> f64 {
    let la = luminance(a);
    let lb = luminance(b);
    let (hi, lo) = if la >= lb { (la, lb) } else { (lb, la) };
    (hi + 0.05) / (lo + 0.05)
}

/// Matches `frontend/src/lib/color.ts` `readable(c, ink, paper, ratio)`.
fn readable(c: &str, ink: &str, paper: &str, ratio: f64) -> String {
    for w in [1.0, 0.84, 0.7, 0.56, 0.42, 0.28] {
        let candidate = mix(c, ink, w);
        if contrast_ratio(&candidate, paper) >= ratio {
            return candidate;
        }
    }
    ink.to_string()
}

/// Picks readable button label ink when neither `buttonText` nor `textOnAccent` is explicitly set.
fn auto_accent_text(accent: &str) -> &'static str {
    let white = contrast_ratio(accent, "#ffffff");
    if white >= 3.5 {
        return "#ffffff";
    }
    let dark = contrast_ratio(accent, "#0b1314");
    if dark >= white { "#0b1314" } else { "#ffffff" }
}

/// Safe URL check matching `SAFE_URL` in `normalize.ts` (plus rejecting `{` / `}` so MiniJinja
/// delimiters can never appear in an email variable).
fn is_safe_url(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    let has_scheme = lower.starts_with("https://")
        || lower.starts_with("http://")
        || (value.starts_with('/') && !value.starts_with("//"));
    if !has_scheme {
        return false;
    }
    let min_len = if lower.starts_with("https://") {
        9
    } else if lower.starts_with("http://") {
        8
    } else {
        2
    };
    if value.len() < min_len {
        return false;
    }
    !value.chars().any(|ch| {
        ch.is_whitespace()
            || matches!(
                ch,
                '"' | '\'' | '(' | ')' | '\\' | '<' | '>' | ';' | '{' | '}'
            )
    })
}

/// Resolves an email logo URL to an absolute http(s) URL safe for email clients and MiniJinja.
fn resolve_logo_url(raw: &str, app_url: &str) -> String {
    if raw.is_empty() || !is_safe_url(raw) {
        return String::new();
    }
    if raw.starts_with('/') {
        let base = app_url.trim().trim_end_matches('/');
        if base.is_empty() || !is_safe_url(base) || base.starts_with('/') {
            return String::new();
        }
        format!("{base}{raw}")
    } else {
        raw.to_string()
    }
}

/// Sanitizes the optional plain-text footer note so it can never inject HTML or MiniJinja tags
/// (email variables are parsed as MiniJinja and inserted as safe HTML by core).
fn sanitize_footer(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|ch| !ch.is_control() && *ch != '{' && *ch != '}')
        .collect();
    let trimmed = cleaned.trim();
    let mut out = String::new();
    for ch in trimmed.chars().take(MAX_FOOTER_CHARS) {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#x27;"),
            other => out.push(other),
        }
    }
    out
}

fn color_field(
    obj: Option<&serde_json::Map<String, serde_json::Value>>,
    key: &str,
    fallback: &str,
) -> String {
    obj.and_then(|m| m.get(key))
        .and_then(|v| v.as_str())
        .filter(|s| is_hex_color(s))
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_else(|| fallback.to_string())
}

fn optional_color(
    obj: Option<&serde_json::Map<String, serde_json::Value>>,
    key: &str,
) -> Option<String> {
    obj.and_then(|m| m.get(key))
        .and_then(|v| v.as_str())
        .filter(|s| is_hex_color(s))
        .map(|s| s.to_ascii_lowercase())
}

fn clamp_i64(
    obj: Option<&serde_json::Map<String, serde_json::Value>>,
    key: &str,
    min: i64,
    max: i64,
    fallback: i64,
) -> i64 {
    obj.and_then(|m| m.get(key))
        .and_then(|v| v.as_f64())
        .filter(|n| n.is_finite())
        .map(|n| (n.round() as i64).clamp(min, max))
        .unwrap_or(fallback)
}

/// Whether the stored theme JSON enables syncing Mint's palette to global email variables.
/// Defaults to `true` for older themes and the built-in default look.
pub(crate) fn sync_enabled(raw_theme: &str) -> bool {
    let parsed = crate::routes::parse(raw_theme);
    parsed
        .as_ref()
        .and_then(|v| v.as_object())
        .and_then(|m| m.get("emailSync"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true)
}

/// Resolves all `mint_email_*` global variables from the stored theme JSON and panel URL.
/// Matches `resolveEmailPalette()` in `frontend/src/lib/email.ts`.
pub(crate) fn resolve_vars(raw_theme: &str, app_url: &str) -> ResolvedEmailVars {
    let parsed = crate::routes::parse(raw_theme);
    let obj = parsed.as_ref().and_then(|v| v.as_object());

    let accent_base = color_field(obj, "accent", DEFAULT_ACCENT);
    let highlight_base = color_field(obj, "highlight", DEFAULT_HIGHLIGHT);
    let background = color_field(obj, "background", DEFAULT_BACKGROUND);
    let surface = color_field(obj, "surface", DEFAULT_SURFACE);
    let text = color_field(obj, "text", DEFAULT_TEXT);

    let button_color = optional_color(obj, "buttonColor");
    let button_text = optional_color(obj, "buttonText");
    let text_on_accent = optional_color(obj, "textOnAccent");
    let text_muted = optional_color(obj, "textMuted");
    let line = optional_color(obj, "line");
    let success = optional_color(obj, "success").unwrap_or_else(|| DEFAULT_SUCCESS.to_string());
    let light_bg_override = optional_color(obj, "lightBackground");
    let light_surface_override = optional_color(obj, "lightSurface");
    let light_text_override = optional_color(obj, "lightText");

    let radius = clamp_i64(obj, "radius", 0, 24, DEFAULT_RADIUS);
    let element_radius = clamp_i64(obj, "elementRadius", 0, 20, DEFAULT_ELEMENT_RADIUS);

    let mode = obj
        .and_then(|m| m.get("emailTheme"))
        .and_then(|v| v.as_str())
        .filter(|m| matches!(*m, "dark" | "light" | "custom"))
        .unwrap_or("dark");

    let base_accent = button_color.unwrap_or_else(|| accent_base.clone());
    let base_accent_text = button_text
        .or(text_on_accent)
        .unwrap_or_else(|| auto_accent_text(&base_accent).to_string());

    let (
        color_scheme,
        bg,
        card_surface,
        surface_raised,
        border,
        shadow,
        heading,
        body,
        muted,
        accent,
        highlight,
        accent_text,
    ) = match mode {
        "light" => {
            let lt = light_text_override.unwrap_or_else(|| {
                if luminance(&background) < 0.05 {
                    background.clone()
                } else {
                    mix(&accent_base, "#000000", 0.15)
                }
            });
            let lb = light_bg_override
                .unwrap_or_else(|| mix(&accent_base, &mix(&lt, "#ffffff", 0.05), 0.06));
            let ls = light_surface_override
                .unwrap_or_else(|| mix(&accent_base, "#ffffff", 0.025));
            let raised = mix(&lt, &ls, 0.025);
            let bdr = mix(&lt, &ls, 0.12);
            let bdy = mix(&lt, &ls, 0.78);
            let mtd = mix(&lt, &ls, 0.55);
            (
                "light",
                lb,
                ls,
                raised,
                bdr,
                LIGHT_SHADOW,
                lt,
                bdy,
                mtd,
                base_accent,
                highlight_base,
                base_accent_text,
            )
        }
        "custom" => {
            let custom_bg =
                optional_color(obj, "emailBackground").unwrap_or_else(|| background.clone());
            let custom_surface =
                optional_color(obj, "emailSurface").unwrap_or_else(|| surface.clone());
            let custom_text =
                optional_color(obj, "emailText").unwrap_or_else(|| text.clone());
            let custom_accent = optional_color(obj, "emailAccent");
            let accent = custom_accent.clone().unwrap_or_else(|| base_accent.clone());
            let highlight = match custom_accent {
                Some(ref acc) => mix(acc, "#ffffff", 0.68),
                None => highlight_base,
            };
            let accent_text = optional_color(obj, "emailAccentText")
                .unwrap_or_else(|| auto_accent_text(&accent).to_string());
            let is_light = luminance(&custom_bg) >= 0.35;
            let raised = mix(
                &custom_text,
                &custom_surface,
                if is_light { 0.025 } else { 0.05 },
            );
            let bdr = mix(
                &custom_text,
                if is_light {
                    &custom_surface
                } else {
                    &custom_bg
                },
                if is_light { 0.12 } else { 0.14 },
            );
            let bdy = mix(
                &custom_text,
                &custom_surface,
                if is_light { 0.78 } else { 0.84 },
            );
            let mtd = mix(
                &custom_text,
                if is_light {
                    &custom_surface
                } else {
                    &custom_bg
                },
                if is_light { 0.55 } else { 0.58 },
            );
            (
                if is_light { "light" } else { "dark" },
                custom_bg,
                custom_surface,
                raised,
                bdr,
                if is_light { LIGHT_SHADOW } else { DARK_SHADOW },
                custom_text,
                bdy,
                mtd,
                accent,
                highlight,
                accent_text,
            )
        }
        _ => {
            let raised = mix(&text, &surface, 0.05);
            let bdr = line.unwrap_or_else(|| mix(&text, &background, 0.14));
            let bdy = mix(&text, &surface, 0.84);
            let mtd = text_muted.unwrap_or_else(|| mix(&text, &background, 0.58));
            (
                "dark",
                background,
                surface,
                raised,
                bdr,
                DARK_SHADOW,
                text,
                bdy,
                mtd,
                base_accent,
                highlight_base,
                base_accent_text,
            )
        }
    };

    let success_bg = mix(&success, &card_surface, 0.14);
    let success_text = readable(&success, &heading, &success_bg, 4.5);

    let logo_raw = obj
        .and_then(|m| m.get("emailLogo"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let footer_raw = obj
        .and_then(|m| m.get("emailFooter"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    ResolvedEmailVars {
        color_scheme,
        bg,
        surface: card_surface,
        surface_raised,
        border,
        shadow,
        text: heading,
        body,
        muted,
        accent,
        highlight,
        accent_text,
        success,
        success_bg,
        success_text,
        radius: format!("{radius}px"),
        button_radius: format!("{element_radius}px"),
        logo: resolve_logo_url(logo_raw, app_url),
        footer: sanitize_footer(footer_raw),
    }
}

/// Serializes every write Mint makes to email templates and `mint_email_*` variables (boot, the
/// templates toggle, theme saves), so none of them interleave stale values after newer ones.
static LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// Syncs Mint's resolved email palette to Calagopus's global `email_variables` table when
/// `emailSync` is enabled. Variables already matching their desired value are skipped, and ones
/// returning to their built-in default clear their DB override row cleanly.
async fn sync(state: &State, raw_theme: &str, app_url: &str) -> Result<(), anyhow::Error> {
    if !sync_enabled(raw_theme) {
        return Ok(());
    }

    let resolved = resolve_vars(raw_theme, app_url);
    let existing = state.mail.templates.get_variables(state, None).await?;

    for (name, desired) in resolved.pairs() {
        let Some(variable) = existing.iter().find(|v| v.name == name) else {
            continue;
        };

        let is_default = variable.default_value.as_deref() == Some(desired);
        if is_default {
            if variable.value.is_some() {
                state
                    .mail
                    .templates
                    .update_variable(
                        state,
                        variable,
                        UpdateEmailVariable {
                            value: Some(None),
                            value_translations: None,
                        },
                    )
                    .await?;
            }
        } else if variable.value.as_deref() != Some(desired) {
            state
                .mail
                .templates
                .update_variable(
                    state,
                    variable,
                    UpdateEmailVariable {
                        value: Some(Some(desired.to_string())),
                        value_translations: None,
                    },
                )
                .await?;
        }
    }

    Ok(())
}

/// The stored theme, whether Mint's templates are on, and the panel URL.
async fn stored(state: &State) -> Result<(String, bool, String), anyhow::Error> {
    let settings = state.settings.get().await?;
    let (theme, enabled) = settings
        .find_extension_settings::<crate::settings::ExtensionSettingsData>()
        .map(|s| (s.theme.to_string(), s.email_templates))
        .unwrap_or_default();
    Ok((theme, enabled, settings.app.url.to_string()))
}

/// Syncs the stored theme's palette to the global email variables while Mint's templates are on.
/// Call with `LOCK` held.
async fn sync_stored(state: &State) -> Result<(), anyhow::Error> {
    let (theme, enabled, app_url) = stored(state).await?;
    if !enabled {
        return Ok(());
    }
    sync(state, &theme, &app_url).await
}

/// Reads the currently stored theme under `LOCK` and syncs its resolved palette to global email
/// variables (only while Mint's templates are on), ensuring the latest persisted theme always wins.
pub(crate) async fn sync_current(state: &State) -> Result<(), anyhow::Error> {
    let _guard = LOCK.lock().await;
    sync_stored(state).await
}

/// Every core template Mint manages with where its saved content comes from, in `TEMPLATES` order.
async fn template_states(
    state: &State,
) -> Result<Vec<(&'static str, TemplateState)>, anyhow::Error> {
    use sqlx::Row;

    let rows = sqlx::query(
        "SELECT identifier, content FROM email_templates WHERE content IS NOT NULL",
    )
    .fetch_all(state.database.read())
    .await?;

    let mut saved = std::collections::HashMap::with_capacity(rows.len());
    for row in rows {
        saved.insert(
            row.try_get::<String, _>("identifier")?,
            row.try_get::<String, _>("content")?,
        );
    }

    Ok(TEMPLATES
        .iter()
        .map(|&(id, _)| (id, classify(id, saved.get(id).map(String::as_str))))
        .collect())
}

/// Applies `plan(mode, …)` to every template Mint manages and returns the ones changed. Call with
/// `LOCK` held.
async fn reconcile(state: &State, mode: Mode) -> Result<Vec<&'static str>, anyhow::Error> {
    let mut changed = Vec::new();
    for (identifier, current) in template_states(state).await? {
        let Some(change) = plan(mode, current) else {
            continue;
        };
        let Ok(template) = state.mail.templates.get_template(identifier) else {
            continue;
        };
        let content = match change {
            Change::Write => TEMPLATES
                .iter()
                .find(|&&(id, _)| id == identifier)
                .map(|&(_, html)| html.to_string()),
            Change::Clear => None,
        };
        template
            .update(
                state,
                UpdateEmailTemplate {
                    content: Some(content),
                    subject: None,
                    enabled: None,
                },
            )
            .await?;
        changed.push(identifier);
    }
    Ok(changed)
}

/// Runs once after panel startup finishes populating `state.mail.templates`. With the templates off
/// (the default, and the state after upgrading from 2.4.9, which used them unasked), every template
/// still holding a layout Mint shipped goes back to core's stock; with them on, older Mint layouts are
/// replaced by the current one and the palette is synced.
pub(crate) fn spawn_boot_sync(state: State) {
    tokio::spawn(async move {
        let mut ready = false;
        for _ in 0..50 {
            match state.mail.templates.get_variables(&state, None).await {
                Ok(vars) if vars.iter().any(|v| v.name == "mint_email_bg") => {
                    ready = true;
                    break;
                }
                _ => tokio::time::sleep(std::time::Duration::from_millis(100)).await,
            }
        }

        if !ready {
            tracing::warn!(
                "mint mail boot sync timed out waiting for email template registration"
            );
            return;
        }

        let _guard = LOCK.lock().await;
        let result = async {
            let (_, enabled, _) = stored(&state).await?;
            let changed =
                reconcile(&state, if enabled { Mode::Refresh } else { Mode::Off }).await?;
            if !changed.is_empty() {
                tracing::info!(
                    "mint {} email templates: {}",
                    if enabled { "updated" } else { "restored core's stock" },
                    changed.join(", ")
                );
            }
            sync_stored(&state).await
        }
        .await;
        if let Err(err) = result {
            tracing::warn!("mint mail boot sync failed: {err:#}");
        }
    });
}

mod status {
    use serde::Serialize;
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    pub struct Template {
        identifier: &'static str,
        state: super::TemplateState,
    }

    #[derive(ToSchema, Serialize)]
    pub struct Status {
        /// Whether Mint's email templates are on (off by default).
        enabled: bool,
        /// Each core template Mint manages and where its saved content comes from.
        templates: Vec<Template>,
    }

    pub async fn read(state: &shared::State) -> Result<Status, anyhow::Error> {
        let (_, enabled, _) = super::stored(state).await?;
        let templates = super::template_states(state)
            .await?
            .into_iter()
            .map(|(identifier, state)| Template { identifier, state })
            .collect();
        Ok(Status { enabled, templates })
    }
}

mod get {
    use shared::{
        GetState,
        models::user::GetPermissionManager,
        response::{ApiResponse, ApiResponseResult},
    };

    #[utoipa::path(get, path = "/", responses(
        (status = OK, body = super::status::Status),
    ))]
    pub async fn route(state: GetState, permissions: GetPermissionManager) -> ApiResponseResult {
        crate::permissions::can_read(&permissions)?;

        ApiResponse::new_serialized(super::status::read(&state).await?).ok()
    }
}

mod put {
    use serde::Deserialize;
    use shared::{
        GetState,
        models::{admin_activity::GetAdminActivityLogger, user::GetPermissionManager},
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Deserialize)]
    pub struct Payload {
        /// Turns Mint's email templates on or off. Off restores core's stock template wherever the
        /// saved content is a layout Mint shipped; hand-saved HTML is kept.
        enabled: bool,
        /// With `enabled`, also replace hand-saved HTML with Mint's layout ("Use Mint layout").
        #[serde(default)]
        overwrite: bool,
    }

    #[utoipa::path(put, path = "/", responses(
        (status = OK, body = super::status::Status),
    ), request_body = inline(Payload))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        activity_logger: GetAdminActivityLogger,
        shared::Payload(data): shared::Payload<Payload>,
    ) -> ApiResponseResult {
        permissions.has_admin_permission("email-templates.update")?;

        let _guard = super::LOCK.lock().await;

        let mut settings = state.settings.get_mut().await?;
        settings
            .find_mut_extension_settings::<crate::settings::ExtensionSettingsData>()?
            .email_templates = data.enabled;
        settings.save().await?;

        let mode = match (data.enabled, data.overwrite) {
            (false, _) => super::Mode::Off,
            (true, false) => super::Mode::Enable,
            (true, true) => super::Mode::Overwrite,
        };
        let changed = super::reconcile(&state, mode).await?;
        if let Err(err) = super::sync_stored(&state).await {
            tracing::warn!("failed to sync mint email theme variables: {err:#}");
        }

        activity_logger
            .log(
                if data.enabled {
                    "mint:email_templates.enable"
                } else {
                    "mint:email_templates.disable"
                },
                serde_json::json!({ "templates": changed, "overwrite": data.overwrite }),
            )
            .await;

        ApiResponse::new_serialized(super::status::read(&state).await?).ok()
    }
}

pub fn admin(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route, put::route))
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn defaults_match_resolved_default_theme() {
        let resolved = resolve_vars("", "https://panel.example.com");
        for (name, expected) in GLOBAL_DEFAULTS {
            let actual = resolved
                .pairs()
                .into_iter()
                .find(|(k, _)| k == name)
                .map(|(_, v)| v)
                .unwrap_or_else(|| panic!("missing resolved var {name}"));
            assert_eq!(actual, *expected, "default mismatch for {name}");
        }
    }

    #[test]
    fn mint_preset_dark_and_light_resolve_readably() {
        let mint_dark = r##"{
            "accent": "#2fbf8f",
            "highlight": "#b4f2dc",
            "background": "#101a1b",
            "surface": "#0b1314",
            "text": "#e5f3ee",
            "textOnAccent": "#0b1314",
            "radius": 12,
            "elementRadius": 8
        }"##;
        let dark = resolve_vars(mint_dark, "https://panel.example.com");
        assert_eq!(dark.color_scheme, "dark");
        assert_eq!(dark.shadow, DARK_SHADOW);
        assert_eq!(dark.bg, "#101a1b");
        assert_eq!(dark.surface, "#0b1314");
        assert_eq!(dark.accent, "#2fbf8f");
        assert_eq!(dark.highlight, "#b4f2dc");
        assert_eq!(dark.accent_text, "#0b1314");
        assert_eq!(dark.radius, "12px");
        assert_eq!(dark.button_radius, "8px");

        let mint_light = r##"{
            "accent": "#2fbf8f",
            "highlight": "#b4f2dc",
            "background": "#101a1b",
            "surface": "#0b1314",
            "text": "#e5f3ee",
            "textOnAccent": "#0b1314",
            "emailTheme": "light"
        }"##;
        let light = resolve_vars(mint_light, "https://panel.example.com");
        assert_eq!(light.color_scheme, "light");
        assert_eq!(light.shadow, LIGHT_SHADOW);
        assert!(luminance(&light.bg) > 0.8);
        assert!(luminance(&light.surface) > 0.9);
        assert!(contrast_ratio(&light.text, &light.surface) >= 7.0);
        assert!(contrast_ratio(&light.success_text, &light.success_bg) >= 4.5);
    }

    #[test]
    fn custom_mode_uses_overrides_and_infers_scheme() {
        let raw = r##"{
            "emailTheme": "custom",
            "emailBackground": "#f4f5f7",
            "emailSurface": "#ffffff",
            "emailText": "#111827",
            "emailAccent": "#2fbf8f",
            "emailAccentText": "#0b1314"
        }"##;
        let custom = resolve_vars(raw, "https://panel.example.com");
        assert_eq!(custom.color_scheme, "light");
        assert_eq!(custom.shadow, LIGHT_SHADOW);
        assert_eq!(custom.bg, "#f4f5f7");
        assert_eq!(custom.surface, "#ffffff");
        assert_eq!(custom.text, "#111827");
        assert_eq!(custom.accent, "#2fbf8f");
        assert_eq!(custom.accent_text, "#0b1314");
    }

    #[test]
    fn logo_and_footer_are_strictly_sanitized() {
        assert_eq!(
            resolve_logo_url("/assets/logo.png", "https://panel.example.com/"),
            "https://panel.example.com/assets/logo.png"
        );
        assert_eq!(
            resolve_logo_url("https://cdn.example.com/logo.png", "https://panel.example.com"),
            "https://cdn.example.com/logo.png"
        );
        assert_eq!(
            resolve_logo_url("javascript:alert(1)", "https://panel.example.com"),
            ""
        );
        assert_eq!(
            resolve_logo_url("https://e.com/{{x}}.png", "https://panel.example.com"),
            ""
        );
        assert_eq!(
            resolve_logo_url("//evil.com/a.png", "https://panel.example.com"),
            ""
        );

        assert_eq!(
            sanitize_footer("  Hello <b>{{ user }}</b> & \"friends\"\n!  "),
            "Hello &lt;b&gt; user &lt;/b&gt; &amp; &quot;friends&quot;!"
        );
    }

    #[test]
    fn sync_enabled_defaults_to_true_and_respects_false() {
        assert!(sync_enabled(""));
        assert!(sync_enabled("{}"));
        assert!(sync_enabled(r#"{"emailSync":true}"#));
        assert!(!sync_enabled(r#"{"emailSync":false}"#));
    }

    #[test]
    fn register_keeps_stock_templates_and_declares_all_globals() {
        let stock = ExtensionEmailTemplateBuilder::default();
        let builder = register(ExtensionEmailTemplateBuilder::default());
        for &(id, html) in TEMPLATES {
            let find = |b: &ExtensionEmailTemplateBuilder| {
                b.templates
                    .iter()
                    .find(|t| t.identifier == id)
                    .map(|t| t.default_content)
                    .unwrap_or_else(|| panic!("core template {id} missing"))
            };
            assert_eq!(find(&builder), find(&stock), "{id} default was replaced");
            assert_ne!(find(&builder), html, "{id} default is Mint's");
        }

        let declared: HashSet<&str> = builder
            .variables
            .iter()
            .filter(|v| v.template_identifier.is_none())
            .map(|v| v.name.as_str())
            .collect();
        for &(name, _) in GLOBAL_DEFAULTS {
            assert!(declared.contains(name), "global var {name} not registered");
        }
    }

    #[test]
    fn every_shipped_layout_is_a_released_hash() {
        use sha2::Digest;

        for &(id, html) in TEMPLATES {
            let hash = hex::encode(sha2::Sha256::digest(html.as_bytes()));
            assert!(
                RELEASED_TEMPLATE_SHA256
                    .iter()
                    .any(|&(known_id, known)| known_id == id && known == hash),
                "{id}: add {hash} to RELEASED_TEMPLATE_SHA256"
            );
        }
    }

    fn html(id: &str) -> &'static str {
        TEMPLATES.iter().find(|&&(t, _)| t == id).unwrap().1
    }

    #[test]
    fn classify_tells_stock_mint_and_custom_apart() {
        assert_eq!(classify("password_reset", None), TemplateState::Stock);
        assert_eq!(
            classify("password_reset", Some(html("password_reset"))),
            TemplateState::Mint
        );
        // another template's Mint layout, or one edited by a single character, is the operator's
        assert_eq!(
            classify("password_reset", Some(html("account_created"))),
            TemplateState::Custom
        );
        let edited = html("password_reset").replace("{{ vars.greeting }}", "Hello!");
        assert_eq!(classify("password_reset", Some(&edited)), TemplateState::Custom);
        assert_eq!(
            classify("password_reset", Some(&format!("{} ", html("password_reset")))),
            TemplateState::Custom
        );
    }

    #[test]
    fn off_restores_only_mint_layouts() {
        use TemplateState::*;

        // first boot after 2.4.9 and turning the setting off run the same plan
        assert_eq!(plan(Mode::Off, Mint), Some(Change::Clear));
        assert_eq!(plan(Mode::Off, Outdated), Some(Change::Clear));
        assert_eq!(plan(Mode::Off, Stock), None);
        assert_eq!(plan(Mode::Off, Custom), None);
    }

    #[test]
    fn on_writes_mint_layouts_but_keeps_custom_html() {
        use TemplateState::*;

        assert_eq!(plan(Mode::Enable, Stock), Some(Change::Write));
        assert_eq!(plan(Mode::Enable, Outdated), Some(Change::Write));
        assert_eq!(plan(Mode::Enable, Mint), None);
        assert_eq!(plan(Mode::Enable, Custom), None);

        // at boot only older Mint layouts are updated; a template reset to stock while on stays stock
        assert_eq!(plan(Mode::Refresh, Outdated), Some(Change::Write));
        assert_eq!(plan(Mode::Refresh, Stock), None);
        assert_eq!(plan(Mode::Refresh, Mint), None);
        assert_eq!(plan(Mode::Refresh, Custom), None);

        // "Use Mint layout" is the only way custom HTML is replaced
        assert_eq!(plan(Mode::Overwrite, Custom), Some(Change::Write));
        assert_eq!(plan(Mode::Overwrite, Stock), Some(Change::Write));
        assert_eq!(plan(Mode::Overwrite, Mint), None);
    }

    #[test]
    fn upgrade_from_2_4_9_restores_untouched_templates_only() {
        // what a 2.4.9 install can hold: nothing saved (2.4.9's layout came from the defaults), 2.4.9's
        // layout saved unchanged through core's editor, and hand-edited HTML
        let rows: [(&str, Option<String>); 3] = [
            ("account_created", None),
            ("password_reset", Some(html("password_reset").to_string())),
            (
                "two_factor_code",
                Some(html("two_factor_code").replace("{{ vars.intro }}", "Your code:")),
            ),
        ];
        let changes: Vec<_> = rows
            .iter()
            .map(|(id, content)| plan(Mode::Off, classify(id, content.as_deref())))
            .collect();
        assert_eq!(changes, [None, Some(Change::Clear), None]);
    }

    #[test]
    fn templates_only_reference_declared_mint_email_globals() {
        let declared: HashSet<&str> = GLOBAL_DEFAULTS.iter().map(|(k, _)| *k).collect();
        for &(id, html) in TEMPLATES {
            assert!(html.contains("{{ language }}"), "{id} missing language");
            assert!(html.contains("{{ subject }}"), "{id} missing subject");
            assert!(html.contains("{{ settings.app.name }}"), "{id} missing app name");
            assert!(html.contains("{{ vars.greeting }}"), "{id} missing greeting");
            assert!(html.contains("{{ vars.intro }}"), "{id} missing intro");

            let mut rest = html;
            while let Some(pos) = rest.find("vars.mint_email_") {
                let after = &rest[pos + 5..];
                let end = after
                    .find(|c: char| !(c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_'))
                    .unwrap_or(after.len());
                let name = &after[..end];
                assert!(
                    declared.contains(name),
                    "{id} references undeclared global variable '{name}'"
                );
                rest = &after[end..];
            }
        }
    }
}
