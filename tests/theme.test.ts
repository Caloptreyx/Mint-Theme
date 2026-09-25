// normalizeTheme() is the security boundary between operator supplied JSON and a stylesheet served to
// every visitor. Run with `node --test "tests/*.test.ts"` (Node 24 strips the types; theme.ts has no imports).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  AUTH_LAYOUTS,
  AUTH_POSITIONS,
  BOX_STYLES,
  BUTTON_STYLES,
  buildCss,
  CLICK_EFFECTS,
  CONSOLE_WIDGETS,
  DEFAULT_CONSOLE_LAYOUT,
  DEFAULT_LAYOUT,
  DEFAULT_THEME,
  DOCK_POSITIONS,
  FONTS,
  HOME_CARDS,
  MAX_ARTICLES,
  MAX_SUPPORT_LINKS,
  MONO_FONTS,
  NAV_HOVERS,
  type NebulaTheme,
  normalizeTheme,
  PAGE_ANIMATIONS,
  PAGE_TRANSITIONS,
  PRESETS,
  SEARCH_COMPONENTS,
  SERVER_CARD_STYLES,
  SIDEBAR_LAYOUTS,
  STAT_STYLES,
  SUPPORT_LINK_ICONS,
  TABLE_STYLES,
  TOAST_STYLES,
} from '../frontend/src/lib/theme.ts';

const UUID_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const UUID_B = '7C9E6679-7425-40DE-944B-E07FC1F90AE7';

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const BASE_COLORS = ['accent', 'highlight', 'background', 'surface', 'text'] as const;
const OPTIONAL_COLORS = [
  'buttonColor',
  'buttonText',
  'surfaceRaised',
  'surfaceOverlay',
  'textMuted',
  'textFaint',
  'textOnAccent',
  'line',
  'success',
  'warning',
  'danger',
  'offline',
  'chartOne',
  'chartTwo',
] as const;
const URL_FIELDS = ['backgroundImage', 'homeBanner', 'loginBackground', 'loginLogo'] as const;

const BAD_COLORS: unknown[] = [
  '#abc',
  '#abcd',
  '#abcdef0',
  'red',
  'rgb(0,0,0)',
  '#12345g',
  'red;}',
  '#abcdef;}body{display:none',
  ' #abcdef',
  '#abcdef ',
  '#abcdef\n',
  'abcdef',
  123456,
  0xabcdef,
  null,
  true,
  ['#abcdef'],
  { toString: () => '#abcdef' },
];

const GOOD_URLS = [
  'https://example.com/bg.png',
  'http://example.com/a.jpg?x=1&y=2#frag',
  'HTTPS://EXAMPLE.COM/X.PNG',
  'https://cdn.example.com/a%20b.webp',
  '/assets/bg.webp',
  '/publicdata/nebula/banners/1.jpg?v=3',
];

const BAD_URLS: unknown[] = [
  'javascript:alert(1)',
  'JavaScript:alert(1)',
  'data:image/png;base64,iVBORw0KGgo=',
  'vbscript:msgbox(1)',
  'ftp://example.com/a.png',
  'file:///etc/passwd',
  '//evil.example/x.png',
  '/\\evil.example/x.png',
  'relative/path.png',
  './bg.png',
  'https://',
  '/',
  'https://e.com/a".png',
  "https://e.com/a'.png",
  'https://e.com/a(1).png',
  'https://e.com/a).png',
  'https://e.com/a\\.png',
  'https://e.com/a;b.png',
  'https://e.com/a{b}.png',
  'https://e.com/a}.png',
  'https://e.com/<script>',
  'https://e.com/a>b',
  'https://e.com/a b.png',
  'https://e.com/a\tb.png',
  'https://e.com/a\nb.png',
  'https://e.com/a\u2028b.png',
  ' https://e.com/a.png',
  'https://e.com/a.png ',
  'https://e.com/x");}body{background:red',
  42,
  null,
  ['https://e.com/a.png'],
];

describe('non object input', () => {
  for (const raw of [null, undefined, [], 'string', 42, true, () => {}]) {
    test(`normalizeTheme(${Array.isArray(raw) ? '[]' : typeof raw}) returns the defaults`, () => {
      assert.deepEqual(normalizeTheme(raw), DEFAULT_THEME);
    });
  }

  test('the defaults survive normalisation unchanged', () => {
    assert.deepEqual(normalizeTheme(DEFAULT_THEME), DEFAULT_THEME);
    assert.deepEqual(normalizeTheme(JSON.parse(JSON.stringify(DEFAULT_THEME))), DEFAULT_THEME);
  });

  test('every preset survives normalisation unchanged', () => {
    for (const preset of PRESETS) {
      const theme = { ...DEFAULT_THEME, ...preset.theme };
      assert.deepEqual(normalizeTheme(theme), theme, preset.name);
    }
  });
});

describe('colours', () => {
  for (const field of BASE_COLORS) {
    test(`${field}: a 6 digit hex is kept and lowercased`, () => {
      assert.equal(normalizeTheme({ [field]: '#ABCDEF' })[field], '#abcdef');
      assert.equal(normalizeTheme({ [field]: '#0a1B2c' })[field], '#0a1b2c');
    });

    test(`${field}: anything else falls back`, () => {
      for (const bad of [...BAD_COLORS, '']) {
        assert.equal(normalizeTheme({ [field]: bad })[field], DEFAULT_THEME[field], JSON.stringify(bad));
      }
    });
  }

  for (const field of OPTIONAL_COLORS) {
    test(`${field}: '' is kept, hex is lowercased, anything else falls back`, () => {
      const d = { ...DEFAULT_THEME, [field]: '#123456' };
      assert.equal(normalizeTheme({ [field]: '' }, d)[field], '');
      assert.equal(normalizeTheme({ [field]: '#FFAA00' }, d)[field], '#ffaa00');
      for (const bad of BAD_COLORS) {
        assert.equal(normalizeTheme({ [field]: bad }, d)[field], '#123456', JSON.stringify(bad));
      }
    });
  }
});

describe('urls', () => {
  for (const field of URL_FIELDS) {
    test(`${field}: http(s) and root relative urls are kept, '' clears`, () => {
      for (const good of GOOD_URLS) assert.equal(normalizeTheme({ [field]: good })[field], good);
      assert.equal(normalizeTheme({ [field]: '' }, { ...DEFAULT_THEME, [field]: '/old.png' })[field], '');
    });

    test(`${field}: unsafe urls fall back`, () => {
      const d = { ...DEFAULT_THEME, [field]: '/fallback.png' };
      for (const bad of BAD_URLS) {
        assert.equal(normalizeTheme({ [field]: bad }, d)[field], '/fallback.png', JSON.stringify(bad));
      }
    });
  }

  test('article urls are checked the same way', () => {
    const good = normalizeTheme({ articles: GOOD_URLS.map((url) => ({ title: 't', url })) }).articles;
    assert.deepEqual(
      good.map((a) => a.url),
      GOOD_URLS.slice(0, MAX_ARTICLES),
    );
    for (const bad of BAD_URLS) {
      const [article] = normalizeTheme({ articles: [{ title: 't', url: bad }] }).articles;
      assert.equal(article.url, '', JSON.stringify(bad));
    }
  });

  test('egg image urls are checked the same way', () => {
    for (const good of GOOD_URLS) {
      assert.deepEqual(normalizeTheme({ eggs: { [UUID_A]: { banner: good, icon: good } } }).eggs, {
        [UUID_A]: { banner: good, icon: good },
      });
    }
    for (const bad of BAD_URLS) {
      const eggs = normalizeTheme({ eggs: { [UUID_A]: { banner: bad, icon: '/icon.png' } } }).eggs;
      assert.deepEqual(eggs, { [UUID_A]: { banner: '', icon: '/icon.png' } }, JSON.stringify(bad));
    }
  });
});

