import { SERVER_LIST_VIEWS, type ServerListView } from './theme.ts';

export const SERVER_VIEW_STORAGE_KEY = 'nebula:server-view';

/** Parses a browser-stored server list view choice; anything else falls back to the theme's default. */
export function parseServerListView(raw: string | null | undefined): ServerListView | null {
  return SERVER_LIST_VIEWS.find((view) => view === raw) ?? null;
}

/**
 * Picks which view the servers list renders:
 * - Outside the Theme Editor preview: an explicit user choice stored in the browser wins, else `themeView`.
 * - Inside the Theme Editor preview: ignores browser storage so `themeView` and live preview hints (such as forcing
 *   Grid view while picking a card style) always show immediately.
 */
export function resolveServerListView(options: {
  themeView: ServerListView;
  inPreview: boolean;
  storedView: ServerListView | null;
  previewHint: ServerListView | null;
  iframeOverride?: ServerListView | null;
}): ServerListView {
  if (options.inPreview) {
    return options.iframeOverride ?? options.previewHint ?? options.themeView;
  }
  return options.storedView ?? options.themeView;
}
