//! Update checks against this repo's GitHub releases, shown on the panel's Admin → Updates page.

use serde::{Deserialize, Serialize};
use shared::{State, extensions::ExtensionUpdateInfo};

const RELEASES_URL: &str = "https://api.github.com/repos/Caloptreyx/Mint-Theme/releases?per_page=30";
/// The asset every release must carry; a tag whose zip is not uploaded yet is not offered.
const ASSET: &str = "dev_s4way_nebula.c7s.zip";
const CACHE_KEY: &str = "dev.s4way.nebula::releases";
/// GitHub allows 60 unauthenticated requests an hour per IP; the panel only asks every 12 hours.
const CACHE_TTL_SECONDS: u64 = 60 * 60;
const MAX_CHANGES: usize = 60;
const MAX_CHANGE_CHARS: usize = 300;

#[derive(Serialize, Deserialize)]
struct Asset {
    name: String,
}

#[derive(Serialize, Deserialize)]
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

pub async fn check(
    state: &State,
    current: &semver::Version,
) -> Result<Option<ExtensionUpdateInfo>, anyhow::Error> {
    let releases: Vec<Release> = state
        .cache
        .cached(CACHE_KEY, CACHE_TTL_SECONDS, || async {
            state
                .client
                .get(RELEASES_URL)
                .header("Accept", "application/vnd.github+json")
                .send()
                .await?
                .error_for_status()?
                .json::<Vec<Release>>()
                .await
        })
        .await?;

    Ok(update_info(&releases, current))
}

/// The newest published release above `current`, with the changelog of every release in between.
fn update_info(releases: &[Release], current: &semver::Version) -> Option<ExtensionUpdateInfo> {
    let mut newer: Vec<(semver::Version, &Release)> = releases
        .iter()
        .filter(|r| !r.draft && !r.prerelease && r.assets.iter().any(|a| a.name == ASSET))
        .filter_map(|r| {
            let version = semver::Version::parse(r.tag_name.trim_start_matches('v')).ok()?;
            (version > *current && version.pre.is_empty()).then_some((version, r))
        })
        .collect();
    newer.sort_by(|a, b| b.0.cmp(&a.0));

    let latest = newer.first()?.0.clone();
    let changes = newer
        .iter()
        .flat_map(|(version, release)| {
            release
                .body
                .as_deref()
                .unwrap_or_default()
                .lines()
                .filter_map(change_line)
                .map(move |line| compact_str::format_compact!("{version}: {line}"))
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
        assert!(update_info(&releases, &v("1.2.0")).is_none());
        assert!(update_info(&releases, &v("1.3.0")).is_none());
    }

    #[test]
    fn collects_changes_of_every_newer_release_newest_first() {
        let releases = [
            release("v1.1.0", "### What's new\n- **Fonts**: more of them\n\n### Install\nDownload it."),
            release("v1.3.0", "- `/admin/mint` editor"),
            release("v1.2.0", "* one\n- two"),
            release("v1.0.0", "- old"),
        ];
        let info = update_info(&releases, &v("1.1.0")).unwrap();
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
        let info = update_info(&releases, &v("1.2.0")).unwrap();
        assert_eq!(info.version, v("1.5.0"));
        assert_eq!(info.changes, ["1.5.0: real"]);
    }

    #[test]
    fn changelog_is_bounded() {
        let body = (0..100).map(|i| format!("- {}", "x".repeat(i + 400))).collect::<Vec<_>>().join("\n");
        let info = update_info(&[release("v9.0.0", &body)], &v("1.0.0")).unwrap();
        assert_eq!(info.changes.len(), MAX_CHANGES);
        assert!(info.changes.iter().all(|c| c.chars().count() <= "9.0.0: ".len() + MAX_CHANGE_CHARS));
    }

    #[test]
    fn a_release_without_notes_still_counts() {
        let mut empty = release("v1.3.0", "");
        empty.body = None;
        let info = update_info(&[empty], &v("1.2.0")).unwrap();
        assert_eq!(info.version, v("1.3.0"));
        assert!(info.changes.is_empty());
    }
}
