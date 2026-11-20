// The stylesheet buildCss() writes for each built-in preset and for a few themes that leave every option off its
// default, kept in cssSnapshot.test.ts.snapshot. A change that alters the CSS fails here until the snapshot is
// refreshed with `node --test --test-update-snapshots tests/cssSnapshot.test.ts`; review that diff like code.
import { describe, test } from 'node:test';
import { buildCss } from '../frontend/src/lib/css/index.ts';
import { normalizeTheme } from '../frontend/src/lib/normalize.ts';
import { PRESETS } from '../frontend/src/lib/presets.ts';
import { DEFAULT_THEME, type NebulaTheme } from '../frontend/src/lib/theme.ts';

/** One declaration or rule per line, so a diff points at what changed. */
const lines = (css: unknown) => String(css).replace(/([;{}])/g, '$1\n');

const OPTIONAL_COLORS: Partial<NebulaTheme> = {
  buttonColor: '#c2410c',
  buttonText: '#fff7ed',
  surfaceRaised: '#1d2430',
  surfaceOverlay: '#252e3b',
  textMuted: '#a3adbb',
  textFaint: '#7d8796',
  textOnAccent: '#06121f',
  line: '#334155',
  scrollbar: '#475569',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  offline: '#94a3b8',
  chartOne: '#38bdf8',
  chartTwo: '#f472b6',
  lightBackground: '#f5f7fa',
  lightSurface: '#ffffff',
  lightText: '#111827',
};

const FIXTURES: Record<string, Partial<NebulaTheme>> = {
  default: {},
  ...Object.fromEntries(PRESETS.map((preset) => [`preset ${preset.name}`, preset.theme])),
  'every colour, glass, slim rail': {
    ...OPTIONAL_COLORS,
    font: 'outfit',
    monoFont: 'jetbrains',
    buttonStyle: 'glass',
    backgroundImage: 'https://example.com/bg.webp',
    loginBackground: '/login.jpg',
    blockOpacity: 70,
    glass: true,
    blockBorder: false,
    inputBorder: false,
    clickEffect: 'shrink',
    toastStyle: 'glassy',
    pageTransition: 'slide',
    cardEntrance: 'rise',
    hoverEffect: 'lift',
    overlayMotion: 'pop',
    animationSpeed: 'slow',
    pageTitles: false,
    boxStyle: 'fill',
    statStyle: 'minimalReversed',
    tableStyle: 'cards',
    navHover: 'iconPill',
    sidebarLayout: 'slim',
    dockPosition: 'top',
    terminalCursor: 'block',
    terminalCursorBlink: true,
  },
  'outline, reduced motion, top bar': {
    font: 'space',
    monoFont: 'fira',
    buttonStyle: 'outline',
    buttonText: '#e0f2fe',
    clickEffect: 'outline',
    pageTransition: 'fade',
    cardEntrance: 'fade',
    hoverEffect: 'glow',
    overlayMotion: 'none',
    reduceMotion: true,
    boxStyle: 'pill',
    statStyle: 'reversed',
    tableStyle: 'cards',
    navHover: 'pillSecondary',
    sidebarLayout: 'horizontal',
    dockPosition: 'header',
    terminalCursor: 'bar',
    terminalCursorBlink: true,
  },
  'filled, floating, fast': {
    buttonStyle: 'filled',
    clickEffect: 'none',
    hoverEffect: 'glow',
    overlayMotion: 'slideUp',
    animationSpeed: 'fast',
    pageTransition: 'zoom',
    boxStyle: 'line',
    statStyle: 'minimal',
    navHover: 'filled',
    sidebarLayout: 'floating',
    dockPosition: 'header',
    terminalCursor: 'underline',
  },
  'pill layout': { blockOpacity: 85, navHover: 'pill', sidebarLayout: 'pill' },
  'secondary fill menu': { navHover: 'filledSecondary', overlayMotion: 'default', pageTransition: 'blur' },
};

describe('buildCss output', () => {
  for (const [name, patch] of Object.entries(FIXTURES)) {
    test(name, (t) => {
      t.assert.snapshot(buildCss(normalizeTheme({ ...DEFAULT_THEME, ...patch })), { serializers: [lines] });
    });
  }
});
