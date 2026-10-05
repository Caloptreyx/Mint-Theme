//! Account page banners: an uploaded picture per user, stored like core stores avatars. Every upload
//! gets a new random path under `publicdata/` (the storage prefix core serves for extensions, on disk
//! and on S3) and the previous file is removed. The user's `nebula::account_banner` setting (core's
//! synced user settings) holds the storage path, written here; the URL is built when it is read, so
//! a new app URL or storage driver never breaks it.

use shared::{State, models::user::User};
use utoipa_axum::{router::OpenApiRouter, routes};

const WIDTH: u32 = 1500;
const HEIGHT: u32 = 500;
const MIN_SIDE: u32 = 64;
const MAX_SIDE: u32 = 4096;
const MAX_DECODE_BYTES: u64 = 64 * 1024 * 1024;
/// JPEG has no alpha: transparent pixels are laid over this neutral grey instead of turning black.
const BACKDROP: u8 = 128;
const PREFIX: &str = "publicdata/nebula/banners";
/// The user setting the frontend reads.
const SETTING: &str = "nebula::account_banner";

fn new_path(user: uuid::Uuid) -> String {
    format!("{PREFIX}/{user}/{}.jpg", uuid::Uuid::new_v4().simple())
}

/// Where uploads went up to 2.0: one file per user, its absolute URL saved in the setting.
fn legacy_path(user: uuid::Uuid) -> String {
    format!("{PREFIX}/{user}.jpg")
}

/// The user's own banner file that a setting value points at, and the `?v=` cache buster a value
/// saved up to 2.0 carries. Anything else (another user's file, a foreign URL, a path outside the
/// banners) is None: core lets users write their settings, and this decides what gets deleted.
fn owned(user: uuid::Uuid, value: &str) -> Option<(String, Option<&str>)> {
    if let Some(name) = value.strip_prefix(&format!("{PREFIX}/{user}/")) {
        let stem = name.strip_suffix(".jpg")?;
        let valid =
            !stem.is_empty() && stem.len() <= 64 && stem.bytes().all(|b| b.is_ascii_alphanumeric());
        return valid.then(|| (value.to_owned(), None));
    }

    if !(value.starts_with("https://") || value.starts_with("http://")) {
        return None;
    }
    let (url, query) = value.split_once('?').unwrap_or((value, ""));
    let legacy = legacy_path(user);
    if !url
        .strip_suffix(legacy.as_str())
        .is_some_and(|base| base.ends_with('/'))
    {
        return None;
    }
    let version = query
        .strip_prefix("v=")
        .filter(|v| !v.is_empty() && v.bytes().all(|b| b.is_ascii_digit()));
    Some((legacy, version))
}

fn over_backdrop(channel: u8, alpha: u8) -> u8 {
    let (channel, alpha) = (u32::from(channel), u32::from(alpha));
    ((channel * alpha + u32::from(BACKDROP) * (255 - alpha) + 127) / 255) as u8
}

/// The upload as a 1500x500 JPEG, or the message for the user. Re-encoding strips anything but
/// pixels, whatever was uploaded. Blocking: run it on `spawn_blocking`.
fn transcode(bytes: &[u8]) -> Result<Vec<u8>, &'static str> {
    use image::{
        DynamicImage, ImageError, ImageFormat, ImageReader, codecs::jpeg::JpegEncoder,
        imageops::FilterType,
    };

    if bytes.is_empty() {
        return Err("image: payload cannot be empty");
    }

    let mut reader = ImageReader::new(std::io::Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|_| "image: unable to decode")?;
    if !matches!(
        reader.format(),
        Some(ImageFormat::Png | ImageFormat::Jpeg | ImageFormat::WebP | ImageFormat::Gif)
    ) {
        return Err("image: only PNG, JPEG, WebP, and GIF formats are allowed");
    }

    // checked against the header before any pixel is decoded
    let mut limits = image::Limits::default();
    limits.max_alloc = Some(MAX_DECODE_BYTES);
    limits.max_image_width = Some(MAX_SIDE);
    limits.max_image_height = Some(MAX_SIDE);
    reader.limits(limits);

    let decoded = reader.decode().map_err(|err| match err {
        ImageError::Limits(_) => "image: dimensions must not exceed 4096px",
        _ => "image: unable to decode",
    })?;
    let (width, height) = (decoded.width(), decoded.height());
    if width < MIN_SIDE || height < MIN_SIDE {
        return Err("image: dimensions must be at least 64px");
    }

    let opaque = if decoded.color().has_alpha() {
        let mut rgba = decoded.into_rgba8();
        for pixel in rgba.pixels_mut() {
            let [r, g, b, a] = pixel.0;
            pixel.0 = [
                over_backdrop(r, a),
                over_backdrop(g, a),
                over_backdrop(b, a),
                u8::MAX,
            ];
        }
        DynamicImage::ImageRgba8(rgba)
    } else {
        decoded
    };

    // cropped to 3:1 around the centre before scaling, so a thin strip never scales up to a huge
    // intermediate image first
    let (crop_width, crop_height) =
        if u64::from(width) * u64::from(HEIGHT) > u64::from(height) * u64::from(WIDTH) {
            (
                (u64::from(height) * u64::from(WIDTH) / u64::from(HEIGHT)) as u32,
                height,
            )
        } else {
            (
                width,
                (u64::from(width) * u64::from(HEIGHT) / u64::from(WIDTH)) as u32,
            )
        };
    let resized = opaque
        .crop_imm(
            (width - crop_width) / 2,
            (height - crop_height) / 2,
            crop_width,
            crop_height,
        )
        .resize_exact(WIDTH, HEIGHT, FilterType::Triangle);

    let mut data = Vec::new();
    DynamicImage::ImageRgb8(resized.to_rgb8())
        .write_with_encoder(JpegEncoder::new_with_quality(&mut data, 85))
        .map_err(|_| "image: unable to encode")?;
    Ok(data)
}

