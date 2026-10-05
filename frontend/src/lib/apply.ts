import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { axiosInstance, getUserSetting, useUserSettingsStore } from './core.ts';
import { normalizeChoices, type PresetLibrary, THEME_CHOICE_KEY, type ThemeChoice } from './library.ts';
import { LOCAL_THEME_KEY, paintedTheme, parseLocalTheme } from './localTheme.ts';
import { buildCss, DEFAULT_THEME, type NebulaTheme, normalizeTheme } from './theme.ts';

const STYLE_ID = 'nebula-theme';
const CACHE_KEY = 'nebula:theme';
const CHOICES_CACHE_KEY = 'nebula:theme-choices';
const CHOICES_API = '/api/client/extensions/dev.caloptreyx.mint/theme-choices';
const PREVIEW_MSG = 'nebula:preview';
export const READY_MSG = 'nebula:ready';

let saved: NebulaTheme = DEFAULT_THEME;
/** 'Apply in this browser': stands in for `saved` in this browser only (lib/localTheme.ts). */
let local: NebulaTheme | null = null;
let current: NebulaTheme = DEFAULT_THEME;
let previewing = false;
const listeners = new Set<() => void>();
/** The presets users may pick, fetched while signed in and cached for the next load. */
let choices: ThemeChoice[] = [];
/** Set when core unloads the user's settings (sign out); the replica core hydrates at startup counts until then. */
let signedOut = false;
/** Pages that always show the site theme: auth pages, the editor, its preview frame. */
let siteHolds = 0;
let shownKey = '';
/**
 * A first visit has no cached theme: the page stays hidden (`data-nebula-pending`, app.css) until loadTheme()
 * settles, and at most this long, so a slow or failing request never leaves it blank.
 */
const PENDING_MS = 1500;
let pendingTimer: number | undefined;

export const savedTheme = () => saved;

/** The site theme as this browser shows it: the applied local theme, else the saved one. */
export const siteTheme = () => local ?? saved;

/** The theme applied in this browser only, or null; re-renders when it changes. */
export const useLocalTheme = () => useSyncExternalStore(subscribeTheme, () => local);

/** The theme on screen right now, a draft included while the editor previews one. */
export const currentTheme = () => current;

export const subscribeTheme = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function notify() {
  for (const listener of listeners) listener();
}

/** So pages like Home re-render when the editor previews a draft. */
export const useNebulaTheme = () => useSyncExternalStore(subscribeTheme, currentTheme);

/** The presets the account page offers; re-renders with the theme. */
export const useThemeChoices = () => useSyncExternalStore(subscribeTheme, () => choices);

// one schema instance, core caches parsed settings per schema
const CHOICE_SCHEMA = z.string();

/** What decides between the site theme and the user's pick; a repaint is only needed when it changes. */
function userKey() {
  if (signedOut || siteHolds > 0) return '';
  return getUserSetting(THEME_CHOICE_KEY, CHOICE_SCHEMA, '');
}

/** The site theme (or this browser's local one), or the preset the user picked while it is still offered. */
function repaint() {
  shownKey = userKey();
  if (previewing || pendingTimer !== undefined) return;
  applyTheme(paintedTheme(saved, local, choices, shownKey));
}

/** Swaps this browser's local theme and repaints; listeners hear of it even when the look stays the same. */
function setLocal(theme: NebulaTheme | null) {
  if (theme === local) return;
  local = theme;
  repaint();
  notify();
}

/** 'Apply in this browser': paints `theme` as the site theme here (and in this browser's other tabs) only. */
export function applyLocalTheme(theme: NebulaTheme) {
  const normalized = normalizeTheme(theme);
  try {
    localStorage.setItem(LOCAL_THEME_KEY, JSON.stringify(normalized));
  } catch {
    // private mode or full storage: this tab still shows it until it reloads
  }
  setLocal(normalized);
}

/** Back to the saved site theme in this browser. */
export function clearLocalTheme() {
  try {
    localStorage.removeItem(LOCAL_THEME_KEY);
  } catch {
    // storage blocked: nothing was kept
  }
  setLocal(null);
}

/** Ends the first visit guard with whatever is known by then; applyTheme() shows the page. */
function reveal() {
  if (pendingTimer === undefined) return;
  window.clearTimeout(pendingTimer);
  pendingTimer = undefined;
  repaint();
}

/** Shows the site theme instead of the user's pick until the returned release runs. */
export function holdSiteTheme(): () => void {
  siteHolds++;
  repaint();
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    siteHolds--;
    repaint();
  };
}

