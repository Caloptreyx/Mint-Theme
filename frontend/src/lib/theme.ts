export type Font = 'exo' | 'montserrat' | 'panel';
export const BUTTON_STYLES = ['filled', 'tinted', 'outline', 'glass'] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

export interface Article {
  title: string;
  description: string;
  url: string;
}

export const MAX_ARTICLES = 6;

export const HOME_CARDS = ['information', 'installed', 'articles', 'console', 'usage', 'network'] as const;
export type HomeCardId = (typeof HOME_CARDS)[number];
export type HomeColumn = 'left' | 'right';

export interface HomeCard {
  id: HomeCardId;
  column: HomeColumn;
  enabled: boolean;
}

export const DEFAULT_LAYOUT: HomeCard[] = [
  { id: 'information', column: 'left', enabled: true },
  { id: 'installed', column: 'left', enabled: true },
  { id: 'articles', column: 'left', enabled: true },
  { id: 'console', column: 'right', enabled: true },
  { id: 'usage', column: 'right', enabled: true },
  { id: 'network', column: 'right', enabled: true },
];

export interface EggImages {
  banner: string;
  icon: string;
}

const MAX_EGGS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface NebulaTheme {
  accent: string;
  highlight: string;
  background: string;
  surface: string;
  text: string;
  font: Font;
  buttonStyle: ButtonStyle;
  /** Every colour below is optional; empty means it is derived from the five above. */
  buttonColor: string;
  buttonText: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  textMuted: string;
  textFaint: string;
  textOnAccent: string;
  line: string;
  success: string;
  warning: string;
  danger: string;
  offline: string;
  chartOne: string;
  chartTwo: string;
  sidebarGroups: boolean;
  radius: number;
  elementRadius: number;
  backgroundImage: string;
  backgroundDim: number;
  homeBanner: string;
  articles: Article[];
  eggs: Record<string, EggImages>;
  layout: HomeCard[];
}

export const DEFAULT_THEME: NebulaTheme = {
  accent: '#1e88c7',
  highlight: '#8fe3c8',
  background: '#16122a',
  surface: '#110b21',
  text: '#e6e4f0',
  font: 'exo',
  buttonStyle: 'tinted',
  buttonColor: '',
  buttonText: '',
  surfaceRaised: '',
  surfaceOverlay: '',
  textMuted: '',
  textFaint: '',
  textOnAccent: '',
  line: '',
  success: '',
  warning: '',
  danger: '',
  offline: '',
  chartOne: '',
  chartTwo: '',
  sidebarGroups: true,
  radius: 10,
  elementRadius: 6,
  backgroundImage: '',
  backgroundDim: 75,
  homeBanner: '',
  articles: [],
  eggs: {},
  layout: DEFAULT_LAYOUT,
};

export const PRESETS: { name: string; theme: Partial<NebulaTheme> }[] = [
  {
    name: 'Nebula',
    theme: { accent: '#1e88c7', highlight: '#8fe3c8', background: '#16122a', surface: '#110b21', text: '#e6e4f0' },
  },
  {
    name: 'Stellar',
    theme: { accent: '#3b6cde', highlight: '#8fb4ff', background: '#1b1c30', surface: '#222339', text: '#e2e4ee' },
  },
  {
    name: 'Emerald',
    theme: { accent: '#1f9d74', highlight: '#9be7c4', background: '#0f1a16', surface: '#0b1411', text: '#e3efe9' },
  },
  {
    name: 'Ember',
    theme: { accent: '#d9622b', highlight: '#ffc59b', background: '#1a1210', surface: '#130c0a', text: '#f1e7e2' },
  },
  {
    name: 'Graphite',
    theme: { accent: '#6c7cff', highlight: '#b9c0ff', background: '#16171b', surface: '#101114', text: '#e7e8ec' },
  },
];

