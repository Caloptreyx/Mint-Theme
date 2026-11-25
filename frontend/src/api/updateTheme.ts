import type { NebulaTheme } from '../lib/theme.ts';
import { axiosInstance } from '../lib/core.ts';

/**
 * Stores the site theme (`null` resets it). With `base`, the backend refuses (409) when the stored theme is no
 * longer that version, so a save never silently replaces someone else's. Resolves to the new version.
 */
export default async (
  theme: NebulaTheme | null,
  base?: string,
): Promise<{ version: string; emailSyncFailed: boolean }> => {
  const { data } = await axiosInstance.put('/api/admin/extensions/dev.caloptreyx.mint/theme', {
    theme,
    ...(base !== undefined ? { base } : {}),
  });
  const record = data as { version?: unknown; email_sync_failed?: unknown } | null;
  return {
    version: typeof record?.version === 'string' ? record.version : '',
    emailSyncFailed: record?.email_sync_failed === true,
  };
};