/** The presets a signed in user may pick; a failed request keeps the cached list. */
function loadChoices(user: string) {
  axiosInstance
    .get<{ choices?: unknown }>(CHOICES_API)
    .then(({ data }) => {
      // signed out or switched user meanwhile: the answer was for someone else
      if (useUserSettingsStore.getState().userUuid !== user) return;
      rememberChoices(normalizeChoices(data.choices));
      repaint();
    })
    .catch(() => undefined);
}

/**
 * Follows the user's pick live (the account page, other tabs through core's replica), sign in and out (the choices
 * are fetched on every sign in), and the site theme and choices other tabs fetched or saved.
 */
export function watchUserTheme() {
  useUserSettingsStore.subscribe((state, prev) => {
    if (state.userUuid) signedOut = false;
    else if (prev.userUuid) signedOut = true;
    if (state.userUuid && state.userUuid !== prev.userUuid) loadChoices(state.userUuid);
    if (userKey() !== shownKey) repaint();
  });
  const user = useUserSettingsStore.getState().userUuid;
  if (user) loadChoices(user);

  // localStorage only fires this in the other tabs, and only when the value changed
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === LOCAL_THEME_KEY) {
      // null: removed ('Stop' in another tab)
      setLocal(parseLocalTheme(event.newValue));
      return;
    }
    if (event.newValue === null) return;
    if (event.key === CACHE_KEY) {
      const theme = readTheme(event.newValue);
      if (!theme) return;
      saved = theme;
      repaint();
    } else if (event.key === CHOICES_CACHE_KEY) {
      setChoices(readChoices(event.newValue));
      repaint();
    }
  });
}

const FAVICON_CLASS = 'nebula-favicon';
const PANEL_ICONS = 'link[rel~="icon"],link[rel="apple-touch-icon"]';
let favicon = '';

/**
 * `favicon`: core's own icon links (`.app-icon`, whose href its App sets from `settings.app.icon`) are parked under
 * another rel rather than edited, so core can keep updating them and clearing the option restores them as they are.
 */
function applyFavicon(href: string) {
  if (href === favicon) return;
  favicon = href;
  for (const link of document.head.querySelectorAll(`link.${FAVICON_CLASS}`)) link.remove();

  if (!href) {
    for (const link of document.head.querySelectorAll<HTMLLinkElement>('link[data-nebula-rel]')) {
      link.rel = link.dataset.nebulaRel ?? 'icon';
      delete link.dataset.nebulaRel;
    }
    return;
  }
  for (const link of document.head.querySelectorAll<HTMLLinkElement>(PANEL_ICONS)) {
    link.dataset.nebulaRel = link.rel;
    link.rel = 'nebula-parked-icon';
  }
  for (const rel of ['icon', 'apple-touch-icon']) {
    const link = document.createElement('link');
    link.className = FAVICON_CLASS;
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  }
}

/**
 * Writes only what changed: a new stylesheet makes the browser restyle the whole page, and a new `current` re-renders
 * every useNebulaTheme() reader, while most repaints (the fetch after the cached paint, holdSiteTheme() with no pick)
 * bring the same theme again.
 */
function applyTheme(theme: NebulaTheme) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  const css = buildCss(theme);
  if (el.textContent !== css) el.textContent = css;
  // the layout names for static CSS to key off (the menu styles' rail tweaks); buildCss scopes its own rules
  const data = document.documentElement.dataset;
  if (data.nebulaLayout !== theme.sidebarLayout) data.nebulaLayout = theme.sidebarLayout;
  if (data.nebulaDock !== theme.dockPosition) data.nebulaDock = theme.dockPosition;
  applyFavicon(theme.favicon);
  if ('nebulaPending' in data) delete data.nebulaPending;
  // normalizeTheme() builds a fresh object every time, so compare what it holds
  if (theme === current || JSON.stringify(theme) === JSON.stringify(current)) return;
  current = theme;
  notify();
}

export function rememberTheme(theme: NebulaTheme) {
  saved = theme;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
  } catch {
    // private mode or full storage, the next load waits for the fetch again
  }
  repaint();
}

/** A cached site theme, or null when it can't be read. */
function readTheme(json: string): NebulaTheme | null {
  try {
    return normalizeTheme(JSON.parse(json));
  } catch {
    return null;
  }
}