const HEX = /^#[0-9a-f]{6}$/i;
// anything that could close the url("...") or the rule it sits in is refused outright
const SAFE_URL = /^(https?:\/\/|\/)[^\s"'()\\<>;{}]+$/i;

const clamp = (n: unknown, min: number, max: number, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;

/** '' keeps the derived default; anything else must be a hex colour. */
const optional = (v: unknown, fallback: string) => (v === '' ? '' : color(v, fallback));

const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);

const url = (v: unknown, fallback: string) => (typeof v === 'string' && (v === '' || SAFE_URL.test(v)) ? v : fallback);

const text = (v: unknown, max: number, fallback: string) => (typeof v === 'string' ? v.slice(0, max) : fallback);

function articles(v: unknown, fallback: Article[]): Article[] {
  if (!Array.isArray(v)) return fallback;
  return v.slice(0, MAX_ARTICLES).map((a) => {
    const r = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
    return { title: text(r.title, 80, ''), description: text(r.description, 140, ''), url: url(r.url, '') };
  });
}

/**
 * Every value ends up inside a stylesheet served to all visitors, so nothing unchecked gets through.
 * Invalid fields fall back one by one, which also keeps half-typed colours from flashing in the editor.
 */
function eggs(v: unknown, fallback: Record<string, EggImages>): Record<string, EggImages> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fallback;
  const out: Record<string, EggImages> = {};
  for (const [uuid, raw] of Object.entries(v).slice(0, MAX_EGGS)) {
    if (!UUID.test(uuid) || !raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const images = { banner: url(r.banner, ''), icon: url(r.icon, '') };
    if (images.banner || images.icon) out[uuid] = images;
  }
  return out;
}

/** Keeps the saved order, drops anything unknown and appends cards added in a later version. */
function layout(v: unknown): HomeCard[] {
  const saved = Array.isArray(v) ? v : [];
  const out: HomeCard[] = [];

  for (const raw of saved) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const id = HOME_CARDS.find((card) => card === r.id);
    if (!id || out.some((card) => card.id === id)) continue;
    out.push({ id, column: r.column === 'right' ? 'right' : 'left', enabled: r.enabled !== false });
  }

  for (const card of DEFAULT_LAYOUT) {
    if (!out.some((existing) => existing.id === card.id)) out.push(card);
  }

  return out;
}

export function normalizeTheme(raw: unknown, d: NebulaTheme = DEFAULT_THEME): NebulaTheme {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  return {
    accent: color(r.accent, d.accent),
    highlight: color(r.highlight, d.highlight),
    background: color(r.background, d.background),
    surface: color(r.surface, d.surface),
    text: color(r.text, d.text),
    font: r.font === 'panel' || r.font === 'exo' || r.font === 'montserrat' ? r.font : d.font,
    buttonStyle: BUTTON_STYLES.find((style) => style === r.buttonStyle) ?? d.buttonStyle,
    buttonColor: optional(r.buttonColor, d.buttonColor),
    buttonText: optional(r.buttonText, d.buttonText),
    surfaceRaised: optional(r.surfaceRaised, d.surfaceRaised),
    surfaceOverlay: optional(r.surfaceOverlay, d.surfaceOverlay),
    textMuted: optional(r.textMuted, d.textMuted),
    textFaint: optional(r.textFaint, d.textFaint),
    textOnAccent: optional(r.textOnAccent, d.textOnAccent),
    line: optional(r.line, d.line),
    success: optional(r.success, d.success),
    warning: optional(r.warning, d.warning),
    danger: optional(r.danger, d.danger),
    offline: optional(r.offline, d.offline),
    chartOne: optional(r.chartOne, d.chartOne),
    chartTwo: optional(r.chartTwo, d.chartTwo),
    sidebarGroups: typeof r.sidebarGroups === 'boolean' ? r.sidebarGroups : d.sidebarGroups,
    radius: clamp(r.radius, 0, 24, d.radius),
    elementRadius: clamp(r.elementRadius, 0, 20, d.elementRadius),
    backgroundImage: url(r.backgroundImage, d.backgroundImage),
    backgroundDim: clamp(r.backgroundDim, 0, 100, d.backgroundDim),
    homeBanner: url(r.homeBanner, d.homeBanner),
    articles: articles(r.articles, d.articles),
    eggs: eggs(r.eggs, d.eggs),
    layout: layout(r.layout),
  };
}

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (rgb: Rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** `weight` is how much of `a` ends up in the result. */
export function mix(a: string, b: string, weight: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] * weight + y[i] * (1 - weight)) as Rgb);
}

const alpha = (hex: string, a: number) => `rgba(${toRgb(hex).join(', ')}, ${a})`;

const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Mantine-style 10 shade scale with the picked colour at index 6. */
export function accentShades(accent: string): string[] {
  return [
    ...[0.1, 0.22, 0.4, 0.58, 0.76, 0.9].map((w) => mix(accent, '#ffffff', w)),
    accent,
    ...[0.84, 0.7, 0.56].map((w) => mix(accent, '#000000', w)),
  ];
}

/** Mantine's dark scale: 0 is text, 4 borders, 6 cards, 7 the page. */
export function surfaceShades(t: NebulaTheme): string[] {
  const { text, background, surface } = t;
  return [
    text,
    mix(text, background, 0.8),
    mix(text, background, 0.58),
    mix(text, background, 0.4),
    mix(text, background, 0.14),
    mix(text, background, 0.08),
    surface,
    background,
    mix(background, '#000000', 0.75),
    mix(background, '#000000', 0.55),
  ];
}

/** `--button-bg` is the per-colour value Mantine sets inline, so each colour keeps its own shade. */
const BUTTON = 'html:root .mantine-Button-root[data-variant="filled"]:not([data-disabled]):not(:disabled)';
const INK = 'var(--nebula-button-ink)';

