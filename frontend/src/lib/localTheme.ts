import { resolveUserTheme, type ThemeChoice } from './library.ts';
import { type NebulaTheme, normalizeTheme } from './theme.ts';

/** Where 'Apply in this browser' keeps the editor's draft; only this browser paints it. */
export const LOCAL_THEME_KEY = 'nebula:local-theme';

/**
 * The theme this browser shows in place of the site theme, or null when there is none or it can't be read.
 * Anything on the origin can write localStorage, so the value goes through normalizeTheme() on every read.
 */
export function parseLocalTheme(json: string | null): NebulaTheme | null {
  if (json === null) return null;
  try {
    const raw: unknown = JSON.parse(json);
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? normalizeTheme(raw) : null;
  } catch {
    return null;
  }
}

/**
 * The theme a browser paints: the applied local theme stands in for the saved site theme, and the user's pick
 * (`pick`, '' for none or while the site theme is held) is laid over whichever of the two that is.
 */
export function paintedTheme(
  saved: NebulaTheme,
  local: NebulaTheme | null,
  choices: ThemeChoice[],
  pick: string,
): NebulaTheme {
  const site = local ?? saved;
  return resolveUserTheme(site, choices, pick) ?? site;
}
