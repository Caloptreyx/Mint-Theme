import {
  type NebulaTheme,
  SERVER_CARD_STYLES,
  SERVER_LIST_VIEWS,
  type ServerCardStyle,
  type ServerListView,
} from './theme.ts';

export const SERVER_VIEW_STORAGE_KEY = 'nebula:server-view';

export type ServerListChoice = 'table' | ServerCardStyle;

export const SERVER_LIST_CHOICES: readonly ServerListChoice[] = ['table', ...SERVER_CARD_STYLES];

/** Parses a browser-stored server list view choice; anything else falls back to the theme's default. */
export function parseServerListView(raw: string | null | undefined): ServerListView | null {
  return SERVER_LIST_VIEWS.find((view) => view === raw) ?? null;
}

/** Value for the editor's unified servers list layout picker. */
export function serverListChoiceOf(theme: Pick<NebulaTheme, 'serverListView' | 'serverCardStyle'>): ServerListChoice {
  return theme.serverListView === 'list' ? 'table' : theme.serverCardStyle;
}

/** Patch applied when the admin picks a layout in the unified servers list picker. */
export function patchForServerListChoice(choice: ServerListChoice): Partial<NebulaTheme> {
  return choice === 'table' ? { serverListView: 'list' } : { serverListView: 'grid', serverCardStyle: choice };
}

/**
 * Picks which view the servers list renders:
 * - Outside the Theme Editor preview: an explicit user choice stored in the browser wins, else `themeView`.
 * - Inside the Theme Editor preview: ignores browser storage so `themeView` shows immediately, unless the admin
 *   temporarily toggled the view inside the iframe (`iframeOverride`).
 */
export function resolveServerListView(options: {
  themeView: ServerListView;
  inPreview: boolean;
  storedView: ServerListView | null;
  iframeOverride?: ServerListView | null;
}): ServerListView {
  if (options.inPreview) {
    return options.iframeOverride ?? options.themeView;
  }
  return options.storedView ?? options.themeView;
}