const BUTTON_CSS: Record<ButtonStyle, string> = {
  filled: '',
  tinted: `${BUTTON}{background-color:color-mix(in srgb,var(--button-bg) 22%,transparent)!important;border:1px solid color-mix(in srgb,var(--button-bg) 62%,transparent)!important;color:color-mix(in srgb,var(--button-bg) 55%,${INK})!important;}
${BUTTON}:hover{background-color:color-mix(in srgb,var(--button-bg) 34%,transparent)!important;}`,
  outline: `${BUTTON}{background-color:transparent!important;border:1px solid color-mix(in srgb,var(--button-bg) 70%,transparent)!important;color:color-mix(in srgb,var(--button-bg) 55%,${INK})!important;}
${BUTTON}:hover{background-color:color-mix(in srgb,var(--button-bg) 18%,transparent)!important;}`,
  glass: `${BUTTON}{background-color:color-mix(in srgb,var(--button-bg) 28%,transparent)!important;border:1px solid color-mix(in srgb,${INK} 22%,transparent)!important;color:color-mix(in srgb,var(--button-bg) 70%,${INK})!important;backdrop-filter:blur(10px);box-shadow:inset 0 1px 0 color-mix(in srgb,${INK} 12%,transparent);}
${BUTTON}:hover{background-color:color-mix(in srgb,var(--button-bg) 40%,transparent)!important;}`,
};

/** The colour each optional field falls back to, so the editor can show what is really painted. */
export function derivedColors(t: NebulaTheme) {
  const blue = accentShades(t.accent);
  const dark = surfaceShades(t);

  return {
    surfaceRaised: mix(t.text, t.background, 0.05),
    surfaceOverlay: mix(t.text, t.background, 0.1),
    textMuted: dark[2],
    textFaint: dark[3],
    textOnAccent: luminance(t.accent) > 0.45 ? '#0b0b10' : '#ffffff',
    line: dark[4],
    buttonColor: t.accent,
    buttonText: '#ffffff',
    success: '#40c057',
    warning: '#fab005',
    danger: '#fa5252',
    offline: '#868e96',
    chartOne: blue[4],
    chartTwo: '#facc15',
  };
}

const FONT_STACKS: Partial<Record<Font, string>> = {
  exo: "'Exo 2', Helvetica, Arial, sans-serif",
  montserrat: "'Montserrat', Helvetica, Arial, sans-serif",
};

