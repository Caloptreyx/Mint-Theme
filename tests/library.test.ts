// Custom presets, users' own theme choice and the saved theme history: everything the public theme route
// hands to every visitor is re-checked here before it is painted, and a user's pick must never touch
// the site's content or auth pages.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  builtinId,
  MAX_CUSTOM_PRESETS,
  normalizeChoices,
  normalizeHistory,
  normalizeLibrary,
  PRESET_NAME_MAX,
  presetNameProblem,
  resolveUserTheme,
} from '../frontend/src/lib/library.ts';
import {
  DEFAULT_THEME,
  type NebulaTheme,
  normalizeTheme,
  PRESETS,
  pickUserTheme,
  USER_THEME_FIELDS,
  withUserTheme,
} from '../frontend/src/lib/theme.ts';

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';

const SITE: NebulaTheme = normalizeTheme({
  accent: '#112233',
  font: 'outfit',
  radius: 4,
  homeBanner: '/banner.png',
  articles: [{ title: 'Rules', description: '', url: '/rules' }],
  loginBackground: '/login.png',
  loginLogo: '/logo.png',
  authLayout: 'sideBanner',
  supportLinks: [{ label: 'Discord', url: 'https://discord.gg/x' }],
});

describe('user theme fields', () => {
  test('content, layouts and auth pages stay site wide', () => {
    const siteWide = Object.keys(DEFAULT_THEME).filter(
      (key) =>
        ['homeBanner', 'articles', 'eggs', 'serverHome', 'layout', 'consoleLayout', 'supportLinks', 'favicon'].includes(key) ||
        key.startsWith('login') ||
        key.startsWith('auth') ||
        key.startsWith('supportLinks') ||
        key.startsWith('terminal') ||
        key.startsWith('console') ||
        ['chartStyle', 'chartHeight', 'chartArrangement'].includes(key),
    );
    assert.ok(siteWide.length >= 10);
    for (const key of siteWide) assert.ok(!USER_THEME_FIELDS.includes(key as keyof NebulaTheme), key);
  });

  test('every listed field is a theme field', () => {
    for (const key of USER_THEME_FIELDS) assert.ok(key in DEFAULT_THEME, key);
    assert.equal(new Set(USER_THEME_FIELDS).size, USER_THEME_FIELDS.length);
  });

  test('a preset replaces the look and nothing else', () => {
    const preset = normalizeTheme({
      accent: '#abcdef',
      font: 'space',
      radius: 20,
      sidebarLayout: 'pill',
      homeBanner: '/other.png',
      articles: [],
      loginLogo: '/other-logo.png',
      authLayout: 'flat',
    });
    const shown = withUserTheme(SITE, preset);
    for (const key of Object.keys(DEFAULT_THEME) as (keyof NebulaTheme)[]) {
      const expected = USER_THEME_FIELDS.includes(key) ? preset[key] : SITE[key];
      assert.deepEqual(shown[key], expected, key);
    }
    assert.equal(shown.accent, '#abcdef');
    assert.equal(shown.homeBanner, '/banner.png');
    assert.equal(shown.authLayout, 'sideBanner');
  });

  test('a built-in preset only brings its colours', () => {
    const shown = withUserTheme(SITE, PRESETS[0].theme);
    assert.equal(shown.accent, PRESETS[0].theme.accent);
    assert.equal(shown.font, 'outfit');
    assert.equal(shown.radius, 4);
  });

  test('invalid preset values keep the site value', () => {
    const shown = withUserTheme(SITE, {
      accent: 'red;}body{display:none',
      backgroundImage: 'javascript:alert(1)',
      radius: 'x',
      font: 'comic',
    });
    assert.equal(shown.accent, SITE.accent);
    assert.equal(shown.backgroundImage, SITE.backgroundImage);
    assert.equal(shown.radius, 4);
    assert.equal(shown.font, 'outfit');
  });

  test('pickUserTheme ignores non objects and unlisted keys', () => {
    assert.deepEqual(pickUserTheme(null), {});
    assert.deepEqual(pickUserTheme('x'), {});
    assert.deepEqual(pickUserTheme({ loginLogo: '/x.png', accent: '#000000' }), { accent: '#000000' });
  });
});

describe('builtin ids', () => {
  test('are slugs the backend accepts', () => {
    for (const preset of PRESETS) assert.match(builtinId(preset.name), /^[a-z0-9-]{1,40}$/);
    assert.equal(builtinId('  Deep Sea  2 '), 'deep-sea-2');
    assert.equal(new Set(PRESETS.map((p) => builtinId(p.name))).size, PRESETS.length);
  });
});

describe('preset names', () => {
  test('match the backend rules', () => {
    assert.equal(presetNameProblem('Ocean'), null);
    assert.equal(presetNameProblem('  Ocean  '), null);
    assert.equal(presetNameProblem(''), 'empty');
    assert.equal(presetNameProblem('   '), 'empty');
    assert.equal(presetNameProblem('é'.repeat(PRESET_NAME_MAX)), null);
    assert.equal(presetNameProblem('é'.repeat(PRESET_NAME_MAX + 1)), 'long');
    assert.equal(presetNameProblem('a\nb'), 'control');
    assert.equal(presetNameProblem('a\u0085b'), 'control');
  });
});

