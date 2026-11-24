import type { NebulaTheme } from './theme.ts';

/** The optional colours some presets set; the others clear them, so applying one preset over another resets them. */
const UNSET = { textMuted: '', textFaint: '', line: '', lightBackground: '', lightSurface: '', lightText: '' } as const;

/**
 * The built-in themes. The first six are colours only and leave every style field alone; Contrast, Daylight and
 * Mono also set the same style fields (fonts, radii, button, menu, box, stat, card and table styles, sidebar layout,
 * motion), so applying one of them over another resets those too. Every preset sets its text on accent (core's
 * white is too faint on Mint's bright accent for badges, checkboxes and switches, '' resets a value left by the site
 * or a preset applied before), the optional colours in `UNSET` and its terminal palette, which reads on its own
 * surface (core's dark terminal is transparent over the card).
 */
export const PRESETS: { name: string; theme: Partial<NebulaTheme> & { terminalColors: string[] } }[] = [
  {
    name: 'Mint',
    theme: {
      ...UNSET,
      accent: '#2fbf8f',
      highlight: '#b4f2dc',
      background: '#101a1b',
      surface: '#0b1314',
      text: '#e5f3ee',
      textOnAccent: '#0b1314',
      // prettier-ignore
      terminalColors: [
        '#1c2b2b', '#f2777a', '#4fd6a4', '#e8c46a', '#6cb6eb', '#d28fd8', '#5fd3d0', '#c9dcd6',
        '#6b8a85', '#ff9a9c', '#8af0c8', '#f6dd94', '#9ad0ff', '#e8b3ec', '#9cefe9', '#f2fbf8',
      ],
    },
  },
  {
    name: 'Midnight',
    theme: {
      ...UNSET,
      accent: '#1e88c7',
      highlight: '#8fe3c8',
      background: '#16122a',
      surface: '#110b21',
      text: '#e6e4f0',
      textOnAccent: '',
      // prettier-ignore
      terminalColors: [
        '#241c3d', '#ff6b8b', '#5fd7a7', '#f2c56b', '#4fa8e8', '#c592ff', '#5ad1e0', '#d4d0e6',
        '#6e6890', '#ff94ad', '#8fe3c8', '#ffdd99', '#85c4f2', '#dcb8ff', '#93e6f0', '#f4f2fb',
      ],
    },
  },
  {
    name: 'Stellar',
    theme: {
      ...UNSET,
      accent: '#3b6cde',
      highlight: '#8fb4ff',
      background: '#1b1c30',
      surface: '#222339',
      text: '#e2e4ee',
      textOnAccent: '',
      // prettier-ignore
      terminalColors: [
        '#2c2e4a', '#f47c8a', '#7fd18b', '#f0c674', '#7a9ff2', '#c49bf2', '#66c9d9', '#cfd3e6',
        '#7a7ea3', '#ff9eaa', '#a3e4ad', '#f9dc9a', '#8fb4ff', '#dabbff', '#93dfea', '#f1f3fa',
      ],
    },
  },
  {
    name: 'Emerald',
    theme: {
      ...UNSET,
      accent: '#15803d',
      highlight: '#a3e635',
      background: '#0b1610',
      surface: '#112118',
      text: '#e6f4ea',
      textOnAccent: '',
      // prettier-ignore
      terminalColors: [
        '#192b20', '#ef7a6f', '#4ade80', '#d9c060', '#5aa9d6', '#c48ac8', '#4ec9b8', '#cce0d2',
        '#6c8c77', '#ff9e94', '#a3e635', '#eedc8a', '#8cc8ec', '#deb0e0', '#8ae8db', '#eef8f1',
      ],
    },
  },
  {
    name: 'Ember',
    theme: {
      ...UNSET,
      accent: '#d9622b',
      highlight: '#ffc59b',
      background: '#1a1210',
      surface: '#130c0a',
      text: '#f1e7e2',
      textOnAccent: '',
      // prettier-ignore
      terminalColors: [
        '#2a1e1a', '#f0614a', '#a5c25c', '#f2b14c', '#6f9fd8', '#d58ab0', '#6cc0b0', '#dccfc8',
        '#8a7268', '#ff8f78', '#c4dd85', '#ffc59b', '#9cc0eb', '#eab0cc', '#98dccf', '#fbf3ef',
      ],
    },
  },
  {
    name: 'Graphite',
    theme: {
      ...UNSET,
      accent: '#6c7cff',
      highlight: '#b9c0ff',
      background: '#16171b',
      surface: '#101114',
      text: '#e7e8ec',
      textOnAccent: '',
      // prettier-ignore
      terminalColors: [
        '#24262d', '#ff6b6b', '#69d29a', '#f0c75e', '#7686ff', '#c58af9', '#5ccfe6', '#d0d2d9',
        '#70737e', '#ff9393', '#95e6b9', '#f7dc8f', '#b9c0ff', '#dbb5fc', '#93e2f2', '#f5f6f8',
      ],
    },
  },
  {
    name: 'Contrast',
    theme: {
      ...UNSET,
      accent: '#ffcc00',
      highlight: '#00e5ff',
      background: '#050505',
      surface: '#0f0f0f',
      text: '#ffffff',
      textOnAccent: '#000000',
      textMuted: '#d0d0d0',
      textFaint: '#a8a8a8',
      line: '#6b6b6b',
      // prettier-ignore
      terminalColors: [
        '#2a2a2a', '#ff5555', '#50fa7b', '#ffe14d', '#5cb3ff', '#ff79c6', '#4ff0ff', '#e6e6e6',
        '#a0a0a0', '#ff8080', '#8dffac', '#fff08a', '#99ceff', '#ffa6dc', '#9ef7ff', '#ffffff',
      ],
      font: 'jakarta',
      monoFont: 'jetbrains',
      buttonStyle: 'filled',
      radius: 6,
      elementRadius: 4,
      blockBorder: true,
      inputBorder: true,
      clickEffect: 'outline',
      toastStyle: 'default',
      pageTransition: 'fade',
      cardEntrance: 'none',
      hoverEffect: 'glow',
      overlayMotion: 'default',
      boxStyle: 'line',
      statStyle: 'default',
      serverCardStyle: 'flat',
      tableStyle: 'table',
      navHover: 'filled',
      sidebarLayout: 'default',
    },
  },
  {
    name: 'Daylight',
    theme: {
      ...UNSET,
      accent: '#2f6fbf',
      highlight: '#e0a458',
      background: '#1c1f24',
      surface: '#23272e',
      text: '#e6e8eb',
      textOnAccent: '',
      lightBackground: '#f3f0e9',
      lightSurface: '#fffdf8',
      lightText: '#221e1a',
      // prettier-ignore
      terminalColors: [
        '#323842', '#e5786d', '#8cc07a', '#e3bb67', '#6fa8e2', '#c391d9', '#67c3c0', '#cdd5dd',
        '#808b97', '#f59a90', '#aed79f', '#f0d293', '#96c2ee', '#d9b5e8', '#97dcd9', '#f3f6f8',
      ],
      font: 'outfit',
      monoFont: 'fira',
      buttonStyle: 'tinted',
      radius: 16,
      elementRadius: 10,
      blockBorder: true,
      inputBorder: true,
      clickEffect: 'shrink',
      toastStyle: 'glassy',
      pageTransition: 'fadeUp',
      cardEntrance: 'rise',
      hoverEffect: 'lift',
      overlayMotion: 'pop',
      boxStyle: 'fill',
      statStyle: 'reversed',
      serverCardStyle: 'banner',
      tableStyle: 'cards',
      navHover: 'pill',
      sidebarLayout: 'floating',
    },
  },
  {
    name: 'Mono',
    theme: {
      ...UNSET,
      accent: '#a9b1ba',
      highlight: '#e0e0e0',
      background: '#141414',
      surface: '#1b1b1b',
      text: '#ededed',
      textOnAccent: '#141414',
      // prettier-ignore
      terminalColors: [
        '#2e2e2e', '#d08a8a', '#9cbf9c', '#cfc49a', '#94a8c4', '#b9a0bf', '#98bcbc', '#cfcfcf',
        '#808080', '#e3aaaa', '#b9d6b9', '#e3dbb8', '#b5c5db', '#d2bfd7', '#b8d6d6', '#f2f2f2',
      ],
      font: 'space',
      monoFont: 'jetbrains',
      buttonStyle: 'outline',
      radius: 4,
      elementRadius: 2,
      blockBorder: true,
      inputBorder: true,
      clickEffect: 'drop',
      toastStyle: 'default',
      pageTransition: 'slide',
      cardEntrance: 'fade',
      hoverEffect: 'none',
      overlayMotion: 'slideUp',
      boxStyle: 'pill',
      statStyle: 'minimal',
      serverCardStyle: 'linear',
      tableStyle: 'table',
      navHover: 'iconPill',
      sidebarLayout: 'default',
    },
  },
];

