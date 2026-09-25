use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

const MAX_THEME_BYTES: usize = 64 * 1024;

/// Empty or unparsable settings mean "use the built-in look".
fn parse(raw: &str) -> Option<serde_json::Value> {
    serde_json::from_str::<serde_json::Value>(raw)
        .ok()
        .filter(|v| v.is_object())
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
        theme: Option<serde_json::Value>,
    }

    #[utoipa::path(get, path = "/", responses((status = OK, body = inline(Response))))]
    pub async fn route(state: GetState) -> ApiResponseResult {
        let settings = state.settings.get().await?;
        let theme = settings
            .find_extension_settings::<crate::settings::ExtensionSettingsData>()
            .ok()
            .and_then(|s| super::parse(&s.theme));
        drop(settings);

        ApiResponse::new_serialized(Response { theme }).ok()
    }
}

mod put {
    use axum::http::StatusCode;
    use serde::{Deserialize, Serialize};
    use shared::{
        GetState,
        models::{admin_activity::GetAdminActivityLogger, user::GetPermissionManager},
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Deserialize)]
    pub struct Payload {
        /// The editor config, or null to go back to the built-in look.
        theme: Option<serde_json::Value>,
    }

    #[derive(ToSchema, Serialize)]
    struct Response {}

    #[utoipa::path(put, path = "/", responses(
        (status = OK, body = inline(Response)),
        (status = BAD_REQUEST, body = shared::ApiError),
    ), request_body = inline(Payload))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        activity_logger: GetAdminActivityLogger,
        shared::Payload(data): shared::Payload<Payload>,
    ) -> ApiResponseResult {
        permissions.has_admin_permission("settings.update")?;

        let serialized = match data.theme {
            None => String::new(),
            Some(theme) if theme.is_object() => theme.to_string(),
            Some(_) => {
                return ApiResponse::error("theme must be an object")
                    .with_status(StatusCode::BAD_REQUEST)
                    .ok();
            }
        };
        if serialized.len() > super::MAX_THEME_BYTES {
            return ApiResponse::error("theme is too large")
                .with_status(StatusCode::BAD_REQUEST)
                .ok();
        }

        let mut settings = state.settings.get_mut().await?;
        settings
            .find_mut_extension_settings::<crate::settings::ExtensionSettingsData>()?
            .theme = serialized.into();
        settings.save().await?;

        activity_logger
            .log("mint:theme.update", serde_json::json!({}))
            .await;

        ApiResponse::new_serialized(Response {}).ok()
    }
}

pub fn public(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .nest(
            "/theme",
            OpenApiRouter::new().routes(routes!(get::route)),
        )
        .with_state(state.clone())
}

pub fn admin(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .nest(
            "/theme",
            OpenApiRouter::new().routes(routes!(put::route)),
        )
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn parse_accepts_objects_only() {
        assert!(parse(r##"{"accent":"#1e88c7"}"##).is_some());
        assert!(parse("").is_none());
        assert!(parse("[1,2]").is_none());
        assert!(parse("\"x\"").is_none());
        assert!(parse("{broken").is_none());
    }
}