/// Points the user's banner setting at `path` (None clears it) and returns the value it replaced.
/// Core's settings lock serializes this with other writers, so two uploads never both keep a file.
async fn swap_setting(
    state: &State,
    user: &User,
    path: Option<&str>,
) -> Result<Option<String>, anyhow::Error> {
    let mut settings = user.get_settings_mut(&state.database).await?;
    let previous = match path {
        Some(path) => settings.insert(SETTING.into(), serde_json::Value::String(path.into())),
        None => settings.remove(SETTING),
    };
    if path.is_some() || previous.is_some() {
        settings.save(&state.database).await?;
    }

    Ok(previous.and_then(|value| value.as_str().map(str::to_owned)))
}

/// Removes the file a replaced setting value pointed at, if it is this user's banner. Logged, never
/// fatal: the setting has moved on already.
async fn remove_replaced(state: &State, user: uuid::Uuid, previous: Option<&str>) {
    let Some((path, _)) = previous.and_then(|value| owned(user, value)) else {
        return;
    };
    if let Err(err) = state.storage.remove(Some(&path)).await {
        tracing::warn!(%user, path = %path, "unable to remove a replaced account banner: {:#}", err);
    }
}

/// Removes every banner of a deleted user (the setting goes with the account, so the folder is
/// listed). Logged, never fatal: storage being down must not block deleting the user.
pub(crate) async fn remove_all(state: State, user: uuid::Uuid) {
    let mut paths = vec![legacy_path(user)];
    match state.storage.list(PREFIX, user.to_string(), 1, 100).await {
        Ok(listing) => paths.extend(
            listing
                .data
                .into_iter()
                .filter(|asset| !asset.is_directory)
                .map(|asset| format!("{PREFIX}/{}", asset.name)),
        ),
        Err(err) => {
            tracing::warn!(%user, "unable to list a deleted user's account banners: {:#}", err);
        }
    }

    for path in paths {
        if let Err(err) = state.storage.remove(Some(&path)).await {
            tracing::warn!(
                %user,
                path = %path,
                "unable to remove a deleted user's account banner: {:#}",
                err
            );
        }
    }
}

mod get {
    use serde::Serialize;
    use shared::{
        GetState,
        models::user::{GetPermissionManager, GetUser},
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {
        /// The banner's URL, null when the user has none.
        banner: Option<String>,
    }

    #[utoipa::path(get, path = "/", responses((status = OK, body = inline(Response))))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        user: GetUser,
    ) -> ApiResponseResult {
        // it reads a user setting
        permissions.has_user_permission("settings.read")?;

        let value: Option<String> = user
            .get_settings(&state.database)
            .await?
            .get(super::SETTING);

        let banner = match value.as_deref().and_then(|v| super::owned(user.uuid, v)) {
            Some((path, version)) => {
                let url = state.storage.retrieve_urls().await?.get_url(&path);
                Some(match version {
                    Some(version) => format!("{url}?v={version}"),
                    None => url,
                })
            }
            None => None,
        };

        ApiResponse::new_serialized(Response { banner }).ok()
    }
}