export function buildCss(t: NebulaTheme): string {
  const blue = accentShades(t.accent);
  const dark = surfaceShades(t);
  const vars = (entries: [string, string][]) => entries.map(([k, v]) => `${k}:${v};`).join('');
  const scale = (name: string, shades: string[]) =>
    shades.map((v, i) => [`--mantine-color-${name}-${i}`, v] as [string, string]);
  const contrast = luminance(t.accent) > 0.45 ? '#0b0b10' : '#ffffff';

  const shared: [string, string][] = [
    ...scale('blue', blue),
    ...scale('dark', dark),
    ['--nebula-highlight', t.highlight],
    ['--mantine-primary-color-contrast', t.textOnAccent || contrast],
    ['--mantine-radius-xs', `${Math.round(t.elementRadius * 0.6)}px`],
    ['--mantine-radius-sm', `${t.elementRadius}px`],
    ['--mantine-radius-default', `${t.elementRadius}px`],
    ['--mantine-radius-md', `${t.radius}px`],
    ['--mantine-radius-lg', `${t.radius + 4}px`],
  ];
  const stack = FONT_STACKS[t.font];
  if (stack) {
    shared.push(['--mantine-font-family', stack], ['--mantine-font-family-headings', stack], ['--font-sans', stack]);
  }

  const darkScheme: [string, string][] = [
    ['--nebula-card', dark[6]],
    ['--nebula-button-ink', '#ffffff'],
    ['--mantine-color-body', dark[7]],
    ['--mantine-color-text', dark[0]],
    ['--mantine-color-dimmed', t.textMuted || dark[2]],
    ['--mantine-color-placeholder', t.textFaint || dark[3]],
    ['--mantine-color-default', t.surfaceRaised || mix(t.text, t.background, 0.05)],
    ['--mantine-color-default-hover', t.surfaceOverlay || mix(t.text, t.background, 0.1)],
    ['--mantine-color-default-border', t.line || dark[4]],
    ['--mantine-color-anchor', blue[4]],
    ['--mantine-color-blue-filled', blue[6]],
    ['--mantine-color-blue-filled-hover', blue[5]],
    ['--mantine-color-blue-light', alpha(t.accent, 0.2)],
    ['--mantine-color-blue-light-hover', alpha(t.accent, 0.28)],
    ['--mantine-color-blue-light-color', blue[3]],
    ['--mantine-color-blue-outline', blue[4]],
    ['--mantine-color-blue-outline-hover', alpha(blue[4], 0.08)],
    ['--mantine-color-blue-text', blue[4]],
    ['--chart-series-1', t.chartOne || blue[4]],
  ];

  const lightScheme: [string, string][] = [
    ['--nebula-card', '#ffffff'],
    ['--nebula-button-ink', '#000000'],
    ['--nebula-highlight', mix(t.highlight, '#000000', 0.55)],
    ['--mantine-color-anchor', blue[6]],
    ['--mantine-color-blue-filled', blue[6]],
    ['--mantine-color-blue-filled-hover', blue[7]],
    ['--mantine-color-blue-light', alpha(t.accent, 0.1)],
    ['--mantine-color-blue-light-hover', alpha(t.accent, 0.14)],
    ['--mantine-color-blue-light-color', blue[7]],
    ['--mantine-color-blue-outline', blue[6]],
    ['--mantine-color-blue-outline-hover', alpha(t.accent, 0.05)],
    ['--mantine-color-blue-text', blue[7]],
    ['--chart-series-1', blue[6]],
  ];

  // status colours repaint the whole Mantine palette they belong to, plus the server state dots
  const status: [string, string, string][] = [
    [t.success, 'green', 'running'],
    [t.warning, 'yellow', 'starting'],
    [t.danger, 'red', 'offline'],
  ];
  for (const [value, name] of status) {
    if (!value) continue;
    const shades = accentShades(value);
    shared.push(
      ...scale(name, shades),
      [`--mantine-color-${name}-filled`, shades[6]],
      [`--mantine-color-${name}-filled-hover`, shades[5]],
      [`--mantine-color-${name}-light`, alpha(value, 0.2)],
      [`--mantine-color-${name}-light-hover`, alpha(value, 0.28)],
      [`--mantine-color-${name}-light-color`, shades[3]],
      [`--mantine-color-${name}-outline`, shades[4]],
      [`--mantine-color-${name}-text`, shades[4]],
    );
  }
  if (t.success) shared.push(['--color-server-status-running', t.success]);
  if (t.warning)
    shared.push(['--color-server-status-starting', t.warning], ['--color-server-status-stopping', t.warning]);
  if (t.danger) shared.push(['--color-server-status-offline', t.danger]);
  if (t.offline) {
    const shades = accentShades(t.offline);
    shared.push(
      ...scale('gray', shades),
      ['--mantine-color-gray-filled', shades[6]],
      ['--mantine-color-gray-light', alpha(t.offline, 0.2)],
      ['--mantine-color-gray-light-color', shades[3]],
      ['--mantine-color-gray-text', shades[4]],
    );
  }
  if (t.chartTwo) shared.push(['--chart-series-2', t.chartTwo]);

  // html:root outranks both Mantine's :root rules and the panel's pinned scheme overrides
  const css = [
    `html:root{${vars(shared)}}`,
    `html:root[data-mantine-color-scheme="dark"]{${vars(darkScheme)}}`,
    `html:root[data-mantine-color-scheme="light"]{${vars(lightScheme)}}`,
  ];

  if (BUTTON_CSS[t.buttonStyle]) css.push(BUTTON_CSS[t.buttonStyle]);

  if (t.buttonText) {
    css.push(
      `html:root .mantine-Button-root[data-variant="filled"]:not([data-disabled]):not(:disabled){color:${t.buttonText}!important;}`,
    );
  }

  if (t.buttonColor) {
    // Redefining the accent vars ON the button makes its own inline `var(--mantine-color-blue-*)`
    // reference resolve to these, so red and green buttons keep their own colours.
    const shades = accentShades(t.buttonColor);
    css.push(
      `html:root .mantine-Button-root,html:root .mantine-ActionIcon-root{${vars([
        ['--mantine-color-blue-filled', shades[6]],
        ['--mantine-color-blue-filled-hover', shades[5]],
        ['--mantine-color-blue-light', alpha(t.buttonColor, 0.2)],
        ['--mantine-color-blue-light-hover', alpha(t.buttonColor, 0.28)],
        ['--mantine-color-blue-light-color', shades[3]],
        ['--mantine-color-blue-outline', shades[4]],
        ['--mantine-color-blue-outline-hover', alpha(shades[4], 0.08)],
      ])}}`,
    );
  }

  if (t.backgroundImage) {
    const dim = alpha(t.background, t.backgroundDim / 100);
    css.push(
      `html:root[data-mantine-color-scheme="dark"]{background-image:linear-gradient(${dim},${dim}),url("${t.backgroundImage}");}`,
    );
  }

  return css.join('\n');
}
