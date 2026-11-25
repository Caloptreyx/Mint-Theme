import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  clearStaleThemeVariant,
  DEFAULT_THEME_VARIANT,
  disablePanelThemeVariants,
  THEME_VARIANT_ATTR,
} from '../frontend/src/lib/themeVariant.ts';

function fakeRoot(initial: string | null) {
  const attrs = new Map<string, string>();
  if (initial !== null) attrs.set(THEME_VARIANT_ATTR, initial);
  return {
    attrs,
    getAttribute: (name: string) => attrs.get(name) ?? null,
    removeAttribute: (name: string) => {
      attrs.delete(name);
    },
  };
}

describe('disablePanelThemeVariants', () => {
  test('calls themes.disableVariants with the themes registry bound when present (panel 1.2.11+)', () => {
    let called = false;
    const registry = {
      themes: {
        variantsDisabled: false,
        disableVariants() {
          called = true;
          this.variantsDisabled = true;
        },
      },
    };
    assert.equal(disablePanelThemeVariants(registry), true);
    assert.equal(called, true);
    assert.equal(registry.themes.variantsDisabled, true);
  });

  test('is a safe no-op when themes or disableVariants is absent (panel 1.2.0-1.2.10)', () => {
    assert.equal(disablePanelThemeVariants(null), false);
    assert.equal(disablePanelThemeVariants(undefined), false);
    assert.equal(disablePanelThemeVariants({}), false);
    assert.equal(disablePanelThemeVariants({ themes: {} }), false);
  });
});

describe('clearStaleThemeVariant', () => {
  test('removes non-standard variants such as pure-black', () => {
    const root = fakeRoot('pure-black');
    assert.equal(clearStaleThemeVariant(root), true);
    assert.equal(root.getAttribute(THEME_VARIANT_ATTR), null);
  });

  test('leaves standard or absent variants alone', () => {
    const standard = fakeRoot(DEFAULT_THEME_VARIANT);
    assert.equal(clearStaleThemeVariant(standard), false);
    assert.equal(standard.getAttribute(THEME_VARIANT_ATTR), DEFAULT_THEME_VARIANT);

    const absent = fakeRoot(null);
    assert.equal(clearStaleThemeVariant(absent), false);
    assert.equal(absent.getAttribute(THEME_VARIANT_ATTR), null);
  });
});