/** The cached choices, stored as normalizeChoices() returned them, which only keeps what it can read back. */
function readChoices(json: string): ThemeChoice[] {
  try {
    const cached = JSON.parse(json) as ThemeChoice[];
    return Array.isArray(cached)
      ? cached.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Swaps the list (the account page re-renders) unless it holds the same choices. */
function setChoices(list: ThemeChoice[]) {
  if (JSON.stringify(list) === JSON.stringify(choices)) return;
  choices = list;
  // also while previewing, which paints drafts only: the frame's account page still lists the choices
  notify();
}

function rememberChoices(list: ThemeChoice[]) {
  setChoices(list);
  try {
    localStorage.setItem(CHOICES_CACHE_KEY, JSON.stringify(list));
  } catch {
    // as above
  }
}

/** After the editor changed the presets library: the choices it offers users now, and the admin's own pick. */
export function setChoicesFromLibrary(lib: PresetLibrary) {
  rememberChoices(normalizeChoices({ builtin: lib.builtin, custom: lib.custom.filter((preset) => preset.users) }));
  repaint();
}

/** Paints the last known theme (or the user's pick) right away so a custom look doesn't flash in after the fetch. */
export function applyCachedTheme() {
  let cachedTheme: string | null = null;
  try {
    cachedTheme = localStorage.getItem(CACHE_KEY);
    choices = readChoices(localStorage.getItem(CHOICES_CACHE_KEY) ?? '[]');
    local = parseLocalTheme(localStorage.getItem(LOCAL_THEME_KEY));
  } catch {
    // storage blocked: nothing cached
  }
  saved = (cachedTheme !== null && readTheme(cachedTheme)) || DEFAULT_THEME;
  // painting the default would only swap to the real look a moment later; a local theme is the look here already
  if (cachedTheme === null && !local) {
    document.documentElement.dataset.nebulaPending = '';
    pendingTimer = window.setTimeout(reveal, PENDING_MS);
  }
  repaint();
}

/**
 * Fetches the site theme, never a user's pick, and the version of it the server holds (the editor's save sends it
 * back so a save over someone else's is refused). The route answers 304 to the browser's revalidation.
 */
export async function loadTheme(): Promise<{ theme: NebulaTheme; version: string } | null> {
  try {
    const res = await fetch('/mint/theme', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = (await res.json()) as { theme?: unknown; version?: unknown };
    const theme = normalizeTheme(data.theme);
    rememberTheme(theme);
    return { theme, version: typeof data.version === 'string' ? data.version : '' };
  } catch {
    return null;
  } finally {
    reveal();
  }
}

export type PreviewScheme = 'light' | 'dark';

// Mantine's localStorage colour scheme manager keeps the admin's choice under this key
const SCHEME_KEY = 'mantine-color-scheme-value';
const SCHEME_ATTR = 'data-mantine-color-scheme';
let previewScheme: PreviewScheme | null = null;

/** The editor renders the panel in an iframe and streams drafts into it, with the scheme to show them in. */
export function sendPreview(frame: HTMLIFrameElement | null, theme: NebulaTheme, scheme: PreviewScheme) {
  frame?.contentWindow?.postMessage({ type: PREVIEW_MSG, theme, scheme }, window.location.origin);
}

/**
 * Keeps the preview frame in the scheme the editor asked for. The attribute repaints the CSS; the storage
 * event is Mantine's own cross-tab sync, which moves its React state too (terminal colours, logos).
 */
function holdScheme() {
  const root = document.documentElement;
  if (!previewScheme || root.getAttribute(SCHEME_ATTR) === previewScheme) return;
  root.setAttribute(SCHEME_ATTR, previewScheme);
  window.dispatchEvent(
    new StorageEvent('storage', { key: SCHEME_KEY, newValue: previewScheme, storageArea: localStorage }),
  );
}

export function listenForPreview() {
  if (window.parent === window) return;
  // the editor's preview shows the site theme until its draft arrives, never the admin's own pick
  holdSiteTheme();

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const msg = event.data as { type?: string; theme?: unknown; scheme?: unknown } | null;
    if (msg?.type !== PREVIEW_MSG) return;

    previewing = true;
    applyTheme(normalizeTheme(msg.theme));
    if (msg.scheme === 'light' || msg.scheme === 'dark') {
      previewScheme = msg.scheme;
      holdScheme();
    }
  });

  // the frame shares localStorage with the editor: Mantine persists every scheme change, and a preview's
  // scheme must never become the admin's own
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    if (previewScheme && key === SCHEME_KEY) return;
    setItem.call(this, key, value);
  };
  // Mantine sets the attribute again when it mounts, when the OS scheme flips on 'auto' and from other tabs
  new MutationObserver(holdScheme).observe(document.documentElement, { attributeFilter: [SCHEME_ATTR] });

  // the panel initialises extensions after its settings request, so the editor waits for this before sending
  window.parent.postMessage({ type: READY_MSG }, window.location.origin);
}