describe('numbers', () => {
  const ranges = [
    ['radius', 0, 24],
    ['elementRadius', 0, 20],
    ['backgroundDim', 0, 100],
    ['loginDim', 0, 100],
    ['blockOpacity', 0, 100],
  ] as const;

  for (const [field, min, max] of ranges) {
    test(`${field}: clamped to ${min}..${max} and rounded`, () => {
      assert.equal(normalizeTheme({ [field]: min })[field], min);
      assert.equal(normalizeTheme({ [field]: max })[field], max);
      assert.equal(normalizeTheme({ [field]: min - 1 })[field], min);
      assert.equal(normalizeTheme({ [field]: max + 1 })[field], max);
      assert.equal(normalizeTheme({ [field]: -1e9 })[field], min);
      assert.equal(normalizeTheme({ [field]: 1e9 })[field], max);
      assert.equal(normalizeTheme({ [field]: 7.4 })[field], 7);
      assert.equal(normalizeTheme({ [field]: 7.6 })[field], 8);
      assert.ok(Number.isInteger(normalizeTheme({ [field]: 3.3333 })[field]));
    });

    test(`${field}: NaN, Infinity and non numbers fall back`, () => {
      const d = { ...DEFAULT_THEME, [field]: 5 };
      for (const bad of [Number.NaN, Infinity, -Infinity, '12', '12px', null, true, [12], { valueOf: () => 12 }]) {
        assert.equal(normalizeTheme({ [field]: bad }, d)[field], 5, String(bad));
      }
    });
  }
});

describe('enums and booleans', () => {
  test('font only accepts the allow list', () => {
    for (const font of FONTS) assert.equal(normalizeTheme({ font }).font, font);
    for (const bad of ['Exo', 'comic sans', '', 'toString', '__proto__', "exo';}", 1, null]) {
      assert.equal(normalizeTheme({ font: bad }).font, DEFAULT_THEME.font, String(bad));
    }
  });

  test('monoFont only accepts the allow list and defaults to the panel font', () => {
    assert.equal(normalizeTheme({}).monoFont, 'panel');
    for (const monoFont of MONO_FONTS) assert.equal(normalizeTheme({ monoFont }).monoFont, monoFont);
    for (const bad of ['JetBrains', 'exo', 'monospace', '', 'constructor', "fira';}", 1, null]) {
      assert.equal(normalizeTheme({ monoFont: bad }).monoFont, 'panel', String(bad));
    }
  });

  test('buttonStyle only accepts the allow list', () => {
    for (const style of BUTTON_STYLES) assert.equal(normalizeTheme({ buttonStyle: style }).buttonStyle, style);
    for (const bad of ['Glass', 'solid', '', 'constructor', 'length', 0, null]) {
      assert.equal(normalizeTheme({ buttonStyle: bad }).buttonStyle, DEFAULT_THEME.buttonStyle, String(bad));
    }
  });

  test('sidebarGroups only accepts booleans', () => {
    assert.equal(normalizeTheme({ sidebarGroups: false }).sidebarGroups, false);
    assert.equal(normalizeTheme({ sidebarGroups: true }, { ...DEFAULT_THEME, sidebarGroups: false }).sidebarGroups, true);
    for (const bad of ['false', 0, null]) {
      assert.equal(normalizeTheme({ sidebarGroups: bad }).sidebarGroups, DEFAULT_THEME.sidebarGroups, String(bad));
    }
  });
});

describe('unknown fields', () => {
  test('unknown top level fields are dropped', () => {
    const out = normalizeTheme({ accent: '#000000', evil: 'x', css: '}body{', style: '</style>' }) as unknown as Record<
      string,
      unknown
    >;
    for (const key of ['evil', 'css', 'style']) assert.equal(Object.hasOwn(out, key), false, key);
    assert.deepEqual(Object.keys(out).sort(), Object.keys(DEFAULT_THEME).sort());
  });

  test('a __proto__ key neither survives nor pollutes', () => {
    const out = normalizeTheme(JSON.parse('{"__proto__":{"polluted":"yes"},"accent":"#000000"}'));
    assert.equal(Object.getPrototypeOf(out), Object.prototype);
    assert.equal(Object.hasOwn(out, '__proto__'), false);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(out.accent, '#000000');
  });
});

describe('eggs', () => {
  test('keys must be UUIDs', () => {
    const eggs = normalizeTheme({
      eggs: {
        [UUID_A]: { banner: '/a.png', icon: '' },
        [UUID_B]: { banner: '', icon: '/b.png' },
        'not-a-uuid': { banner: '/c.png', icon: '' },
        [`${UUID_A}x`]: { banner: '/d.png', icon: '' },
        __proto__x: { banner: '/e.png', icon: '' },
        '': { banner: '/f.png', icon: '' },
      },
    }).eggs;
    assert.deepEqual(eggs, {
      [UUID_A]: { banner: '/a.png', icon: '' },
      [UUID_B]: { banner: '', icon: '/b.png' },
    });
  });

  test('entries without a valid image, or not objects, are dropped', () => {
    const eggs = normalizeTheme({
      eggs: {
        [uuid(1)]: { banner: '', icon: '' },
        [uuid(2)]: { banner: 'javascript:alert(1)', icon: '//evil/x.png' },
        [uuid(3)]: {},
        [uuid(4)]: null,
        [uuid(5)]: '/a.png',
        [uuid(6)]: { banner: 7, icon: ['/a.png'] },
        [uuid(7)]: { icon: '/ok.png', extra: 'dropped' },
      },
    }).eggs;
    assert.deepEqual(eggs, { [uuid(7)]: { banner: '', icon: '/ok.png' } });
  });

  test('capped at 300 entries', () => {
    const raw = Object.fromEntries(Array.from({ length: 350 }, (_, i) => [uuid(i), { banner: '/b.png', icon: '' }]));
    assert.equal(Object.keys(normalizeTheme({ eggs: raw }).eggs).length, 300);
  });

  test('a non object falls back', () => {
    const d = { ...DEFAULT_THEME, eggs: { [UUID_A]: { banner: '/a.png', icon: '' } } };
    for (const bad of [[], 'x', 1, null]) assert.deepEqual(normalizeTheme({ eggs: bad }, d).eggs, d.eggs);
  });
});

describe('articles', () => {
  test(`capped at MAX_ARTICLES (${MAX_ARTICLES})`, () => {
    const raw = Array.from({ length: MAX_ARTICLES + 4 }, (_, i) => ({ title: `t${i}`, description: '', url: '' }));
    const out = normalizeTheme({ articles: raw }).articles;
    assert.equal(out.length, MAX_ARTICLES);
    assert.deepEqual(
      out.map((a) => a.title),
      raw.slice(0, MAX_ARTICLES).map((a) => a.title),
    );
  });

  test('title and description are truncated, non strings become empty', () => {
    const [long, odd, junk] = normalizeTheme({
      articles: [
        { title: 'a'.repeat(500), description: 'b'.repeat(500), url: '/x', extra: 'dropped' },
        { title: 5, description: { x: 1 }, url: 9 },
        null,
      ],
    }).articles;
    assert.deepEqual(long, { title: 'a'.repeat(80), description: 'b'.repeat(140), url: '/x' });
    assert.deepEqual(odd, { title: '', description: '', url: '' });
    assert.deepEqual(junk, { title: '', description: '', url: '' });
  });

  test('a non array falls back', () => {
    const d = { ...DEFAULT_THEME, articles: [{ title: 'kept', description: '', url: '' }] };
    for (const bad of [{}, 'x', 1, null]) assert.deepEqual(normalizeTheme({ articles: bad }, d).articles, d.articles);
  });
});

describe('layout', () => {
  test('a missing or invalid layout becomes the default one', () => {
    for (const bad of [undefined, null, 'x', {}, []]) assert.deepEqual(normalizeTheme({ layout: bad }).layout, DEFAULT_LAYOUT);
  });

  test('keeps the saved order, drops unknown and duplicate cards, appends missing ones', () => {
    const out = normalizeTheme({
      layout: [
        { id: 'network', column: 'left', enabled: false },
        { id: 'bogus', column: 'right', enabled: true },
        { id: 'network', column: 'right', enabled: true },
        'console',
        null,
        { id: 'information', column: 'sideways', enabled: 'no' },
        { id: 'toString' },
      ],
    }).layout;
    assert.deepEqual(out.slice(0, 2), [
      { id: 'network', column: 'left', enabled: false },
      { id: 'information', column: 'left', enabled: true },
    ]);
    assert.deepEqual(
      out.map((card) => card.id),
      ['network', 'information', ...DEFAULT_LAYOUT.map((c) => c.id).filter((id) => id !== 'network' && id !== 'information')],
    );
    assert.deepEqual([...out.map((c) => c.id)].sort(), [...HOME_CARDS].sort());
  });
});

