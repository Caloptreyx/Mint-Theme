use shared::{
    State,
    extensions::{Extension, ExtensionRouteBuilder},
};
use std::sync::Arc;

mod routes;
pub mod settings;

#[derive(Default)]
pub struct ExtensionStruct;

#[async_trait::async_trait]
impl Extension for ExtensionStruct {
    async fn initialize(&mut self, _state: State) {
        tracing::info!("nebula theme loaded");
    }

    async fn initialize_router(
        &mut self,
        state: State,
        builder: ExtensionRouteBuilder,
    ) -> ExtensionRouteBuilder {
        builder
            // public on purpose: the login page is themed too
            .add_global_router(|routes| routes.nest("/nebula", routes::public(&state)))
            .add_admin_api_router(|routes| {
                routes.nest("/extensions/dev.s4way.nebula", routes::admin(&state))
            })
    }

    async fn settings_deserializer(
        &self,
        _state: State,
    ) -> shared::extensions::settings::ExtensionSettingsDeserializer {
        Arc::new(settings::ExtensionSettingsDataDeserializer)
    }
}
