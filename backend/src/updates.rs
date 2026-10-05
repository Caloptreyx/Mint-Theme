//! Update checks against this repo's GitHub releases, shown on the panel's Admin → Updates page.

use serde::Deserialize;
use shared::{State, extensions::ExtensionUpdateInfo};
use std::{
    sync::{Arc, Mutex, PoisonError},
    time::{Duration, Instant},
};

const RELEASES_URL: &str = "https://api.github.com/repos/Caloptreyx/Mint-Theme/releases?per_page=30";
/// The asset every release must carry; a tag whose zip is not uploaded yet is not offered.
const ASSET: &str = "dev_caloptreyx_mint.c7s.zip";
/// Short enough that an admin's recheck soon after a release finds it. GitHub allows 60
/// unauthenticated requests an hour per IP, and an unchanged list answers 304, which it does not count.
const CACHE_TTL: Duration = Duration::from_secs(10 * 60);
const MAX_CHANGES: usize = 60;
const MAX_CHANGE_CHARS: usize = 300;

#[derive(Deserialize)]
struct Asset {
    name: String,
}

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    #[serde(default)]
    body: Option<String>,
    #[serde(default)]
    draft: bool,
    #[serde(default)]
    prerelease: bool,
    #[serde(default)]
    assets: Vec<Asset>,
}

/// A release that can be offered, with its changelog lines.
struct Published {
    version: semver::Version,
    changes: Vec<String>,
}

struct Cached {
    fetched: Instant,
    /// GitHub's ETag for the list, sent back so an unchanged list costs nothing.
    etag: Option<String>,
    /// Newest first.
    releases: Arc<Vec<Published>>,
}

static CACHE: Mutex<Option<Cached>> = Mutex::new(None);

pub async fn check(
    state: &State,
    current: &semver::Version,
) -> Result<Option<ExtensionUpdateInfo>, anyhow::Error> {
    let etag = {
        let cache = CACHE.lock().unwrap_or_else(PoisonError::into_inner);
        match cache.as_ref() {
            Some(cached) if cached.fetched.elapsed() < CACHE_TTL => {
                return Ok(update_info(&cached.releases, current));
            }
            Some(cached) => cached.etag.clone(),
            None => None,
        }
    };

    let mut request = state
        .client
        .get(RELEASES_URL)
        .header("Accept", "application/vnd.github+json");
    if let Some(etag) = &etag {
        request = request.header("If-None-Match", etag.as_str());
    }
    let response = request.send().await?;

    if response.status().as_u16() == 304 {
        let mut cache = CACHE.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some(cached) = cache.as_mut() {
            cached.fetched = Instant::now();
            return Ok(update_info(&cached.releases, current));
        }
        anyhow::bail!("GitHub answered 304 without a cached release list");
    }

    let response = response.error_for_status()?;
    let etag = response
        .headers()
        .get("etag")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let releases = Arc::new(published(&response.json::<Vec<Release>>().await?));

    *CACHE.lock().unwrap_or_else(PoisonError::into_inner) = Some(Cached {
        fetched: Instant::now(),
        etag,
        releases: releases.clone(),
    });

    Ok(update_info(&releases, current))
}

/// The releases that can be offered (published, zip attached, a plain version tag), newest first.
fn published(releases: &[Release]) -> Vec<Published> {
    let mut published: Vec<Published> = releases
        .iter()
        .filter(|r| !r.draft && !r.prerelease && r.assets.iter().any(|a| a.name == ASSET))
        .filter_map(|r| {
            let version = semver::Version::parse(r.tag_name.trim_start_matches('v')).ok()?;
            version.pre.is_empty().then(|| Published {
                version,
                changes: r
                    .body
                    .as_deref()
                    .unwrap_or_default()
                    .lines()
                    .filter_map(change_line)
                    .take(MAX_CHANGES)
                    .collect(),
            })
        })
        .collect();
    published.sort_by(|a, b| b.version.cmp(&a.version));
    published
}