describe('console layout', () => {
  const empty = { top: [], left: [], right: [], bottom: [] };

  test('the default is the page from before: banner above, extension cards and charts below', () => {
    assert.deepEqual(DEFAULT_THEME.consoleLayout, {
      top: ['banner'],
      left: [],
      right: [],
      bottom: ['extensionCards', 'cpuChart', 'memoryChart', 'networkChart'],
    });
    assert.deepEqual(normalizeTheme({}).consoleLayout, DEFAULT_CONSOLE_LAYOUT);
  });

  test('anything but an object of four arrays becomes the default', () => {
    for (const bad of [
      undefined,
      null,
      'x',
      42,
      [],
      [['banner']],
      {},
      { top: ['stats'] },
      { top: ['stats'], left: [], right: [], bottom: 'charts' },
      { top: null, left: [], right: [], bottom: [] },
    ]) {
      assert.deepEqual(normalizeTheme({ consoleLayout: bad }).consoleLayout, DEFAULT_CONSOLE_LAYOUT, JSON.stringify(bad));
    }
  });

  test('an empty layout stays empty, so only the terminal is shown', () => {
    assert.deepEqual(normalizeTheme({ consoleLayout: empty }).consoleLayout, empty);
  });

  test('keeps slots and order, drops unknown ids and repeats; the first slot holding a widget wins', () => {
    const out = normalizeTheme({
      consoleLayout: {
        top: ['stats', 'charts', 'banner', 'stats'],
        left: ['info', 'BANNER', 1, null, { id: 'banner' }, ['cpuChart']],
        right: ['networkChart', 'banner', 'cpuChart'],
        bottom: ['info', 'memoryChart', 'extensionCards', '__proto__'],
        extra: ['console'],
      },
    }).consoleLayout;
    assert.deepEqual(out, {
      top: ['stats', 'banner'],
      left: ['info'],
      right: ['networkChart', 'cpuChart'],
      bottom: ['memoryChart', 'extensionCards'],
    });
  });

  test('every widget fits at once and a huge list is capped by the allow list', () => {
    const all = normalizeTheme({ consoleLayout: { ...empty, left: [...CONSOLE_WIDGETS] } }).consoleLayout;
    assert.deepEqual(all.left, [...CONSOLE_WIDGETS]);

    const huge = normalizeTheme({
      consoleLayout: { ...empty, bottom: Array.from({ length: 10_000 }, (_, i) => CONSOLE_WIDGETS[i % 7]) },
    }).consoleLayout;
    assert.deepEqual(huge.bottom, [...CONSOLE_WIDGETS]);
  });

  test('an invalid layout falls back to the given theme, and the result is a copy', () => {
    const d = normalizeTheme({ consoleLayout: { ...empty, right: ['stats'] } });
    assert.deepEqual(normalizeTheme({ consoleLayout: 'x' }, d).consoleLayout, { ...empty, right: ['stats'] });
    assert.notEqual(normalizeTheme({}, d).consoleLayout.right, d.consoleLayout.right);
  });

  test('the layout adds no css', () => {
    const css = buildCss(DEFAULT_THEME);
    assert.equal(buildCss(normalizeTheme({ consoleLayout: empty })), css);
    assert.equal(buildCss(normalizeTheme({ consoleLayout: { ...empty, left: [...CONSOLE_WIDGETS] } })), css);
  });
});

describe('fallback argument', () => {
  const d: NebulaTheme = normalizeTheme({
    accent: '#111111',
    highlight: '#222222',
    background: '#333333',
    surface: '#444444',
    text: '#555555',
    font: 'montserrat',
    buttonStyle: 'glass',
    buttonColor: '#666666',
    line: '#777777',
    sidebarGroups: false,
    radius: 3,
    elementRadius: 2,
    backgroundImage: '/bg.png',
    backgroundDim: 40,
    homeBanner: 'https://example.com/banner.png',
    articles: [{ title: 'kept', description: 'd', url: '/a' }],
    eggs: { [UUID_A]: { banner: '/egg.png', icon: '' } },
    monoFont: 'fira',
    blockOpacity: 70,
    glass: true,
    blockBorder: false,
    inputBorder: false,
    clickEffect: 'outline',
  });

  test('every invalid field falls back to the given theme, not the defaults', () => {
    const out = normalizeTheme(
      {
        accent: 'bad',
        highlight: '#12345g',
        background: 1,
        surface: null,
        text: 'red;}',
        font: 'comic',
        buttonStyle: 'solid',
        buttonColor: 'bad',
        line: '#abc',
        sidebarGroups: 'yes',
        radius: 'x',
        elementRadius: Number.NaN,
        backgroundImage: 'javascript:alert(1)',
        backgroundDim: Infinity,
        homeBanner: '//evil/x.png',
        articles: 'x',
        eggs: [],
        monoFont: 'Fira Code',
        blockOpacity: '70%',
        glass: 'true',
        blockBorder: 0,
        inputBorder: null,
        clickEffect: 'bounce',
      },
      d,
    );
    for (const key of Object.keys(d) as (keyof NebulaTheme)[]) {
      if (key !== 'layout') assert.deepEqual(out[key], d[key], key);
    }
  });

  test('missing fields fall back to the given theme', () => {
    const out = normalizeTheme({}, d);
    for (const key of Object.keys(d) as (keyof NebulaTheme)[]) {
      if (key !== 'layout') assert.deepEqual(out[key], d[key], key);
    }
  });
});

describe('buildCss', () => {
  const MARK = 'PWNED';
  const inject = [
    `${MARK}</style><script>alert(1)</script>`,
    `#abcdef;}body{background:${MARK}}`,
    `red;}html{${MARK}:1`,
    `https://e.com/x");}body{background:url(${MARK})`,
    `/x.png"){}${MARK}{`,
    `//${MARK}.example/x.png`,
    `javascript:${MARK}`,
    `data:text/css,${MARK}`,
    `${MARK}\\"`,
  ];
  // every field, including ones this test does not know about yet, gets every payload once
  const keys = [
    ...Object.keys(DEFAULT_THEME),
    'monoFont',
    'lightBackground',
    'lightSurface',
    'lightText',
    'loginBackground',
    'loginDim',
    'loginLogo',
  ];

  const balanced = (css: string) => {
    let depth = 0;
    for (const ch of css) {
      if (ch === '{') depth++;
      if (ch === '}' && --depth < 0) return false;
    }
    return depth === 0;
  };

  for (const [i, payload] of inject.entries()) {
    test(`hostile values never reach the stylesheet (payload ${i + 1})`, () => {
      const hostile: Record<string, unknown> = Object.fromEntries(keys.map((k) => [k, payload]));
      hostile.articles = [{ title: payload, description: payload, url: payload }];
      hostile.eggs = { [UUID_A]: { banner: payload, icon: payload }, [payload]: { banner: '/a.png', icon: '' } };
      hostile.layout = [{ id: payload, column: payload, enabled: payload }];
      hostile.consoleLayout = { top: [payload], left: payload, right: [{ id: payload }], bottom: [payload] };

      const theme = normalizeTheme(hostile);
      const serialized = JSON.stringify(theme);
      // article titles are plain text rendered by React, so they may carry the payload; nothing else may
      const { articles: _articles, ...styled } = theme;
      assert.equal(JSON.stringify(styled).includes(MARK), false, JSON.stringify(styled));
      assert.ok(serialized.length > 0);

      const css = buildCss(theme);
      assert.equal(css.includes(MARK), false);
      assert.equal(/<\/?style/i.test(css), false);
      assert.equal(/<script/i.test(css), false);
      assert.equal(css.includes('javascript:'), false);
      assert.ok(balanced(css), 'unbalanced braces');
    });
  }

  test('a safe background image lands inside a well formed url()', () => {
    const css = buildCss(normalizeTheme({ backgroundImage: 'https://example.com/bg.png?x=1' }));
    assert.match(css, /url\("https:\/\/example\.com\/bg\.png\?x=1"\);\}/);
    assert.ok(balanced(css));
  });

  test('the default theme produces balanced css', () => {
    assert.ok(balanced(buildCss(DEFAULT_THEME)));
  });

  test('the login background rule only exists when a login background is set', () => {
    assert.equal(buildCss(normalizeTheme({ loginBackground: '' })).includes('nebula-auth'), false);
    const css = buildCss(normalizeTheme({ loginBackground: '/login.png', loginDim: 40 }));
    assert.match(css, /html:root\.nebula-auth\{[^}]*40%[^}]*url\("\/login\.png"\);\}/);
    assert.ok(balanced(css));
  });

  test('the monospace font is only overridden when one is picked', () => {
    assert.equal(buildCss(DEFAULT_THEME).includes('--mantine-font-family-monospace'), false);
    const css = buildCss(normalizeTheme({ monoFont: 'jetbrains' }));
    assert.match(css, /--mantine-font-family-monospace:'JetBrains Mono',[^;]*monospace;/);
    assert.match(css, /--font-mono:'JetBrains Mono',[^;]*monospace;/);
  });
});

