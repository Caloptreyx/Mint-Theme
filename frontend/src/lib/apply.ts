import { useSyncExternalStore } from 'react';
import { buildCss, DEFAULT_THEME, type NebulaTheme, normalizeTheme } from './theme.ts';

const STYLE_ID = 'nebula-theme';
const CACHE_KEY = 'nebula:theme';
const PREVIEW_MSG = 'nebula:preview';
export const READY_MSG = 'nebula:ready';

let saved: NebulaTheme = DEFAULT_THEME;
let current: NebulaTheme = DEFAULT_THEME;
let previewing = false;
const listeners = new Set<() => void>();

export const savedTheme = () => saved;

/** The theme on screen right now, a draft included while the editor previews one. */
export const currentTheme = () => current;

export const subscribeTheme = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** So pages like Home re-render when the editor previews a draft. */
export const useNebulaTheme = () => useSyncExternalStore(subscribeTheme, currentTheme);

function applyTheme(theme: NebulaTheme) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildCss(theme);
  // the layout names for static CSS to key off (the menu styles' rail tweaks); buildCss scopes its own rules
  document.documentElement.dataset.nebulaLayout = theme.sidebarLayout;
  document.documentElement.dataset.nebulaDock = theme.dockPosition;
  current = theme;
  for (const listener of listeners) listener();
}

export function rememberTheme(theme: NebulaTheme) {
  saved = theme;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
  } catch {
    // private mode or full storage, the next load just flashes the default once
  }
  if (!previewing) applyTheme(theme);
}

/** Paints the last known theme right away so a custom look doesn't flash in after the fetch. */
export function applyCachedTheme() {
  try {
    saved = normalizeTheme(JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null'));
  } catch {
    saved = DEFAULT_THEME;
  }
  applyTheme(saved);
}

export async function loadTheme(): Promise<NebulaTheme | null> {
  try {
    const res = await fetch('/nebula/theme', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = (await res.json()) as { theme?: unknown };
    const theme = normalizeTheme(data.theme);
    rememberTheme(theme);
    return theme;
  } catch {
    return null;
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