/// The newest published release above `current`, with the changelog of every release in between.
fn update_info(published: &[Published], current: &semver::Version) -> Option<ExtensionUpdateInfo> {
    let newer = move || published.iter().filter(move |p| p.version > *current);

    let latest = newer().next()?.version.clone();
    let changes = newer()
        .flat_map(|release| {
            release
                .changes
                .iter()
                .map(|line| compact_str::format_compact!("{}: {line}", release.version))
        })
        .take(MAX_CHANGES)
        .collect();

    Some(ExtensionUpdateInfo {
        version: latest,
        changes,
    })
}

/// The release notes' bullet points as plain text; headings, install steps and blank lines are skipped.
fn change_line(line: &str) -> Option<String> {
    let item = line
        .trim()
        .strip_prefix("- ")
        .or_else(|| line.trim().strip_prefix("* "))?;
    let text: String = item.replace("**", "").replace('`', "").trim().to_string();
    if text.is_empty() {
        return None;
    }
    Some(text.chars().take(MAX_CHANGE_CHARS).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn release(tag: &str, body: &str) -> Release {
        Release {
            tag_name: tag.into(),
            body: Some(body.into()),
            draft: false,
            prerelease: false,
            assets: vec![Asset { name: ASSET.into() }],
        }
    }

    fn v(s: &str) -> semver::Version {
        semver::Version::parse(s).unwrap()
    }

    #[test]
    fn up_to_date_returns_none() {
        let releases = [release("v1.2.0", "- a"), release("v1.1.0", "- b")];
        assert!(update_info(&published(&releases), &v("1.2.0")).is_none());
        assert!(update_info(&published(&releases), &v("1.3.0")).is_none());
    }

    #[test]
    fn collects_changes_of_every_newer_release_newest_first() {
        let releases = [
            release("v1.1.0", "### What's new\n- **Fonts**: more of them\n\n### Install\nDownload it."),
            release("v1.3.0", "- `/admin/mint` editor"),
            release("v1.2.0", "* one\n- two"),
            release("v1.0.0", "- old"),
        ];
        let info = update_info(&published(&releases), &v("1.1.0")).unwrap();
        assert_eq!(info.version, v("1.3.0"));
        assert_eq!(info.changes, ["1.3.0: /admin/mint editor", "1.2.0: one", "1.2.0: two"]);
    }

    #[test]
    fn skips_drafts_prereleases_bad_tags_and_releases_without_the_zip() {
        let mut draft = release("v2.0.0", "- draft");
        draft.draft = true;
        let mut pre = release("v1.9.0", "- pre");
        pre.prerelease = true;
        let mut no_zip = release("v1.8.0", "- no zip yet");
        no_zip.assets.clear();
        let releases = [
            draft,
            pre,
            no_zip,
            release("v1.7.0-beta.1", "- beta tag"),
            release("latest", "- not a version"),
            release("v1.5.0", "- real"),
        ];
        let info = update_info(&published(&releases), &v("1.2.0")).unwrap();
        assert_eq!(info.version, v("1.5.0"));
        assert_eq!(info.changes, ["1.5.0: real"]);
    }

    #[test]
    fn changelog_is_bounded() {
        let body = (0..100).map(|i| format!("- {}", "x".repeat(i + 400))).collect::<Vec<_>>().join("\n");
        let info = update_info(&published(&[release("v9.0.0", &body)]), &v("1.0.0")).unwrap();
        assert_eq!(info.changes.len(), MAX_CHANGES);
        assert!(info.changes.iter().all(|c| c.chars().count() <= "9.0.0: ".len() + MAX_CHANGE_CHARS));
    }

    #[test]
    fn a_release_without_notes_still_counts() {
        let mut empty = release("v1.3.0", "");
        empty.body = None;
        let info = update_info(&published(&[empty]), &v("1.2.0")).unwrap();
        assert_eq!(info.version, v("1.3.0"));
        assert!(info.changes.is_empty());
    }
}
