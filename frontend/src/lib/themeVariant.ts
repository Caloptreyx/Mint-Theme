export const THEME_VARIANT_ATTR = 'data-theme-variant';
export const DEFAULT_THEME_VARIANT = 'standard';

/**
 * Disables Calagopus Panel 1.2.11+'s theme variants (such as Pure Black) so core CSS does not clobber Mint's dark
 * palette and hides the variant picker. Safe no-op on panel 1.2.0-1.2.10 where `themes` does not exist.
 */
export function disablePanelThemeVariants(registry: unknown): boolean {
  const themes = (registry as { themes?: { disableVariants?: () => unknown } } | null | undefined)?.themes;
  if (typeof themes?.disableVariants !== 'function') return false;
  themes.disableVariants();
  return true;
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
