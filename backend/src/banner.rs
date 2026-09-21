//! Account page banners: an uploaded picture per user, stored like core stores avatars.
//! `publicdata/` is the storage prefix core serves for extensions, on disk and on S3.

use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

const WIDTH: u32 = 1500;
const HEIGHT: u32 = 500;

fn path(user: uuid::Uuid) -> String {
    format!("publicdata/nebula/banners/{user}.jpg")
}

mod put {
    use axum::{body::Bytes, http::StatusCode};
    use image::{DynamicImage, ImageReader, codecs::jpeg::JpegEncoder, imageops::FilterType};
    use serde::Serialize;
    use shared::{
        ApiError, GetState,
        models::user::{GetPermissionManager, GetUser},
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {
        banner: String,
    }

    #[utoipa::path(put, path = "/", responses(
        (status = OK, body = inline(Response)),
        (status = BAD_REQUEST, body = ApiError),
    ), request_body = String)]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        user: GetUser,
        image: Bytes,
    ) -> ApiResponseResult {
        // same gate as the avatar: it is the same kind of profile picture
        permissions.has_user_permission("account.avatar")?;

        if user.frozen {
            return ApiResponse::error("account is frozen")
                .with_status(StatusCode::CONFLICT)
                .ok();
        }

        let bad = |message: &str| {
            ApiResponse::error(message)
                .with_status(StatusCode::BAD_REQUEST)
                .ok()
        };

        let Ok(mut reader) = ImageReader::new(std::io::Cursor::new(image)).with_guessed_format()
        else {
            return bad("image: unable to decode");
        };
        if !matches!(
            reader.format(),
            Some(
                image::ImageFormat::Png
                    | image::ImageFormat::Jpeg
                    | image::ImageFormat::WebP
                    | image::ImageFormat::Gif
            )
        ) {
            return bad("image: only PNG, JPEG, WebP, and GIF formats are allowed");
        }

        let mut limits = image::Limits::default();
        limits.max_alloc = Some(64 * 1024 * 1024);
        limits.max_image_width = Some(4096);
        limits.max_image_height = Some(4096);
        reader.limits(limits);

        let Ok(decoded) = tokio::task::spawn_blocking(move || reader.decode()).await? else {
            return bad("image: unable to decode");
        };
        if decoded.width() < 64 || decoded.height() < 64 {
            return bad("image: dimensions must be at least 64px");
        }

        // re-encoding strips anything but pixels, whatever was uploaded
        let data = tokio::task::spawn_blocking(move || -> Result<Vec<u8>, image::ImageError> {
            let resized = decoded.resize_to_fill(super::WIDTH, super::HEIGHT, FilterType::Triangle);
            let mut data = Vec::new();
            DynamicImage::ImageRgb8(resized.to_rgb8())
                .write_with_encoder(JpegEncoder::new_with_quality(&mut data, 85))?;
            Ok(data)
        })
        .await??;

        let path = super::path(user.uuid);

        // spawned like core's avatar route, so a dropped request cannot leave it half done
        tokio::spawn(async move {
            state
                .storage
                .store(&path, data.as_slice(), "image/jpeg")
                .await?;

            // the file name never changes, the query makes browsers fetch the new one
            let version = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or_default();
            let url = state.storage.retrieve_urls().await?.get_url(&path);

            ApiResponse::new_serialized(Response {
                banner: format!("{url}?v={version}"),
            })
            .ok()
        })
        .await?
    }
}

mod delete {
    use serde::Serialize;
    use shared::{
        GetState,
        models::user::{GetPermissionManager, GetUser},
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {}

    #[utoipa::path(delete, path = "/", responses((status = OK, body = inline(Response))))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        user: GetUser,
    ) -> ApiResponseResult {
        permissions.has_user_permission("account.avatar")?;

        let path = super::path(user.uuid);
        tokio::spawn(async move {
            state.storage.remove(Some(path.as_str())).await?;

            ApiResponse::new_serialized(Response {}).ok()
        })
        .await?
    }
}

pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(put::route))
        .routes(routes!(delete::route))
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    #[test]
    fn path_stays_under_publicdata() {
        let user = uuid::Uuid::nil();
        assert_eq!(
            super::path(user),
            "publicdata/nebula/banners/00000000-0000-0000-0000-000000000000.jpg"
        );
    }
}
