import { axiosInstance } from '../lib/core.ts';
import { normalizeHistory, normalizeLibrary, type PresetLibrary, type ThemeHistory } from '../lib/library.ts';
import type { NebulaTheme } from '../lib/theme.ts';

const PRESETS = '/api/admin/extensions/dev.caloptreyx.mint/presets';

// every call resolves to the whole library as stored, so the editor never has to merge
const library = (request: Promise<{ data: unknown }>) => request.then(({ data }) => normalizeLibrary(data));

export const getPresets = (): Promise<PresetLibrary> => library(axiosInstance.get(PRESETS));

export const createPreset = (name: string, theme: NebulaTheme): Promise<PresetLibrary> =>
  library(axiosInstance.post(PRESETS, { name, theme }));

/** `id` is a custom preset's uuid (name, toggle and theme) or a built-in preset's id (toggle only). */
export const updatePreset = (
  id: string,
  patch: { name?: string; users?: boolean; theme?: NebulaTheme },
): Promise<PresetLibrary> => library(axiosInstance.patch(`${PRESETS}/${encodeURIComponent(id)}`, patch));

export const deletePreset = (id: string): Promise<PresetLibrary> =>
  library(axiosInstance.delete(`${PRESETS}/${encodeURIComponent(id)}`));

export const getThemeHistory = (): Promise<ThemeHistory> =>
  axiosInstance.get('/api/admin/extensions/dev.caloptreyx.mint/history').then(({ data }) => normalizeHistory(data));
