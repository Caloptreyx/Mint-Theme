import { type NebulaTheme, normalizeTheme, PRESETS, pickUserTheme, withUserTheme } from './theme.ts';

/** The backend's limits (`backend/src/presets.rs`). */
export const PRESET_NAME_MAX = 40;
export const MAX_CUSTOM_PRESETS = 20;
/** Synced per user by core; '' (or anything no longer offered) is the panel's own theme. */
export const THEME_CHOICE_KEY = 'nebula::theme_choice';

/** Built-in presets live only here, the backend knows them by this slug of the name. */
export const builtinId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export interface CustomPreset {
  id: string;
  name: string;
  theme: NebulaTheme;
  users: boolean;
}

export interface PresetLibrary {
  custom: CustomPreset[];
  /** Ids of the built-in presets users can pick. */
  builtin: string[];
}

/** A preset a user can pick: `theme` holds only the fields it lays over the site theme. */
export interface ThemeChoice {
  id: string;
  name: string;
  theme: Partial<NebulaTheme>;
}

export interface HistoryEntry {
  /** Unix milliseconds; null for a theme saved before the history existed. */
  at: number | null;
  user: string | null;
  theme: NebulaTheme;
}

export interface ThemeHistory {
  current: { at: number; user: string } | null;
  entries: HistoryEntry[];
}

/** `null` when the name is fine, otherwise what is wrong with it (the backend checks the same). */
export function presetNameProblem(value: string): 'empty' | 'long' | 'control' | null {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  if ([...trimmed].length > PRESET_NAME_MAX) return 'long';
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what is refused
  if (/[\u0000-\u001f\u007f-\u009f]/.test(trimmed)) return 'control';
  return null;
}

function customPresets(v: unknown): CustomPreset[] {
  if (!Array.isArray(v)) return [];
  const out: CustomPreset[] = [];
  for (const raw of v.slice(0, MAX_CUSTOM_PRESETS)) {
    const r = record(raw);
    if (!r || typeof r.id !== 'string' || !UUID.test(r.id) || out.some((p) => p.id === r.id)) continue;
    // code points, as the backend and presetNameProblem count them; a UTF-16 cut could split an emoji
    const label = typeof r.name === 'string' ? [...r.name.trim()].slice(0, PRESET_NAME_MAX).join('') : '';
    if (!label || !record(r.theme)) continue;
    out.push({ id: r.id, name: label, theme: normalizeTheme(r.theme), users: r.users === true });
  }
  return out;
}

const builtinIds = (v: unknown) => {
  const known = PRESETS.map((preset) => builtinId(preset.name));
  return Array.isArray(v) ? known.filter((id) => v.includes(id)) : [];
};

/** The admin's view (`GET .../presets`): built-in ids unknown to this version are dropped. */
export function normalizeLibrary(raw: unknown): PresetLibrary {
  const r = record(raw) ?? {};
  return { custom: customPresets(r.custom), builtin: builtinIds(r.builtin) };
}

/** The `choices` of `GET /api/client/.../theme-choices`, built-in ones first in their usual order. */
export function normalizeChoices(raw: unknown): ThemeChoice[] {
  const r = record(raw) ?? {};
  const builtin = builtinIds(r.builtin).map((id) => {
    const preset = PRESETS.find((p) => builtinId(p.name) === id) as (typeof PRESETS)[number];
    return { id, name: preset.name, theme: pickUserTheme(preset.theme) };
  });
  const custom = customPresets(r.custom).map(({ id, name, theme }) => ({ id, name, theme: pickUserTheme(theme) }));
  return [...builtin, ...custom];
}

/** The theme to show a user who picked `id`, or null for the site theme (no pick, or no longer offered). */
export function resolveUserTheme(site: NebulaTheme, choices: ThemeChoice[], id: unknown): NebulaTheme | null {
  if (typeof id !== 'string' || !id) return null;
  const choice = choices.find((c) => c.id === id);
  return choice ? withUserTheme(site, choice.theme) : null;
}

export function normalizeHistory(raw: unknown): ThemeHistory {
  const r = record(raw) ?? {};
  const current = record(r.current);
  const entries: HistoryEntry[] = [];
  for (const entry of Array.isArray(r.entries) ? r.entries : []) {
    const e = record(entry);
    if (!e || !record(e.theme)) continue;
    entries.push({
      at: typeof e.at === 'number' && Number.isFinite(e.at) ? e.at : null,
      user: typeof e.user === 'string' ? e.user : null,
      theme: normalizeTheme(e.theme),
    });
  }
  return {
    current:
      current && typeof current.at === 'number' && typeof current.user === 'string'
        ? { at: current.at, user: current.user }
        : null,
    entries,
  };
}
