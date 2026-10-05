import { useAdminCan } from './core.ts';

/** Mint's admin permission (`backend/src/permissions.rs`): saving the theme and managing presets, nothing else. */
export const THEME_UPDATE_PERMISSION = 'mint-theme.update';

/**
 * Whether the signed in user may save the theme and change presets: admins, and roles holding `settings.update` or
 * `mint-theme.update`, the backend's checks for those routes.
 */
export const useCanSaveTheme = () => useAdminCan(['settings.update', THEME_UPDATE_PERMISSION]);