/** The editor's terminal palettes: core's own (`[]`, nothing stored) first, then one per preset. */
export const TERMINAL_PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: 'core', name: 'Core', colors: [] },
  ...PRESETS.map((preset) => ({
    id: preset.name.toLowerCase(),
    name: preset.name,
    colors: preset.theme.terminalColors,
  })),
];

const COLOR_ONLY_KEYS = new Set<keyof NebulaTheme>([
  'accent',
  'highlight',
  'background',
  'surface',
  'text',
  'textOnAccent',
  'textMuted',
  'textFaint',
  'line',
  'surfaceRaised',
  'surfaceOverlay',
  'scrollbar',
  'buttonColor',
  'buttonText',
  'success',
  'warning',
  'danger',
  'offline',
  'chartOne',
  'chartTwo',
  'lightBackground',
  'lightSurface',
  'lightText',
  'terminalColors',
]);

/** True when a preset changes layout, typography, shapes or motion in addition to colours. */
export const isFullStylePreset = (theme: Partial<NebulaTheme>): boolean =>
  (Object.keys(theme) as (keyof NebulaTheme)[]).some((key) => !COLOR_ONLY_KEYS.has(key));

const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  return false;
};

/** True when every field a preset sets already matches the current theme. */
export const presetMatchesTheme = (preset: Partial<NebulaTheme>, current: NebulaTheme): boolean => {
  const entries = Object.entries(preset) as [keyof NebulaTheme, unknown][];
  return entries.length > 0 && entries.every(([key, value]) => sameValue(value, current[key]));
};