describe('blocks and elements', () => {
  test('defaults keep the look from before these options existed', () => {
    assert.equal(DEFAULT_THEME.blockOpacity, 100);
    assert.equal(DEFAULT_THEME.glass, false);
    assert.equal(DEFAULT_THEME.blockBorder, true);
    assert.equal(DEFAULT_THEME.inputBorder, true);
    // Mantine already nudges pressed buttons 1px down
    assert.equal(DEFAULT_THEME.clickEffect, 'drop');
    const css = buildCss(DEFAULT_THEME);
    for (const marker of ['mantine-Card-root', 'mantine-Paper-root', 'backdrop-filter', 'mantine-Input-wrapper', 'mantine-active']) {
      assert.equal(css.includes(marker), false, marker);
    }
  });

  for (const field of ['glass', 'blockBorder', 'inputBorder'] as const) {
    test(`${field} only accepts booleans`, () => {
      assert.equal(normalizeTheme({ [field]: true }, { ...DEFAULT_THEME, [field]: false })[field], true);
      assert.equal(normalizeTheme({ [field]: false }, { ...DEFAULT_THEME, [field]: true })[field], false);
      for (const bad of ['false', 'true', 0, 1, null, [], {}]) {
        assert.equal(normalizeTheme({ [field]: bad })[field], DEFAULT_THEME[field], String(bad));
      }
    });
  }

  test('clickEffect only accepts the allow list', () => {
    for (const effect of CLICK_EFFECTS) assert.equal(normalizeTheme({ clickEffect: effect }).clickEffect, effect);
    for (const bad of ['Drop', 'scale', '', 'constructor', "none';}", 1, null, true]) {
      assert.equal(normalizeTheme({ clickEffect: bad }).clickEffect, 'drop', String(bad));
    }
  });

  test('block opacity makes cards and the card colour translucent in both schemes', () => {
    const css = buildCss(normalizeTheme({ blockOpacity: 80 }));
    assert.match(css, /html:root\[data-mantine-color-scheme="dark"\]\{--nebula-card:rgba\(\d+, \d+, \d+, 0\.8\);/);
    assert.match(css, /html:root\[data-mantine-color-scheme="light"\]\{[^}]*--nebula-card:rgba\(\d+, \d+, \d+, 0\.8\);/);
    assert.match(css, /\.mantine-Card-root:not\(\.fixed > \*\)\{background-color:var\(--nebula-card\);\}/);
    assert.match(css, /\.mantine-Paper-root[^{]*\{background-color:color-mix\(in srgb,var\(--mantine-color-body\) 80%,transparent\);\}/);
    // overlays are never matched, so modals and dialogs stay solid
    assert.equal(/Modal|Drawer|Popover|Menu/.test(css), false);
  });

  test('the glass blur only applies to translucent blocks', () => {
    assert.equal(buildCss(normalizeTheme({ glass: true })).includes('backdrop-filter:blur(14px)'), false);
    assert.equal(buildCss(normalizeTheme({ blockOpacity: 80 })).includes('backdrop-filter:blur(14px)'), false);
    assert.match(buildCss(normalizeTheme({ blockOpacity: 80, glass: true })), /\.mantine-Card-root[^{]*\{-webkit-backdrop-filter:blur/);
  });

  test('borders are hidden without changing the block size', () => {
    assert.match(buildCss(normalizeTheme({ blockBorder: false })), /\.mantine-Card-root,[^{]*\{border-color:transparent;\}/);
  });

  test('borderless inputs get a filled background and keep error borders', () => {
    const css = buildCss(normalizeTheme({ inputBorder: false }));
    assert.match(css, /scheme="dark"\] \.mantine-Input-wrapper\[data-variant="default"\]\{--input-bg:var\(--mantine-color-dark-5\);\}/);
    assert.match(css, /scheme="light"\] \.mantine-Input-wrapper\[data-variant="default"\]\{--input-bg:var\(--mantine-color-gray-1\);\}/);
    assert.match(css, /:not\(\[data-error\],\[data-success\]\)\{--input-bd:transparent;\}/);
  });

  test('each click effect replaces the press nudge, shrink stands still for reduced motion', () => {
    assert.match(buildCss(normalizeTheme({ clickEffect: 'none' })), /\.mantine-active:active[^{]*\{transform:none;\}/);
    assert.match(buildCss(normalizeTheme({ clickEffect: 'outline' })), /\.mantine-active:active[^{]*\{transform:none;outline:2px solid/);
    const shrink = buildCss(normalizeTheme({ clickEffect: 'shrink' }));
    assert.match(shrink, /\.mantine-active:active[^{]*\{transform:scale\(0\.96\);\}/);
    assert.match(shrink, /@media \(prefers-reduced-motion:reduce\)\{[^@]*transition:none;[^@]*transform:none;\}\}/);
  });
});

describe('toasts, page transitions and page titles', () => {
  const braces = (css: string) => css.split('{').length === css.split('}').length;

  test('defaults and themes saved before these options keep today\'s look', () => {
    assert.equal(DEFAULT_THEME.toastStyle, 'default');
    assert.equal(DEFAULT_THEME.pageTransition, 'none');
    assert.equal(DEFAULT_THEME.pageTitles, true);
    const old = normalizeTheme({ accent: '#2fbf8f', buttonStyle: 'glass', radius: 12 });
    assert.equal(old.toastStyle, 'default');
    assert.equal(old.pageTransition, 'none');
    assert.equal(old.pageTitles, true);
    for (const css of [buildCss(DEFAULT_THEME), buildCss(old)]) {
      for (const marker of ['Notification', 'nebula-tone', 'nebula-toast', 'nebula-page', 'file-manager', '@keyframes']) {
        assert.equal(css.includes(marker), false, marker);
      }
    }
  });

  test('toastStyle only accepts the allow list', () => {
    for (const style of TOAST_STYLES) assert.equal(normalizeTheme({ toastStyle: style }).toastStyle, style);
    for (const bad of ['Glassy', 'glass', '', 'constructor', "glassy;}", 1, null, true, ['glassy']]) {
      assert.equal(normalizeTheme({ toastStyle: bad }).toastStyle, 'default', String(bad));
    }
  });

  test('pageTransition only accepts the allow list', () => {
    for (const transition of PAGE_TRANSITIONS) {
      assert.equal(normalizeTheme({ pageTransition: transition }).pageTransition, transition);
    }
    for (const bad of ['fade-up', 'Fade', 'slide', '', 'toString', 'fade;}', 0, null, false, { fade: 1 }]) {
      assert.equal(normalizeTheme({ pageTransition: bad }).pageTransition, 'none', String(bad));
    }
  });

  test('pageTitles only accepts booleans', () => {
    assert.equal(normalizeTheme({ pageTitles: false }).pageTitles, false);
    assert.equal(normalizeTheme({ pageTitles: true }, { ...DEFAULT_THEME, pageTitles: false }).pageTitles, true);
    for (const bad of ['false', 'no', 0, 1, null, [], {}]) {
      assert.equal(normalizeTheme({ pageTitles: bad }).pageTitles, true, String(bad));
    }
  });

  test('invalid values fall back to the given theme, not the defaults', () => {
    const d = { ...DEFAULT_THEME, toastStyle: 'glassy', pageTransition: 'fadeScale', pageTitles: false } as const;
    const out = normalizeTheme({ toastStyle: 'frosted', pageTransition: 'zoom', pageTitles: 'yes' }, d);
    assert.equal(out.toastStyle, 'glassy');
    assert.equal(out.pageTransition, 'fadeScale');
    assert.equal(out.pageTitles, false);
  });

  test('the glassy toast is scoped to the toast stack, with a glyph per toast type and a countdown', () => {
    const css = buildCss(normalizeTheme({ toastStyle: 'glassy' }));
    const TOAST = String.raw`html:root \.fixed\.z-999 \.mantine-Notification-root`;
    assert.match(css, new RegExp(`${TOAST}\\{background-color:color-mix\\(in srgb,var\\(--notification-color\\) 14%`));
    assert.match(css, new RegExp(`${TOAST}\\{[^}]*backdrop-filter:blur`));
    // every Notification rule sits under the toast stack, so server page notices keep core's look
    assert.equal(css.split('.mantine-Notification-root').length - 1, css.split('.fixed.z-999 .mantine-Notification-root').length - 1);
    for (const tone of ['green', 'red', 'yellow']) {
      assert.match(css, new RegExp(`${TOAST}\\[data-nebula-tone="${tone}"\\]::before\\{background-image:url\\("data:image/svg\\+xml,`));
    }
    // white on the default green and red, dark on the default yellow
    assert.match(css, /tone="green"\]::before\{[^}]*stroke='%23ffffff'/);
    assert.match(css, /tone="red"\]::before\{[^}]*stroke='%23ffffff'/);
    assert.match(css, /tone="yellow"\]::before\{[^}]*stroke='%23111111'/);
    // progress toasts never time out, so only the others count down, and never under reduced motion
    assert.match(css, new RegExp(`${TOAST}:not\\(:has\\(\\.mantine-Progress-root\\)\\)::after\\{[^}]*animation:nebula-toast-countdown 7500ms linear forwards;`));
    assert.match(css, new RegExp(`@media \\(prefers-reduced-motion:reduce\\)\\{${TOAST}::after\\{display:none;\\}\\}`));
    assert.ok(braces(css));
  });

  test('the glyph follows a custom status colour it sits on', () => {
    const css = buildCss(normalizeTheme({ toastStyle: 'glassy', success: '#b4f2dc', warning: '#7a4a00' }));
    assert.match(css, /tone="green"\]::before\{[^}]*stroke='%23111111'/);
    assert.match(css, /tone="yellow"\]::before\{[^}]*stroke='%23ffffff'/);
  });

  test('each page transition animates the entering page briefly, only without reduced motion', () => {
    for (const transition of PAGE_TRANSITIONS) {
      const css = buildCss(normalizeTheme({ pageTransition: transition }));
      if (transition === 'none') {
        assert.equal(css.includes('data-nebula-page-enter'), false);
        continue;
      }
      const { keyframes, ms, easing } = PAGE_ANIMATIONS[transition];
      assert.ok(ms >= 150 && ms <= 250, `${transition} runs ${ms}ms`);
      // the page's own elements move, not the column: a transform there would pin fixed pages to it
      const rule = `@media (prefers-reduced-motion:no-preference){html:root [data-nebula-page-enter] > *{animation:${keyframes} ${ms}ms ${easing};}}`;
      assert.ok(css.includes(rule), transition);
      // nothing may be held after the animation ends: xterm measures the page and the editor is fixed
      assert.equal(/forwards|both/.test(rule), false);
      assert.ok(braces(css));
    }
  });

  test('without page titles only the Files heading is hidden, not the buttons in its row', () => {
    const css = buildCss(normalizeTheme({ pageTitles: false }));
    assert.ok(
      css.includes(
        'html:root [data-file-manager-page] > .mantine-Group-root > .mantine-Group-root > .mantine-Title-root{display:none;}',
      ),
    );
    assert.equal(css.split('display:none').length - 1, 1);
  });
});

describe('box and stat card styles', () => {
  const braces = (css: string) => css.split('{').length === css.split('}').length;
  const HEADER = '#title-card-header';
  const STAT = '.mantine-ThemeIcon-root + .flex-col';

  test('defaults and themes saved before these options keep core\'s cards', () => {
    assert.equal(DEFAULT_THEME.boxStyle, 'default');
    assert.equal(DEFAULT_THEME.statStyle, 'default');
    const old = normalizeTheme({ accent: '#2fbf8f', blockOpacity: 80, toastStyle: 'glassy' });
    assert.equal(old.boxStyle, 'default');
    assert.equal(old.statStyle, 'default');
    for (const css of [buildCss(DEFAULT_THEME), buildCss(old)]) {
      for (const marker of [HEADER, ':has(> div > h3)', STAT]) assert.equal(css.includes(marker), false, marker);
    }
  });

  test('boxStyle and statStyle only accept their allow lists', () => {
    for (const style of BOX_STYLES) assert.equal(normalizeTheme({ boxStyle: style }).boxStyle, style);
    for (const style of STAT_STYLES) assert.equal(normalizeTheme({ statStyle: style }).statStyle, style);
    for (const bad of ['Line', 'pills', '', 'constructor', 'fill;}', 1, null, true, ['line'], { pill: 1 }]) {
      assert.equal(normalizeTheme({ boxStyle: bad }).boxStyle, 'default', String(bad));
      assert.equal(normalizeTheme({ statStyle: bad }).statStyle, 'default', String(bad));
    }
    for (const bad of ['minimal-reversed', 'Reversed', 'toString']) {
      assert.equal(normalizeTheme({ statStyle: bad }).statStyle, 'default', bad);
    }
  });

  test('invalid values fall back to the given theme, not the defaults', () => {
    const d = { ...DEFAULT_THEME, boxStyle: 'pill', statStyle: 'minimal' } as const;
    const out = normalizeTheme({ boxStyle: 'tab', statStyle: 'tiny' }, d);
    assert.equal(out.boxStyle, 'pill');
    assert.equal(out.statStyle, 'minimal');
  });

  test('each box style restyles only the title row of titled and chart cards', () => {
    const heads = (css: string) =>
      css.split('\n').filter((rule) => rule.includes(HEADER) || rule.includes(':has(> div > h3)'));
    const line = buildCss(normalizeTheme({ boxStyle: 'line' }));
    // core's divider is an inline style, so it needs the !important; the band goes
    assert.ok(heads(line).some((r) => r.includes('background:transparent;border-bottom:1px solid var(--mantine-color-default-border)!important')));
    const fill = buildCss(normalizeTheme({ boxStyle: 'fill' }));
    assert.ok(heads(fill).some((r) => r.includes('background:var(--mantine-color-blue-light);border-bottom-color:transparent!important')));
    const pill = buildCss(normalizeTheme({ boxStyle: 'pill' }));
    assert.ok(heads(pill).some((r) => r.includes('border-bottom-color:transparent!important')));
    assert.ok(heads(pill).some((r) => r.includes('> .mantine-Title-root,') && r.includes('border-radius:999px')));
    for (const css of [line, fill, pill]) {
      // every rule is scoped to a card's own header, never a bare title or card
      for (const rule of heads(css)) {
        for (const selector of rule.slice(0, rule.indexOf('{')).split(',')) {
          assert.match(selector, /^html:root \.mantine-Card-root > (#title-card-header|\.border-b:first-child:has\(> div > h3\))/);
        }
      }
      assert.equal(css.includes(STAT), false);
      assert.ok(braces(css));
    }
  });

  test('stat styles move the icon to the other side and or drop its square', () => {
    // only the stat rules, so options added by other sections cannot trip these
    const rules = (statStyle: string) =>
      buildCss(normalizeTheme({ statStyle }))
        .split('\n')
        .filter((rule) => rule.includes(STAT));
    const reversed = rules('reversed').join('\n');
    assert.ok(reversed.includes(`${STAT}){flex-direction:row-reverse;}`));
    assert.ok(reversed.includes('> .flex-col{margin-left:0;margin-right:1rem;}'));
    assert.equal(reversed.includes('background:transparent'), false);

    const minimal = rules('minimal').join('\n');
    assert.equal(minimal.includes('row-reverse'), false);
    assert.match(minimal, /> \.mantine-ThemeIcon-root\{width:auto;height:auto;[^}]*background:transparent;[^}]*color:var\(--ti-bg,/);
    assert.ok(minimal.includes('> .flex-col{margin-left:0.75rem;}'));

    const minimalReversed = rules('minimalReversed').join('\n');
    assert.ok(minimalReversed.includes('row-reverse'));
    assert.ok(minimalReversed.includes('background:transparent'));
    assert.ok(minimalReversed.includes('> .flex-col{margin-right:0.75rem;}'));

    for (const style of ['reversed', 'minimal', 'minimalReversed']) {
      const out = rules(style);
      assert.ok(out.length > 0, style);
      // only tiles holding a ThemeIcon beside the label column inside a card match
      for (const rule of out) {
        for (const selector of rule.split('{')[0].split(',')) {
          assert.ok(selector.startsWith('html:root .mantine-Card-root > .flex.flex-row.items-center:has('), selector);
        }
      }
      assert.ok(braces(out.join('')));
    }
  });
});

describe('auth pages', () => {
  const link = (extra: Record<string, unknown> = {}) => ({ label: 'Discord', url: 'https://discord.gg/abc', ...extra });

  test("defaults and themes saved before these options keep core's auth pages", () => {
    const old = normalizeTheme({ accent: '#2fbf8f', loginBackground: '/bg.png', loginLogo: '/logo.png' });
    for (const theme of [DEFAULT_THEME, old]) {
      assert.equal(theme.authLayout, 'default');
      assert.equal(theme.authLogoPosition, 'aboveForm');
      assert.deepEqual(theme.supportLinks, []);
      assert.equal(theme.supportLinksPosition, 'header');
    }
  });

  test('authLayout and both positions only accept their allow lists', () => {
    for (const layout of AUTH_LAYOUTS) assert.equal(normalizeTheme({ authLayout: layout }).authLayout, layout);
    for (const position of AUTH_POSITIONS) {
      assert.equal(normalizeTheme({ authLogoPosition: position }).authLogoPosition, position);
      assert.equal(normalizeTheme({ supportLinksPosition: position }).supportLinksPosition, position);
    }
    for (const bad of ['Flat', 'side-banner', 'split', '', 'constructor', 'flat;}', 1, null, true, ['flat']]) {
      assert.equal(normalizeTheme({ authLayout: bad }).authLayout, 'default', String(bad));
    }
    for (const bad of ['Header', 'above', 'footer', '', 'toString', 0, null, false, { header: 1 }]) {
      assert.equal(normalizeTheme({ authLogoPosition: bad }).authLogoPosition, 'aboveForm', String(bad));
      assert.equal(normalizeTheme({ supportLinksPosition: bad }).supportLinksPosition, 'header', String(bad));
    }
  });

  test('a support link keeps its label, a safe url and an allow listed icon, nothing else', () => {
    for (const icon of SUPPORT_LINK_ICONS) {
      assert.deepEqual(normalizeTheme({ supportLinks: [link({ icon })] }).supportLinks, [link({ icon })]);
    }
    assert.deepEqual(normalizeTheme({ supportLinks: [link({ url: '/status' })] }).supportLinks, [link({ url: '/status' })]);
    // an unknown icon leaves the link without one rather than dropping it; extra fields never survive
    for (const icon of ['Discord', 'twitter', '', 'constructor', 1, null, ['github']]) {
      const out = normalizeTheme({ supportLinks: [link({ icon, target: '_self', onclick: 'x' })] }).supportLinks;
      assert.deepEqual(out, [link()], String(icon));
      assert.equal('icon' in out[0], false, String(icon));
    }
    // normalising again changes nothing, so the editor's unsaved check settles
    const once = normalizeTheme({ supportLinks: [link({ icon: 'docs' }), link({ icon: 'nope' })] });
    assert.deepEqual(normalizeTheme(JSON.parse(JSON.stringify(once))), once);
  });

  test('labels are trimmed and cut to 30 characters; links without a label are dropped', () => {
    const [long] = normalizeTheme({ supportLinks: [link({ label: `  ${'x'.repeat(40)}  ` })] }).supportLinks;
    assert.equal(long.label, 'x'.repeat(30));
    assert.equal(normalizeTheme({ supportLinks: [link({ label: ' Docs ' })] }).supportLinks[0].label, 'Docs');
    for (const label of ['', '   ', 42, null, undefined, ['Docs']]) {
      assert.deepEqual(normalizeTheme({ supportLinks: [link({ label })] }).supportLinks, [], String(label));
    }
  });

  test('links without a safe url are dropped', () => {
    for (const url of [...BAD_URLS, '', undefined]) {
      assert.deepEqual(normalizeTheme({ supportLinks: [link({ url })] }).supportLinks, [], String(url));
    }
    for (const url of GOOD_URLS) {
      assert.equal(normalizeTheme({ supportLinks: [link({ url })] }).supportLinks[0]?.url, url, url);
    }
  });

  test(`the first ${MAX_SUPPORT_LINKS} entries are kept, minus non objects; a non array falls back`, () => {
    const many = Array.from({ length: 10 }, (_, i) => link({ label: `L${i}` }));
    assert.deepEqual(
      normalizeTheme({ supportLinks: many }).supportLinks.map((l) => l.label),
      ['L0', 'L1', 'L2', 'L3'],
    );
    assert.deepEqual(normalizeTheme({ supportLinks: [null, 'x', [], link()] }).supportLinks, [link()]);
    // the cap counts saved entries, not valid ones, so a fifth entry never shows
    assert.deepEqual(normalizeTheme({ supportLinks: [null, null, null, null, link()] }).supportLinks, []);
    const d = { ...DEFAULT_THEME, supportLinks: [link()] };
    for (const bad of ['x', {}, null, 1, true]) {
      assert.deepEqual(normalizeTheme({ supportLinks: bad }, d).supportLinks, [link()], String(bad));
    }
  });

  test('invalid values fall back to the given theme, not the defaults', () => {
    const d = normalizeTheme({
      authLayout: 'panels',
      authLogoPosition: 'header',
      supportLinks: [link({ icon: 'discord' })],
      supportLinksPosition: 'aboveForm',
    });
    const out = normalizeTheme(
      { authLayout: 'split', authLogoPosition: 'top', supportLinks: 'x', supportLinksPosition: 'footer' },
      d,
    );
    assert.equal(out.authLayout, 'panels');
    assert.equal(out.authLogoPosition, 'header');
    assert.deepEqual(out.supportLinks, [link({ icon: 'discord' })]);
    assert.equal(out.supportLinksPosition, 'aboveForm');
  });
});

describe('server cards and table style', () => {
  const braces = (css: string) => css.split('{').length === css.split('}').length;
  const SCROLL = '.mantine-TableScrollContainer-scrollContainer';
  // only the table rules, so options added by other sections cannot trip these
  const tableRules = (theme: Record<string, unknown>) =>
    buildCss(normalizeTheme(theme))
      .split('\n')
      .filter((rule) => rule.includes(SCROLL));

  test("defaults and themes saved before these options keep today's grid and tables", () => {
    assert.equal(DEFAULT_THEME.serverCardStyle, 'default');
    assert.equal(DEFAULT_THEME.tableStyle, 'table');
    const old = normalizeTheme({ accent: '#2fbf8f', blockBorder: false, boxStyle: 'pill' });
    assert.equal(old.serverCardStyle, 'default');
    assert.equal(old.tableStyle, 'table');
    for (const css of [buildCss(DEFAULT_THEME), buildCss(old)]) {
      for (const marker of ['mantine-Table', 'TableScrollContainer', 'border-spacing', '--nebula-row']) {
        assert.equal(css.includes(marker), false, marker);
      }
    }
    // the servers grid reads the card style itself; it never reaches the stylesheet
    for (const style of SERVER_CARD_STYLES) {
      assert.equal(buildCss(normalizeTheme({ serverCardStyle: style })), buildCss(DEFAULT_THEME), style);
    }
  });

  test('serverCardStyle and tableStyle only accept their allow lists', () => {
    for (const style of SERVER_CARD_STYLES) {
      assert.equal(normalizeTheme({ serverCardStyle: style }).serverCardStyle, style);
    }
    for (const style of TABLE_STYLES) assert.equal(normalizeTheme({ tableStyle: style }).tableStyle, style);
    for (const bad of ['Banner', 'grid', '', 'constructor', 'toString', 'cards;}', 1, null, true, ['cards'], { linear: 1 }]) {
      assert.equal(normalizeTheme({ serverCardStyle: bad }).serverCardStyle, 'default', String(bad));
      assert.equal(normalizeTheme({ tableStyle: bad }).tableStyle, 'table', String(bad));
    }
    // one list's values are not valid in the other
    assert.equal(normalizeTheme({ serverCardStyle: 'cards' }).serverCardStyle, 'default');
    assert.equal(normalizeTheme({ tableStyle: 'compact' }).tableStyle, 'table');
  });

  test('invalid values fall back to the given theme, not the defaults', () => {
    const d = { ...DEFAULT_THEME, serverCardStyle: 'linear', tableStyle: 'cards' } as const;
    const out = normalizeTheme({ serverCardStyle: 'tiles', tableStyle: 'rows' }, d);
    assert.equal(out.serverCardStyle, 'linear');
    assert.equal(out.tableStyle, 'cards');
  });

  test('cards make each row of core tables a card and keep the fills core puts on a row', () => {
    const rules = tableRules({ tableStyle: 'cards' });
    const css = rules.join('\n');
    // core's wrapper draws its border and fill with inline styles
    assert.ok(css.includes(`html:root div[style]:has(> ${SCROLL}){background:none!important;border-color:transparent!important;}`));
    assert.ok(css.includes('{border-collapse:separate;border-spacing:0 6px;'));
    // rows are painted without !important, so an inline fill (a selected file) and the drag selection win
    assert.ok(rules.some((rule) => rule.endsWith('{background-color:var(--nebula-row);}')));
    assert.equal(/background-color:[^;}]*!important/.test(css), false);
    // the file list's virtual padding rows hold one empty cell and are never painted
    const bodyRules = rules.filter((rule) => rule.includes('tbody > tr'));
    assert.ok(bodyRules.length >= 4);
    for (const rule of bodyRules) assert.ok(rule.includes('tbody > tr:not(:has(> td:only-child:empty))'), rule);
    // hover only where Mantine highlights rows, and only on devices that hover
    assert.match(
      css,
      /^@media \(hover:hover\)\{[^{]*\[data-hover\]:hover\{background-color:color-mix\(in srgb,var\(--mantine-color-text\) 5%,var\(--nebula-row\)\);\}\}$/m,
    );
    // no header line; the end cells round the card
    assert.ok(css.includes('> .mantine-Table-thead > tr > th{box-shadow:none;'));
    assert.ok(css.includes('> td:first-child{border-inline-start:1px solid var(--mantine-color-default-border);border-start-start-radius:var(--mantine-radius-md);border-end-start-radius:var(--mantine-radius-md);}'));
    assert.ok(css.includes('> td:last-child{border-inline-end:1px solid var(--mantine-color-default-border);border-start-end-radius:var(--mantine-radius-md);border-end-end-radius:var(--mantine-radius-md);}'));
    // every selector is scoped to a table in Mantine's scroll container (core's Table component)
    for (const rule of rules) {
      const body = rule.startsWith('@media') ? rule.slice(rule.indexOf('{') + 1) : rule;
      for (const selector of body.slice(0, body.indexOf('{')).split(',')) {
        assert.ok(selector.startsWith('html:root ') && selector.includes(SCROLL), selector);
      }
    }
    assert.ok(braces(css));
  });

  test('card rows follow the block border option and take the raised fill inside a card', () => {
    const bordered = tableRules({ tableStyle: 'cards' }).join('\n');
    assert.ok(bordered.includes('> td{border-block:1px solid var(--mantine-color-default-border);}'));
    assert.ok(bordered.includes(`html:root .mantine-Card-root ${SCROLL} .mantine-Table-table{--nebula-row:var(--mantine-color-default);}`));
    const borderless = tableRules({ tableStyle: 'cards', blockBorder: false }).join('\n');
    assert.ok(borderless.includes('> td{border-block:1px solid transparent;}'));
    assert.equal(borderless.includes('solid var(--mantine-color-default-border)'), false);
  });
});

describe('menu hover effect and search component', () => {
  const LINK = 'html:root #sidebar-content a > .mantine-Button-root';
  const TOP_LINK = 'html:root .nebula-topnav a > .mantine-Button-root';
  const ICON = ' .mantine-Button-label > svg';
  const styled = (navHover: NebulaTheme['navHover']) => buildCss(normalizeTheme({ navHover }));
  /** The declarations of every rule listing `selector`, with at-rules unwrapped. */
  const declarations = (css: string, selector: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selectors]) => selectors.split(',').some((listed) => listed.trim() === selector))
      .map(([, , body]) => body)
      .join('');

  test("defaults and themes saved before these options keep today's menu", () => {
    assert.equal(DEFAULT_THEME.navHover, 'default');
    assert.equal(DEFAULT_THEME.searchComponent, 'palette');
    const old = normalizeTheme({ accent: '#2fbf8f', sidebarGroups: false, buttonColor: '#ff0000' });
    assert.equal(old.navHover, 'default');
    assert.equal(old.searchComponent, 'palette');
    for (const css of [buildCss(DEFAULT_THEME), buildCss(old)]) {
      for (const marker of ['--nebula-nav', 'a > .mantine-Button-root', 'nebula-sb-items', 'nebula-topnav']) {
        assert.equal(css.includes(marker), false, marker);
      }
    }
  });

  test('navHover and searchComponent only accept their allow lists', () => {
    for (const hover of NAV_HOVERS) assert.equal(normalizeTheme({ navHover: hover }).navHover, hover);
    for (const bad of ['Filled', 'icon-pill', 'pill;}', '', 'constructor', 1, null, true, ['pill']]) {
      assert.equal(normalizeTheme({ navHover: bad }).navHover, 'default', String(bad));
    }
    for (const search of SEARCH_COMPONENTS) {
      assert.equal(normalizeTheme({ searchComponent: search }).searchComponent, search);
    }
    for (const bad of ['search', 'SearchBar', 'server-selector', '', 'toString', 0, null, false, { palette: 1 }]) {
      assert.equal(normalizeTheme({ searchComponent: bad }).searchComponent, 'palette', String(bad));
    }
  });

  test('invalid values fall back to the given theme, not the defaults', () => {
    const d = { ...DEFAULT_THEME, navHover: 'iconPill', searchComponent: 'searchBar' } as const;
    const out = normalizeTheme({ navHover: 'glow', searchComponent: 'omnibox' }, d);
    assert.equal(out.navHover, 'iconPill');
    assert.equal(out.searchComponent, 'searchBar');
  });

  test('the search component is swapped at runtime and adds no css', () => {
    for (const searchComponent of SEARCH_COMPONENTS) {
      assert.equal(buildCss(normalizeTheme({ searchComponent })), buildCss(DEFAULT_THEME), searchComponent);
    }
  });

  test('every style paints hovered and current links in the sidebar and the top bar', () => {
    for (const hover of NAV_HOVERS) {
      if (hover === 'default') continue;
      const css = styled(hover);
      assert.equal(css.split('{').length, css.split('}').length, hover);
      for (const link of [LINK, TOP_LINK]) {
        assert.notEqual(declarations(css, `${link}:not(.active):hover`), '', `${hover} ${link}`);
        // light mode draws the current link as an outline button; every style drops the outline
        assert.match(declarations(css, `${link}.active`), /border-color:transparent;/, `${hover} ${link}`);
      }
      // a tap on a touch screen leaves no link painted
      assert.ok(css.includes(`@media (hover:hover){${LINK}:not(.active):hover`), hover);
    }
  });

  test('solid styles fill the current link with the accent, secondary styles with a neutral fill', () => {
    for (const hover of ['filled', 'pill'] as const) {
      const css = styled(hover);
      assert.match(
        declarations(css, `${LINK}.active`),
        /background-color:var\(--nebula-nav-accent\);color:var\(--mantine-primary-color-contrast\);/,
      );
      assert.match(declarations(css, `${LINK}:not(.active):hover`), /background-color:var\(--nebula-nav-tint\);/);
    }
    for (const hover of ['filledSecondary', 'pillSecondary'] as const) {
      const css = styled(hover);
      const current = declarations(css, `${LINK}.active`);
      assert.match(current, /background-color:var\(--nebula-nav-fill\);/);
      assert.doesNotMatch(current, /nebula-nav-accent/);
      // hovering is a lighter step of the same fill, so the current link still stands out
      assert.match(
        declarations(css, `${LINK}:not(.active):hover`),
        /background-color:color-mix\(in srgb,var\(--nebula-nav-fill\) 60%,transparent\);/,
      );
      assert.match(declarations(css, 'html:root[data-mantine-color-scheme="dark"]'), /--nebula-nav-fill:/);
      assert.match(declarations(css, 'html:root[data-mantine-color-scheme="light"]'), /--nebula-nav-fill:/);
    }
    assert.match(declarations(styled('filledSecondary'), `${LINK}.active`), /color:var\(--nebula-nav-ink\);/);
    assert.match(declarations(styled('pillSecondary'), `${LINK}.active${ICON}`), /color:var\(--nebula-nav-ink\);/);
  });

  test('only the pill styles round the links', () => {
    for (const hover of NAV_HOVERS) {
      const round = declarations(styled(hover), LINK).includes('border-radius:999px');
      assert.equal(round, hover === 'pill' || hover === 'pillSecondary', hover);
    }
  });

  test('icon pill leaves the row clear and puts a tile on every icon, animated only without reduced motion', () => {
    const css = styled('iconPill');
    assert.match(declarations(css, `${LINK}.active`), /background-color:transparent;/);
    assert.match(declarations(css, `${LINK}:not(.active):hover`), /background-color:transparent;/);
    assert.match(
      declarations(css, `${LINK}.active${ICON}`),
      /background-color:var\(--nebula-nav-accent\);color:var\(--mantine-primary-color-contrast\);/,
    );
    assert.match(declarations(css, `${LINK}:not(.active):hover${ICON}`), /background-color:var\(--nebula-nav-tint\);/);
    // the tile's padding sits on every icon, so labels do not shift when a link becomes current
    assert.match(declarations(css, `${LINK}${ICON}`), /padding:[^;]+;border-radius:var\(--mantine-radius-sm\);transition:/);
    assert.ok(css.includes(`@media (prefers-reduced-motion:reduce){${LINK}${ICON}`));
  });

  test('the menu keeps the accent when buttons get their own colour', () => {
    const css = buildCss(normalizeTheme({ navHover: 'filled', buttonColor: '#ff0000' }));
    // buttonColor redefines the blue variables on buttons, so the accent is read on the link around the button
    assert.match(declarations(css, 'html:root #sidebar-content a'), /--nebula-nav-accent:var\(--mantine-color-blue-filled\);/);
    assert.doesNotMatch(declarations(css, `${LINK}.active`), /--mantine-color-blue/);
  });

  test("GroupedNav's hover tick belongs to the default style; the current link's marker always stays", () => {
    for (const hover of NAV_HOVERS) {
      const css = styled(hover);
      const tickless = css.includes('html:root .nebula-sb-items a:not(.active):hover::before{background:transparent;}');
      assert.equal(tickless, hover !== 'default', hover);
      assert.equal(css.includes('.nebula-sb-items a.active'), false, hover);
    }
  });
});

describe('dashboard layout and dock position', () => {
  const braces = (css: string) => css.split('{').length === css.split('}').length;
  // core's desktop sidebar card beside a router's content column; the drawer and the setup wizard never match
  const SIDEBAR = 'html:root #sidebar-desktop:has(~ :is(#dashboard-root,#server-root,#admin-root))';
  const laid = (sidebarLayout: string, dockPosition = 'sidebar') =>
    buildCss(normalizeTheme({ sidebarLayout, dockPosition }));

  test("defaults and themes saved before these options keep today's flush sidebar", () => {
    assert.equal(DEFAULT_THEME.sidebarLayout, 'default');
    assert.equal(DEFAULT_THEME.dockPosition, 'sidebar');
    const old = normalizeTheme({ accent: '#2fbf8f', sidebarGroups: false, blockOpacity: 80 });
    assert.equal(old.sidebarLayout, 'default');
    assert.equal(old.dockPosition, 'sidebar');
    for (const css of [buildCss(DEFAULT_THEME), buildCss(old)]) {
      for (const marker of ['#sidebar-desktop', 'nebula-rail', 'nebula-dock', 'nebula-sb-rule', 'sidebar-account-card']) {
        assert.equal(css.includes(marker), false, marker);
      }
    }
  });

  test('sidebarLayout and dockPosition only accept their allow lists', () => {
    for (const layout of SIDEBAR_LAYOUTS) assert.equal(normalizeTheme({ sidebarLayout: layout }).sidebarLayout, layout);
    for (const bad of ['Floating', 'rail', 'top', '', 'constructor', 'slim;}', 1, null, true, ['pill']]) {
      assert.equal(normalizeTheme({ sidebarLayout: bad }).sidebarLayout, 'default', String(bad));
    }
    for (const dock of DOCK_POSITIONS) assert.equal(normalizeTheme({ dockPosition: dock }).dockPosition, dock);
    for (const bad of ['Header', 'bottom', 'floating', '', 'toString', 'top;}', 0, null, false, { top: 1 }]) {
      assert.equal(normalizeTheme({ dockPosition: bad }).dockPosition, 'sidebar', String(bad));
    }
  });

  test('invalid values fall back to the given theme, not the defaults', () => {
    const d = { ...DEFAULT_THEME, sidebarLayout: 'slim', dockPosition: 'top' } as const;
    const out = normalizeTheme({ sidebarLayout: 'rail', dockPosition: 'dock' }, d);
    assert.equal(out.sidebarLayout, 'slim');
    assert.equal(out.dockPosition, 'top');
  });

  test('every rule only reaches the desktop sidebar of the dashboard, server and admin pages', () => {
    for (const layout of SIDEBAR_LAYOUTS) {
      for (const dock of DOCK_POSITIONS) {
        const css = laid(layout, dock);
        const where = `${layout}/${dock}`;
        // the drawer below lg renders the same menu in `.mantine-Drawer-body #sidebar-content`
        assert.equal(css.split('#sidebar-desktop').length, css.split(SIDEBAR).length, where);
        assert.equal(css.split('#sidebar-content').length, css.split(`${SIDEBAR} #sidebar-content`).length, where);
        assert.ok(braces(css), where);
      }
    }
  });

  test("floating brings back core's inset card; pill rounds it and moves the account to the bar", () => {
    const floating = laid('floating');
    assert.ok(
      floating.includes(
        `${SIDEBAR}{margin:0.5rem 0 0.5rem 0.5rem;top:0.5rem;height:calc(100vh - 1rem);border-radius:var(--paper-radius);border-width:1px;}`,
      ),
    );
    assert.equal(floating.includes('#sidebar-account-card'), false);
    const pill = laid('pill');
    assert.match(pill, /#admin-root\)\)\{[^}]*border-radius:1\.75rem;[^}]*border-width:1px;/);
    assert.ok(pill.includes(`${SIDEBAR} #sidebar-account-card{display:none;}`));
  });

  test('the rail and the horizontal layout size the card with max-width, since core pins width and display', () => {
    // `w-64!` and `lg:block!` are layered !important utilities, which no unlayered rule can override
    const own = (css: string) => css.split('\n').filter((rule) => rule.startsWith(`${SIDEBAR}{`));
    const slim = laid('slim');
    const horizontal = laid('horizontal');
    for (const rule of [...own(slim), ...own(horizontal)]) assert.doesNotMatch(rule, /[{;](width|display):/);
    assert.ok(slim.includes(`${SIDEBAR}{max-width:4rem;padding:0.5rem;}`));
    assert.ok(horizontal.includes(`${SIDEBAR}{max-width:0;max-height:0;margin:0;padding:0;border:0;visibility:hidden;}`));
  });

  test('the rail keeps the link names for screen readers and shows every section as a rule over its links', () => {
    const css = laid('slim');
    assert.ok(css.includes(`${SIDEBAR} a > .mantine-Button-root .mantine-Button-label{justify-content:center;font-size:0;}`));
    assert.ok(css.includes(`${SIDEBAR} .nebula-sb-toggle,${SIDEBAR} .mantine-Divider-label{display:none;}`));
    assert.ok(css.includes(`${SIDEBAR} .nebula-sb-rule{display:block;}`));
    assert.ok(css.includes(`${SIDEBAR} .nebula-sb-items{display:block;`));
    assert.ok(css.includes(`${SIDEBAR} .nebula-rail-logo{display:block;}`));
    // the account card stays, only the server switcher beside it goes
    assert.ok(css.includes(`${SIDEBAR} #sidebar-content > .shrink-0:last-child > :not(#sidebar-account-card){display:none;}`));
  });

  test('a moved dock only leaves the desktop card, and the horizontal layout ignores the dock position', () => {
    const HIDDEN = `${SIDEBAR} .nebula-dock-origin{display:none;}`;
    for (const layout of SIDEBAR_LAYOUTS) {
      assert.equal(laid(layout).includes('nebula-dock-origin'), false, layout);
      if (layout === 'horizontal') continue;
      for (const dock of ['header', 'top']) assert.ok(laid(layout, dock).includes(HIDDEN), `${layout}/${dock}`);
    }
    for (const dock of DOCK_POSITIONS) assert.equal(laid('horizontal', dock), laid('horizontal'), dock);
  });
});