mod put {
    use axum::{body::Bytes, http::StatusCode};
    use serde::Serialize;
    use shared::{
        ApiError, GetState,
        models::{
            user::{GetPermissionManager, GetUser},
            user_activity::GetUserActivityLogger,
        },
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {
        /// The new banner's URL.
        banner: String,
        /// What the `nebula::account_banner` user setting now holds (a storage path).
        path: String,
    }

    #[utoipa::path(put, path = "/", responses(
        (status = OK, body = inline(Response)),
        (status = BAD_REQUEST, body = ApiError),
        (status = CONFLICT, body = ApiError),
    ), request_body = String)]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        user: GetUser,
        activity_logger: GetUserActivityLogger,
        image: Bytes,
    ) -> ApiResponseResult {
        // same gate as the avatar: it is the same kind of profile picture
        permissions.has_user_permission("account.avatar")?;

        if user.frozen {
            return ApiResponse::error("account is frozen")
                .with_status(StatusCode::CONFLICT)
                .ok();
        }

        let data = match tokio::task::spawn_blocking(move || super::transcode(&image)).await? {
            Ok(data) => data,
            Err(message) => {
                return ApiResponse::error(message)
                    .with_status(StatusCode::BAD_REQUEST)
                    .ok();
            }
        };

        let path = super::new_path(user.uuid);

        // spawned like core's avatar route, so a dropped request cannot leave it half done
        tokio::spawn(async move {
            state
                .storage
                .store(&path, data.as_slice(), "image/jpeg")
                .await?;

            let previous = match super::swap_setting(&state, &user, Some(path.as_str())).await {
                Ok(previous) => previous,
                Err(err) => {
                    // nothing points at the new file
                    if let Err(err) = state.storage.remove(Some(&path)).await {
                        tracing::warn!(
                            path = %path,
                            "unable to remove an unsaved account banner: {:#}",
                            err
                        );
                    }
                    return Err(err.into());
                }
            };
            super::remove_replaced(&state, user.uuid, previous.as_deref()).await;

            activity_logger
                .log("mint:banner.update", serde_json::json!({}))
                .await;

            let banner = state.storage.retrieve_urls().await?.get_url(&path);
            ApiResponse::new_serialized(Response { banner, path }).ok()
        })
        .await?
    }
}

mod delete {
    use serde::Serialize;
    use shared::{
        GetState,
        models::{
            user::{GetPermissionManager, GetUser},
            user_activity::GetUserActivityLogger,
        },
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
        activity_logger: GetUserActivityLogger,
    ) -> ApiResponseResult {
        permissions.has_user_permission("account.avatar")?;

        tokio::spawn(async move {
            let previous = super::swap_setting(&state, &user, None).await?;
            if previous.is_some() {
                super::remove_replaced(&state, user.uuid, previous.as_deref()).await;

                activity_logger
                    .log("mint:banner.delete", serde_json::json!({}))
                    .await;
            }

            ApiResponse::new_serialized(Response {}).ok()
        })
        .await?
    }
}

/// `GET` (`settings.read`), `PUT` and `DELETE` (`account.avatar`) on the signed in user's banner.
pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route, put::route, delete::route))
        .with_state(state.clone())
}

#[cfg(test)]
mod tests {
    use super::{BACKDROP, HEIGHT, PREFIX, WIDTH, legacy_path, new_path, owned, transcode};

    const USER: uuid::Uuid = uuid::Uuid::from_u128(0x1234);
    const OTHER: uuid::Uuid = uuid::Uuid::from_u128(0x5678);

    fn encoded(image: image::DynamicImage, format: image::ImageFormat) -> Vec<u8> {
        let mut out = std::io::Cursor::new(Vec::new());
        image.write_to(&mut out, format).unwrap();
        out.into_inner()
    }

    fn png(width: u32, height: u32, pixel: [u8; 4]) -> Vec<u8> {
        let image = image::RgbaImage::from_pixel(width, height, image::Rgba(pixel));
        encoded(
            image::DynamicImage::ImageRgba8(image),
            image::ImageFormat::Png,
        )
    }

    fn decode(jpeg: &[u8]) -> image::RgbImage {
        let image = image::load_from_memory(jpeg).unwrap();
        assert_eq!(image::guess_format(jpeg).unwrap(), image::ImageFormat::Jpeg);
        image.to_rgb8()
    }

    fn close(actual: [u8; 3], expected: [u8; 3]) -> bool {
        actual.iter().zip(expected).all(|(a, e)| a.abs_diff(e) <= 4)
    }

    #[test]
    fn paths_stay_under_the_users_folder() {
        assert_eq!(
            legacy_path(uuid::Uuid::nil()),
            "publicdata/nebula/banners/00000000-0000-0000-0000-000000000000.jpg"
        );

        let path = new_path(USER);
        assert!(path.starts_with(&format!("{PREFIX}/{USER}/")));
        assert!(path.ends_with(".jpg"));
        assert_ne!(path, new_path(USER), "every upload gets its own file");
        assert_eq!(owned(USER, &path), Some((path.clone(), None)));
    }

