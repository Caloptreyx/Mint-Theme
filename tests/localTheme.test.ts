// 'Apply in this browser': a theme kept in localStorage that stands in for the saved site theme in one browser.
// Anything on the origin can write localStorage, so what is read back goes through normalizeTheme() like the
// public theme route's answer, and a user's pick still lays its look over it.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { normalizeChoices } from '../frontend/src/lib/library.ts';
import { paintedTheme, parseLocalTheme } from '../frontend/src/lib/localTheme.ts';
import { DEFAULT_THEME, normalizeTheme } from '../frontend/src/lib/theme.ts';

const ID_A = '00000000-0000-4000-8000-00000000000a';

const SAVED = normalizeTheme({ accent: '#112233', radius: 4, loginLogo: '/saved.png' });
const LOCAL = normalizeTheme({ accent: '#445566', homeBanner: '/local-banner.png', loginLogo: '/local.png' });
const choices = normalizeChoices({
  custom: [{ id: ID_A, name: 'Ocean', theme: { accent: '#abcdef', loginLogo: '/x.png' } }],
});

describe('parseLocalTheme', () => {
  test('reads a stored theme back normalized', () => {
    assert.deepEqual(parseLocalTheme(JSON.stringify(LOCAL)), LOCAL);
  });

  test('nothing stored, broken JSON or a non object is no local theme', () => {
    assert.equal(parseLocalTheme(null), null);
    assert.equal(parseLocalTheme(''), null);
    assert.equal(parseLocalTheme('{broken'), null);
    assert.equal(parseLocalTheme('null'), null);
    assert.equal(parseLocalTheme('[1,2]'), null);
    assert.equal(parseLocalTheme('"#ffffff"'), null);
  });

  test('unsafe values written by anything else are dropped', () => {
    const theme = parseLocalTheme(
      JSON.stringify({
        accent: 'red;}body{display:none',
        loginBackground: "javascript:alert('x')",
        homeBanner: '/ok.png',
        unknown: 'kept?',
      }),
    );
    assert.ok(theme);
    assert.equal(theme.accent, DEFAULT_THEME.accent);
    assert.equal(theme.loginBackground, DEFAULT_THEME.loginBackground);
    assert.equal(theme.homeBanner, '/ok.png');
    assert.equal('unknown' in theme, false);
  });
});

describe('paintedTheme', () => {
  test('the saved theme without a local one or a pick', () => {
    assert.equal(paintedTheme(SAVED, null, choices, ''), SAVED);
  });

  test('a local theme stands in for the saved one', () => {
    assert.equal(paintedTheme(SAVED, LOCAL, choices, ''), LOCAL);
  });

  test("a user's pick lays its look over the local theme, which keeps the rest", () => {
    const shown = paintedTheme(SAVED, LOCAL, choices, ID_A);
    assert.equal(shown.accent, '#abcdef');
    assert.equal(shown.homeBanner, '/local-banner.png');
    assert.equal(shown.loginLogo, '/local.png');
  });

  test('a pick no longer offered shows the local theme', () => {
    assert.equal(paintedTheme(SAVED, LOCAL, choices, 'gone'), LOCAL);
    assert.equal(paintedTheme(SAVED, null, choices, 'gone'), SAVED);
  });
});
