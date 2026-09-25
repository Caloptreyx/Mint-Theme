use shared::{
    State,
    extensions::{Extension, ExtensionRouteBuilder, ExtensionUpdateInfo},
};
use std::sync::Arc;

mod banner;
mod cta;
mod routes;
pub mod settings;
mod updates;

#[derive(Default)]
pub struct ExtensionStruct;

#[async_trait::async_trait]
impl Extension for ExtensionStruct {
    async fn initialize(&mut self, _state: State) {
        tracing::info!("mint theme loaded");
    }

    async fn initialize_router(
        &mut self,
        state: State,
        builder: ExtensionRouteBuilder,
    ) -> ExtensionRouteBuilder {
        builder
            // public on purpose: the login page is themed too
            .add_global_router(|routes| routes.nest("/mint", routes::public(&state)))
            .add_admin_api_router(|routes| {
                routes
                    .nest("/extensions/dev.caloptreyx.mint", routes::admin(&state))
                    .nest(
                        "/extensions/dev.caloptreyx.mint/announcement-ctas",
                        cta::admin(&state),
                    )
            })
            .add_client_api_router(|routes| {
                routes
                    .nest(
                        "/extensions/dev.caloptreyx.mint/banner",
                        banner::router(&state),
                    )
                    .nest(
                        "/extensions/dev.caloptreyx.mint/announcement-ctas",
                        cta::client(&state),
                    )
            })
    }

    async fn settings_deserializer(
        &self,
        _state: State,
    ) -> shared::extensions::settings::ExtensionSettingsDeserializer {
        Arc::new(settings::ExtensionSettingsDataDeserializer)
    }

    /// Offers the newest GitHub release on Admin → Updates, with every newer release's notes.
    async fn check_for_updates(
        &self,
        state: State,
        current_version: &semver::Version,
    ) -> Result<Option<ExtensionUpdateInfo>, anyhow::Error> {
        updates::check(&state, current_version).await
    }
}