describe('library', () => {
  test('non objects are an empty library', () => {
    for (const raw of [null, undefined, 'x', 1, []]) assert.deepEqual(normalizeLibrary(raw), { custom: [], builtin: [] });
  });

  test('keeps valid presets, normalizes their themes and drops the rest', () => {
    const library = normalizeLibrary({
      custom: [
        { id: ID_A, name: ' Ocean ', theme: { accent: '#ABCDEF', backgroundImage: 'javascript:x' }, users: true },
        { id: ID_A, name: 'Duplicate', theme: {} },
        { id: 'nope', name: 'Bad id', theme: {} },
        { id: ID_B, name: '', theme: {} },
        { id: ID_B, name: 'List', theme: [1] },
        { id: ID_B, name: 'Flag', theme: {}, users: 'yes' },
      ],
      builtin: ['mint', 'unknown', 'ember', 3],
    });
    assert.deepEqual(
      library.custom.map((p) => [p.name, p.users]),
      [
        ['Ocean', true],
        ['Flag', false],
      ],
    );
    assert.equal(library.custom[0].theme.accent, '#abcdef');
    assert.equal(library.custom[0].theme.backgroundImage, '');
    assert.deepEqual(library.builtin, ['mint', 'ember']);
  });

  test('names are cut by code points, as the backend counts them', () => {
    // 26 code points, 46 UTF-16 units: kept whole, where a unit cut left 23 and could split an emoji
    const night = `Night ${'🌙'.repeat(20)}`;
    assert.equal(presetNameProblem(night), null);
    const named = (name: string) => normalizeLibrary({ custom: [{ id: ID_A, name, theme: {} }] }).custom[0].name;
    assert.equal(named(night), night);
    const long = named(`a${'🌙'.repeat(PRESET_NAME_MAX)}`);
    assert.equal([...long].length, PRESET_NAME_MAX);
    assert.equal(long, `a${'🌙'.repeat(PRESET_NAME_MAX - 1)}`);
  });

  test('is capped', () => {
    const custom = Array.from({ length: MAX_CUSTOM_PRESETS + 5 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      name: `P${i}`,
      theme: {},
    }));
    assert.equal(normalizeLibrary({ custom }).custom.length, MAX_CUSTOM_PRESETS);
  });
});

describe('choices', () => {
  const choices = normalizeChoices({
    builtin: ['ember', 'mint', 'gone'],
    custom: [{ id: ID_A, name: 'Ocean', theme: { accent: '#abcdef', radius: 20, loginLogo: '/x.png' } }],
  });

  test('built-in ones first in their usual order, then custom ones with only their look', () => {
    assert.deepEqual(
      choices.map((c) => c.id),
      ['mint', 'ember', ID_A],
    );
    assert.equal(choices[0].name, 'Mint');
    assert.equal(choices[2].theme.accent, '#abcdef');
    assert.equal('loginLogo' in choices[2].theme, false);
  });

  test('missing or broken choices are none, like an old install', () => {
    assert.deepEqual(normalizeChoices(undefined), []);
    assert.deepEqual(normalizeChoices({ builtin: 'mint', custom: {} }), []);
  });

  test('a pick resolves while offered and falls back to the site theme otherwise', () => {
    const shown = resolveUserTheme(SITE, choices, ID_A);
    assert.equal(shown?.accent, '#abcdef');
    assert.equal(shown?.radius, 20);
    assert.equal(shown?.loginLogo, '/logo.png');
    assert.equal(resolveUserTheme(SITE, choices, 'mint')?.accent, PRESETS[0].theme.accent);
    assert.equal(resolveUserTheme(SITE, choices, ''), null);
    assert.equal(resolveUserTheme(SITE, choices, ID_B), null);
    assert.equal(resolveUserTheme(SITE, choices, 42), null);
    assert.equal(resolveUserTheme(SITE, [], ID_A), null);
  });
});

describe('history', () => {
  test('normalizes entries and drops broken ones', () => {
    const history = normalizeHistory({
      current: { at: 30, user: 'carol' },
      entries: [
        { at: 20, user: 'bob', theme: { accent: '#ABCDEF' } },
        { at: null, user: null, theme: {} },
        { at: 10, user: 'alice', theme: [1] },
        'x',
      ],
    });
    assert.deepEqual(history.current, { at: 30, user: 'carol' });
    assert.equal(history.entries.length, 2);
    assert.equal(history.entries[0].theme.accent, '#abcdef');
    assert.deepEqual(history.entries[1], { at: null, user: null, theme: DEFAULT_THEME });
  });

  test('anything else is an empty history', () => {
    assert.deepEqual(normalizeHistory(null), { current: null, entries: [] });
    assert.deepEqual(normalizeHistory({ current: { at: 'x', user: 1 }, entries: {} }), { current: null, entries: [] });
  });
});
