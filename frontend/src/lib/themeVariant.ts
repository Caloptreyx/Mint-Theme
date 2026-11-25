export const THEME_VARIANT_ATTR = 'data-theme-variant';
export const DEFAULT_THEME_VARIANT = 'standard';
export const THEME_VARIANT_STORAGE_KEY = 'theme_variant';

interface PanelThemesRegistry {
  variantsDisabled?: boolean;
  disableVariants?: () => unknown;
}

type StorageLike = Pick<Storage, 'getItem' | 'removeItem'>;

/**
 * Syncs Calagopus Panel 1.2.11+'s theme variant registry with Mint's `allowPureBlack` setting.
 * Off disables variants so core CSS does not clobber Mint's dark palette and hides the variant picker;
 * on re-enables variants so the sidebar theme menu offers Pure Black again.
 * Safe no-op (returns `false`) on panel 1.2.0-1.2.10 where `registry.themes` does not exist.
 */
export function syncPanelThemeVariants(registry: unknown, allowPureBlack: boolean): boolean {
  const themes = (registry as { themes?: PanelThemesRegistry } | null | undefined)?.themes;
  if (!themes || typeof themes !== 'object') return false;
  if (!allowPureBlack) {
    if (typeof themes.disableVariants === 'function') {
      themes.disableVariants();
      return true;
    }
    if (typeof themes.variantsDisabled === 'boolean') {
      themes.variantsDisabled = true;
      return true;
    }
    return false;
  }
  if (typeof themes.variantsDisabled !== 'boolean') return false;
  themes.variantsDisabled = false;
  return true;
}

/** Disables Calagopus Panel 1.2.11+'s theme variants. Safe no-op on panel 1.2.0-1.2.10. */
export function disablePanelThemeVariants(registry: unknown): boolean {
  return syncPanelThemeVariants(registry, false);
}

/**
 * Removes any non-standard panel 1.2.11+ `data-theme-variant` attribute (for example `pure-black`, seeded by
 * `themeBoot.js` from an earlier localStorage selection) so Mint paints cleanly before `registerThemeVariant()` runs.
 */
export function clearStaleThemeVariant(root: Pick<Element, 'getAttribute' | 'removeAttribute'>): boolean {
  const variant = root.getAttribute(THEME_VARIANT_ATTR);
  if (!variant || variant === DEFAULT_THEME_VARIANT) return false;
  root.removeAttribute(THEME_VARIANT_ATTR);
  return true;
}

/**
 * Resets a non-standard stored `theme_variant` (such as `pure-black`) and notifies panel 1.2.11+'s
 * `useThemeVariantStore` via a synthetic `storage` event so the active variant updates in-tab immediately.
 */
export function clearStoredThemeVariant(storage?: StorageLike | null, notify?: (key: string) => void): boolean {
  let store: StorageLike | null;
  if (storage !== undefined) {
    store = storage;
  } else {
    try {
      store = typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return false;
    }
  }
  if (!store) return false;

  let stored: string | null = null;
  try {
    stored = store.getItem(THEME_VARIANT_STORAGE_KEY);
  } catch {
    return false;
  }
  if (!stored || stored === DEFAULT_THEME_VARIANT) return false;

  try {
    store.removeItem(THEME_VARIANT_STORAGE_KEY);
  } catch {
    return false;
  }

  if (notify) {
    notify(THEME_VARIANT_STORAGE_KEY);
  } else if (typeof window !== 'undefined' && typeof StorageEvent !== 'undefined') {
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_VARIANT_STORAGE_KEY, newValue: null }));
    } catch {
      // environments where synthetic StorageEvent construction is unsupported
    }
  }
  return true;
}
