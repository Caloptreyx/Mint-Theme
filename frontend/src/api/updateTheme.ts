import { axiosInstance } from '../lib/core.ts';
import type { NebulaTheme } from '../lib/theme.ts';

/**
 * Stores the site theme (`null` resets it). With `base`, the backend refuses (409) when the stored theme is no
 * longer that version, so a save never silently replaces someone else's. Resolves to the new version.
 */
export default async (theme: NebulaTheme | null, base?: string): Promise<{ version: string }> => {
  const { data } = await axiosInstance.put('/api/admin/extensions/dev.caloptreyx.mint/theme', {
    theme,
    ...(base !== undefined ? { base } : {}),
  });
  const version = (data as { version?: unknown } | null)?.version;
  return { version: typeof version === 'string' ? version : '' };
};
