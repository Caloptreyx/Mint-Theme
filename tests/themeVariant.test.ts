import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  clearStaleThemeVariant,
  clearStoredThemeVariant,
  DEFAULT_THEME_VARIANT,
  disablePanelThemeVariants,
  syncPanelThemeVariants,
  THEME_VARIANT_ATTR,
  THEME_VARIANT_STORAGE_KEY,
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

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe('syncPanelThemeVariants', () => {
  test('disables variants via disableVariants when allowPureBlack is false (panel 1.2.11+)', () => {
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
    assert.equal(syncPanelThemeVariants(registry, false), true);
    assert.equal(called, true);
    assert.equal(registry.themes.variantsDisabled, true);
  });

  test('re-enables variants by setting variantsDisabled to false when allowPureBlack is true', () => {
    const registry = {
      themes: {
        variantsDisabled: true,
        disableVariants() {
          this.variantsDisabled = true;
        },
      },
    };
    assert.equal(syncPanelThemeVariants(registry, true), true);
    assert.equal(registry.themes.variantsDisabled, false);
    assert.equal(syncPanelThemeVariants(registry, false), true);
    assert.equal(registry.themes.variantsDisabled, true);
  });

  test('is a safe no-op when themes registry is absent or incomplete (panel 1.2.0-1.2.10)', () => {
    for (const allow of [false, true]) {
      assert.equal(syncPanelThemeVariants(null, allow), false);
      assert.equal(syncPanelThemeVariants(undefined, allow), false);
      assert.equal(syncPanelThemeVariants({}, allow), false);
      assert.equal(syncPanelThemeVariants({ themes: {} }, allow), false);
    }
  });
});

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

describe('clearStoredThemeVariant', () => {
  test('removes a non-standard stored variant and notifies listeners', () => {
    const storage = fakeStorage({ [THEME_VARIANT_STORAGE_KEY]: 'pure-black' });
    const notified: string[] = [];
    assert.equal(clearStoredThemeVariant(storage, (key) => notified.push(key)), true);
    assert.equal(storage.getItem(THEME_VARIANT_STORAGE_KEY), null);
    assert.deepEqual(notified, [THEME_VARIANT_STORAGE_KEY]);
  });

  test('leaves standard or absent stored variants alone without notifying', () => {
    const standard = fakeStorage({ [THEME_VARIANT_STORAGE_KEY]: DEFAULT_THEME_VARIANT });
    const notified: string[] = [];
    assert.equal(clearStoredThemeVariant(standard, (key) => notified.push(key)), false);
    assert.equal(standard.getItem(THEME_VARIANT_STORAGE_KEY), DEFAULT_THEME_VARIANT);

    const absent = fakeStorage();
    assert.equal(clearStoredThemeVariant(absent, (key) => notified.push(key)), false);
    assert.deepEqual(notified, []);
  });

  test('handles missing or throwing storage gracefully', () => {
    assert.equal(clearStoredThemeVariant(null), false);
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    assert.equal(clearStoredThemeVariant(throwing), false);
  });
});
