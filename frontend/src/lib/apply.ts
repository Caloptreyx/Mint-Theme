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

/** The theme on screen right now, so pages like Home re-render when the editor previews a draft. */
export const useNebulaTheme = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );

function applyTheme(theme: NebulaTheme) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildCss(theme);
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

/** The editor renders the panel in an iframe and streams drafts into it. */
export function sendPreview(frame: HTMLIFrameElement | null, theme: NebulaTheme) {
  frame?.contentWindow?.postMessage({ type: PREVIEW_MSG, theme }, window.location.origin);
}

export function listenForPreview() {
  if (window.parent === window) return;

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const msg = event.data as { type?: string; theme?: unknown } | null;
    if (msg?.type !== PREVIEW_MSG) return;

    previewing = true;
    applyTheme(normalizeTheme(msg.theme));
  });

  // the panel initialises extensions after its settings request, so the editor waits for this before sending
  window.parent.postMessage({ type: READY_MSG }, window.location.origin);
}