    #[test]
    fn owned_accepts_only_the_users_own_files() {
        let other = new_path(OTHER);
        assert_eq!(owned(USER, &other), None);
        let refused = [
            String::new(),
            PREFIX.to_owned(),
            format!("{PREFIX}/{USER}/../{OTHER}/a.jpg"),
            format!("{PREFIX}/{USER}/a/b.jpg"),
            format!("{PREFIX}/{USER}/.jpg"),
            format!("{PREFIX}/{USER}/a.png"),
            format!("avatars/{USER}/a.webp"),
            format!("/{PREFIX}/{USER}/a.jpg"),
            "https://example.com/banner.jpg".to_owned(),
            "javascript:alert(1)".to_owned(),
        ];
        for value in &refused {
            assert_eq!(owned(USER, value), None, "{value:?}");
        }
    }

    #[test]
    fn owned_maps_urls_saved_up_to_2_0_to_the_legacy_file() {
        let legacy = legacy_path(USER);
        assert_eq!(
            owned(
                USER,
                &format!("https://panel.example/{legacy}?v=1727000000000")
            ),
            Some((legacy.clone(), Some("1727000000000")))
        );
        assert_eq!(
            owned(USER, &format!("http://cdn.example/bucket/{legacy}")),
            Some((legacy.clone(), None))
        );
        assert_eq!(
            owned(USER, &format!("https://panel.example/{legacy}?v=1;x")),
            Some((legacy.clone(), None)),
            "a cache buster that is not a number is dropped"
        );
        assert_eq!(
            owned(USER, &format!("https://panel.example/x{legacy}")),
            None
        );
        assert_eq!(
            owned(OTHER, &format!("https://panel.example/{legacy}")),
            None
        );
    }

    #[test]
    fn transcode_refuses_what_is_not_an_allowed_image() {
        assert!(transcode(&[]).is_err());
        assert!(transcode(b"not an image at all").is_err());
        // a BMP header: a real image format, but not one of the four
        let mut bmp = b"BM".to_vec();
        bmp.extend_from_slice(&[0; 64]);
        assert_eq!(
            transcode(&bmp),
            Err("image: only PNG, JPEG, WebP, and GIF formats are allowed")
        );
        // a PNG signature with nothing behind it
        assert_eq!(
            transcode(b"\x89PNG\r\n\x1a\n"),
            Err("image: unable to decode")
        );
    }

    #[test]
    fn transcode_checks_the_dimensions() {
        assert_eq!(
            transcode(&png(32, 32, [255, 0, 0, 255])),
            Err("image: dimensions must be at least 64px")
        );
        assert_eq!(
            transcode(&png(64, 63, [255, 0, 0, 255])),
            Err("image: dimensions must be at least 64px")
        );
        assert!(transcode(&png(4097, 64, [255, 0, 0, 255])).is_err());
        assert!(transcode(&png(64, 4097, [255, 0, 0, 255])).is_err());
    }

    #[test]
    fn transcode_makes_a_banner_sized_jpeg() {
        for (width, height) in [(64, 64), (4096, 64), (64, 1000), (3000, 1000)] {
            let jpeg = transcode(&png(width, height, [200, 30, 30, 255])).unwrap();
            let banner = decode(&jpeg);
            assert_eq!(banner.dimensions(), (WIDTH, HEIGHT), "{width}x{height}");
            assert!(close(banner.get_pixel(750, 250).0, [200, 30, 30]));
        }

        let jpeg = transcode(&encoded(
            image::DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
                100,
                100,
                image::Rgb([10, 120, 60]),
            )),
            image::ImageFormat::Jpeg,
        ))
        .unwrap();
        assert!(close(decode(&jpeg).get_pixel(10, 10).0, [10, 120, 60]));
    }

    #[test]
    fn transcode_lays_transparency_over_grey() {
        let grey = [BACKDROP; 3];

        // fully transparent black: the classic logo background, no longer black
        let jpeg = transcode(&png(64, 64, [0, 0, 0, 0])).unwrap();
        assert!(close(decode(&jpeg).get_pixel(10, 10).0, grey));

        // half transparent white lands half way between white and the backdrop
        let jpeg = transcode(&png(64, 64, [255, 255, 255, 128])).unwrap();
        let half = (255 + u16::from(BACKDROP)).div_ceil(2) as u8;
        assert!(close(decode(&jpeg).get_pixel(10, 10).0, [half; 3]));
    }
}
