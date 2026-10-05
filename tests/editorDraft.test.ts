// The editor's checks on the raw draft: colours typed in other notations, URLs normalizeTheme() would drop and
// imports that are not a theme.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { invalidUrls, isThemeFile, toHexColor } from '../frontend/src/lib/editorDraft.ts';
import { DEFAULT_THEME } from '../frontend/src/lib/theme.ts';

describe('toHexColor', () => {
  test('hex in any length Mantine accepts becomes lowercase #rrggbb', () => {
    assert.equal(toHexColor('#FFF'), '#ffffff');
    assert.equal(toHexColor('abc'), '#aabbcc');
    assert.equal(toHexColor('ff0000'), '#ff0000');
    assert.equal(toHexColor('#11223344'), '#112233');
    assert.equal(toHexColor('#1234'), '#112233');
  });

  test('rgb() and hsl() convert, alpha is dropped', () => {
    assert.equal(toHexColor('rgb(255, 0, 0)'), '#ff0000');
    assert.equal(toHexColor('rgba(0, 128, 255, 0.5)'), '#0080ff');
    assert.equal(toHexColor('rgb(100%, 0%, 0%)'), '#ff0000');
    assert.equal(toHexColor('hsl(120, 100%, 50%)'), '#00ff00');
    assert.equal(toHexColor('hsl(0 0% 100%)'), '#ffffff');
  });

  test('incomplete or foreign values are not colours', () => {
    for (const value of ['', '#ab', '#abcde', 'red', 'rgb(1, 2)', 'rgb(a, b, c)', '#ggg']) {
      assert.equal(toHexColor(value), null, value);
    }
  });
});

describe('invalidUrls', () => {
  test('empty and safe URLs pass, anywhere in the draft', () => {
    assert.deepEqual(invalidUrls({ ...DEFAULT_THEME, backgroundImage: 'https://x.y/a.png', favicon: '/icon.png' }), []);
  });

  test('finds what normalizeTheme would refuse, in nested fields too', () => {
    const theme = {
      ...DEFAULT_THEME,
      backgroundImage: 'example.com/bg.png',
      articles: [{ title: 'a', description: '', url: 'https://x.y/a(1)' }],
      supportLinks: [{ label: 'b', url: '//evil.example' }],
      eggs: { '00000000-0000-0000-0000-000000000000': { banner: 'javascript:alert(1)', icon: '' } },
    };
    assert.deepEqual(invalidUrls(theme), [
      'example.com/bg.png',
      'https://x.y/a(1)',
      '//evil.example',
      'javascript:alert(1)',
    ]);
  });
});

describe('isThemeFile', () => {
  test('needs an object with at least one theme field', () => {
    assert.equal(isThemeFile({ accent: '#123456' }), true);
    assert.equal(isThemeFile({ name: 'package', version: '1.0.0' }), false);
    assert.equal(isThemeFile({}), false);
    assert.equal(isThemeFile([{ accent: '#123456' }]), false);
    assert.equal(isThemeFile(null), false);
  });
});
