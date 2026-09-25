export const FONTS = ['exo', 'montserrat', 'outfit', 'jakarta', 'space', 'panel'] as const;
export type Font = (typeof FONTS)[number];
export const MONO_FONTS = ['panel', 'jetbrains', 'fira'] as const;
export type MonoFont = (typeof MONO_FONTS)[number];
export const BUTTON_STYLES = ['filled', 'tinted', 'outline', 'glass'] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export const CLICK_EFFECTS = ['none', 'drop', 'shrink', 'outline'] as const;
export type ClickEffect = (typeof CLICK_EFFECTS)[number];
export const TOAST_STYLES = ['default', 'glassy'] as const;
export type ToastStyle = (typeof TOAST_STYLES)[number];
export const PAGE_TRANSITIONS = ['none', 'fade', 'fadeUp', 'fadeScale'] as const;
export type PageTransition = (typeof PAGE_TRANSITIONS)[number];
export const BOX_STYLES = ['default', 'line', 'fill', 'pill'] as const;
export type BoxStyle = (typeof BOX_STYLES)[number];
export const STAT_STYLES = ['default', 'reversed', 'minimal', 'minimalReversed'] as const;
export type StatStyle = (typeof STAT_STYLES)[number];
/** The servers grid's cards: 'default' is the art header with the name over it. */
export const SERVER_CARD_STYLES = ['default', 'banner', 'flat', 'linear', 'minimal', 'compact'] as const;
export type ServerCardStyle = (typeof SERVER_CARD_STYLES)[number];
/** 'cards' turns every row of core's tables (and the servers list) into its own rounded card. */
export const TABLE_STYLES = ['table', 'cards'] as const;
export type TableStyle = (typeof TABLE_STYLES)[number];
/** Sidebar links when hovered and when current; 'default' is core's hover and app.css's accent tint. */
export const NAV_HOVERS = ['default', 'filled', 'filledSecondary', 'iconPill', 'pill', 'pillSecondary'] as const;
export type NavHover = (typeof NAV_HOVERS)[number];
/** Under the sidebar logo: 'palette' is core's Quick actions button, with its server switcher at the bottom. */
export const SEARCH_COMPONENTS = ['palette', 'serverSelector', 'searchBar'] as const;
export type SearchComponent = (typeof SEARCH_COMPONENTS)[number];
/** Desktop navigation: 'default' is the flush full height sidebar (app.css); below lg every layout is core's drawer. */
export const SIDEBAR_LAYOUTS = ['default', 'floating', 'pill', 'slim', 'horizontal'] as const;
export type SidebarLayout = (typeof SIDEBAR_LAYOUTS)[number];
/** Where the sidebar's header block (logo, search, the server block) sits; the horizontal layout ignores it. */
export const DOCK_POSITIONS = ['sidebar', 'header', 'top'] as const;
export type DockPosition = (typeof DOCK_POSITIONS)[number];

export interface Article {
  title: string;
  description: string;
  url: string;
}

export const MAX_ARTICLES = 6;

/** Auth pages: 'default' is core's centred card, the banner layouts add an image beside the form. */
export const AUTH_LAYOUTS = ['default', 'flat', 'sideBanner', 'floatingBanner', 'panels'] as const;
export type AuthLayout = (typeof AUTH_LAYOUTS)[number];
/** Where the logo and the support links sit on auth pages; core puts its logo above the form. */
export const AUTH_POSITIONS = ['aboveForm', 'header'] as const;
export type AuthPosition = (typeof AUTH_POSITIONS)[number];
export const SUPPORT_LINK_ICONS = ['discord', 'github', 'docs', 'status', 'mail', 'link'] as const;
export type SupportLinkIcon = (typeof SUPPORT_LINK_ICONS)[number];

export interface SupportLink {
  label: string;
  url: string;
  icon?: SupportLinkIcon;
}

export const MAX_SUPPORT_LINKS = 4;
export const MAX_SUPPORT_LINK_LABEL = 30;

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

/** Console page pieces; the terminal is fixed in the middle, these go in the slots around it. */
export const CONSOLE_WIDGETS = [
  'banner',
  'stats',
  'info',
  'cpuChart',
  'memoryChart',
  'networkChart',
  'extensionCards',
] as const;
export type ConsoleWidget = (typeof CONSOLE_WIDGETS)[number];
export const CONSOLE_SLOTS = ['top', 'left', 'right', 'bottom'] as const;
export type ConsoleSlot = (typeof CONSOLE_SLOTS)[number];
export type ConsoleLayout = Record<ConsoleSlot, ConsoleWidget[]>;

/** The console page as it was before the layout became editable: banner, terminal, extension cards, charts. */
export const DEFAULT_CONSOLE_LAYOUT: ConsoleLayout = {
  top: ['banner'],
  left: [],
  right: [],
  bottom: ['extensionCards', 'cpuChart', 'memoryChart', 'networkChart'],
};

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
  /** Auth pages only; '' keeps the normal background and the panel's own logo. */
  loginBackground: string;
  loginDim: number;
  loginLogo: string;
  monoFont: MonoFont;
  /** Light mode only; '' derives them from the five main colours. */
  lightBackground: string;
  lightSurface: string;
  lightText: string;
  /** Cards and bordered papers (the sidebar is a card): 100 is solid, below that the page shows through. */
  blockOpacity: number;
  /** Blurs what shows through translucent blocks. */
  glass: boolean;
  blockBorder: boolean;
  /** Without it inputs get a filled background instead, like Mantine's `filled` variant. */
  inputBorder: boolean;
  /** Press feedback on buttons and action icons; 'drop' is Mantine's own 1px nudge. */
  clickEffect: ClickEffect;
  /** 'glassy' is a translucent tinted toast with an icon tile and a countdown bar. */
  toastStyle: ToastStyle;
  /** Plays on the page content (never the sidebar) when the route changes. */
  pageTransition: PageTransition;
  /** The title row of core's server pages; its search box and buttons stay either way. */
  pageTitles: boolean;
  /** The title row of titled cards: 'default' is core's band with a divider line. */
  boxStyle: BoxStyle;
  /** Core's stat tiles: 'default' is core's icon square on the left of the label and value. */
  statStyle: StatStyle;
  /** Widgets around the console terminal, each used at most once. */
  consoleLayout: ConsoleLayout;
  /** Auth pages; the defaults are core's own: a card under the logo, no links. */
  authLayout: AuthLayout;
  authLogoPosition: AuthPosition;
  supportLinks: SupportLink[];
  supportLinksPosition: AuthPosition;
  /** The servers grid's cards; the grid's columns follow the style. */
  serverCardStyle: ServerCardStyle;
  tableStyle: TableStyle;
  navHover: NavHover;
  searchComponent: SearchComponent;
  sidebarLayout: SidebarLayout;
  dockPosition: DockPosition;
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
  loginBackground: '',
  loginDim: 75,
  loginLogo: '',
  monoFont: 'panel',
  lightBackground: '',
  lightSurface: '',
  lightText: '',
  blockOpacity: 100,
  glass: false,
  blockBorder: true,
  inputBorder: true,
  clickEffect: 'drop',
  toastStyle: 'default',
  pageTransition: 'none',
  pageTitles: true,
  boxStyle: 'default',
  statStyle: 'default',
  consoleLayout: DEFAULT_CONSOLE_LAYOUT,
  authLayout: 'default',
  authLogoPosition: 'aboveForm',
  supportLinks: [],
  supportLinksPosition: 'header',
  serverCardStyle: 'default',
  tableStyle: 'table',
  navHover: 'default',
  searchComponent: 'palette',
  sidebarLayout: 'default',
  dockPosition: 'sidebar',
};

export const PRESETS: { name: string; theme: Partial<NebulaTheme> }[] = [
  {
    name: 'Mint',
    theme: { accent: '#2fbf8f', highlight: '#b4f2dc', background: '#101a1b', surface: '#0b1314', text: '#e5f3ee' },
  },
  {
    name: 'Midnight',
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
// anything that could close the url("...") or the rule it sits in is refused outright; `//host` is
// protocol relative (another origin), not root relative, so a leading `/` must not be followed by another
export const SAFE_URL = /^(https?:\/\/|\/(?!\/))[^\s"'()\\<>;{}]+$/i;

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

/** Links without a label or a safe URL are dropped; the icon is optional and allow listed. */
function supportLinks(v: unknown, fallback: SupportLink[]): SupportLink[] {
  if (!Array.isArray(v)) return fallback;
  const out: SupportLink[] = [];
  for (const raw of v.slice(0, MAX_SUPPORT_LINKS)) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const label = typeof r.label === 'string' ? r.label.trim().slice(0, MAX_SUPPORT_LINK_LABEL) : '';
    const href = url(r.url, '');
    if (!label || !href) continue;
    const icon = SUPPORT_LINK_ICONS.find((name) => name === r.icon);
    out.push(icon ? { label, url: href, icon } : { label, url: href });
  }
  return out;
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

/** Each widget at most once (first slot wins), unknown ids dropped; anything but four arrays is the fallback. */
function consoleLayout(v: unknown, fallback: ConsoleLayout): ConsoleLayout {
  const r = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const valid = CONSOLE_SLOTS.every((slot) => Array.isArray(r[slot]));
  const out: ConsoleLayout = { top: [], left: [], right: [], bottom: [] };
  const seen = new Set<ConsoleWidget>();

  for (const slot of CONSOLE_SLOTS) {
    const saved = valid ? (r[slot] as unknown[]) : fallback[slot];
    for (const raw of saved) {
      if (seen.size === CONSOLE_WIDGETS.length) break;
      const id = CONSOLE_WIDGETS.find((widget) => widget === raw);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out[slot].push(id);
    }
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
    font: FONTS.find((font) => font === r.font) ?? d.font,
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
    loginBackground: url(r.loginBackground, d.loginBackground),
    loginDim: clamp(r.loginDim, 0, 100, d.loginDim),
    loginLogo: url(r.loginLogo, d.loginLogo),
    monoFont: MONO_FONTS.find((font) => font === r.monoFont) ?? d.monoFont,
    lightBackground: optional(r.lightBackground, d.lightBackground),
    lightSurface: optional(r.lightSurface, d.lightSurface),
    lightText: optional(r.lightText, d.lightText),
    blockOpacity: clamp(r.blockOpacity, 0, 100, d.blockOpacity),
    glass: typeof r.glass === 'boolean' ? r.glass : d.glass,
    blockBorder: typeof r.blockBorder === 'boolean' ? r.blockBorder : d.blockBorder,
    inputBorder: typeof r.inputBorder === 'boolean' ? r.inputBorder : d.inputBorder,
    clickEffect: CLICK_EFFECTS.find((effect) => effect === r.clickEffect) ?? d.clickEffect,
    toastStyle: TOAST_STYLES.find((style) => style === r.toastStyle) ?? d.toastStyle,
    pageTransition: PAGE_TRANSITIONS.find((transition) => transition === r.pageTransition) ?? d.pageTransition,
    pageTitles: typeof r.pageTitles === 'boolean' ? r.pageTitles : d.pageTitles,
    boxStyle: BOX_STYLES.find((style) => style === r.boxStyle) ?? d.boxStyle,
    statStyle: STAT_STYLES.find((style) => style === r.statStyle) ?? d.statStyle,
    consoleLayout: consoleLayout(r.consoleLayout, d.consoleLayout),
    authLayout: AUTH_LAYOUTS.find((layout) => layout === r.authLayout) ?? d.authLayout,
    authLogoPosition: AUTH_POSITIONS.find((position) => position === r.authLogoPosition) ?? d.authLogoPosition,
    supportLinks: supportLinks(r.supportLinks, d.supportLinks),
    supportLinksPosition:
      AUTH_POSITIONS.find((position) => position === r.supportLinksPosition) ?? d.supportLinksPosition,
    serverCardStyle: SERVER_CARD_STYLES.find((style) => style === r.serverCardStyle) ?? d.serverCardStyle,
    tableStyle: TABLE_STYLES.find((style) => style === r.tableStyle) ?? d.tableStyle,
    navHover: NAV_HOVERS.find((hover) => hover === r.navHover) ?? d.navHover,
    searchComponent: SEARCH_COMPONENTS.find((search) => search === r.searchComponent) ?? d.searchComponent,
    sidebarLayout: SIDEBAR_LAYOUTS.find((layout) => layout === r.sidebarLayout) ?? d.sidebarLayout,
    dockPosition: DOCK_POSITIONS.find((position) => position === r.dockPosition) ?? d.dockPosition,
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

const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** `c` pulled toward `ink` just far enough to read on `paper`, so bright accents stay legible in light mode. */
const readable = (c: string, ink: string, paper: string, ratio = 4.5) =>
  [1, 0.84, 0.7, 0.56, 0.42, 0.28].map((w) => mix(c, ink, w)).find((v) => contrastRatio(v, paper) >= ratio) ?? ink;

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

/** Light mode's base colours: the dark page becomes the ink, the surfaces near white with a hint of accent. */
function lightBase(t: NebulaTheme) {
  const text = t.lightText || (luminance(t.background) < 0.05 ? t.background : mix(t.accent, '#000000', 0.15));
  return {
    background: t.lightBackground || mix(t.accent, mix(text, '#ffffff', 0.05), 0.06),
    surface: t.lightSurface || mix(t.accent, '#ffffff', 0.025),
    text,
  };
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
  const light = lightBase(t);

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
    lightBackground: light.background,
    lightSurface: light.surface,
    lightText: light.text,
  };
}

const FONT_STACKS: Partial<Record<Font, string>> = {
  exo: "'Exo 2', Helvetica, Arial, sans-serif",
  montserrat: "'Montserrat', Helvetica, Arial, sans-serif",
  outfit: "'Outfit', Helvetica, Arial, sans-serif",
  jakarta: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif",
  space: "'Space Grotesk', Helvetica, Arial, sans-serif",
};

/** Also read by the console terminal, which draws on a canvas and never sees the CSS variables. */
export const MONO_FONT_STACKS: Partial<Record<MonoFont, string>> = {
  jetbrains: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
  fira: "'Fira Code', ui-monospace, Menlo, Consolas, monospace",
};

/** Page transitions; the keyframes live in app.css, which the editor's option tiles play too (slowed down). */
export const PAGE_ANIMATIONS: Record<
  Exclude<PageTransition, 'none'>,
  { keyframes: string; ms: number; easing: string }
> = {
  fade: { keyframes: 'nebula-page-fade', ms: 200, easing: 'ease-out' },
  fadeUp: { keyframes: 'nebula-page-fade-up', ms: 240, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  fadeScale: { keyframes: 'nebula-page-fade-scale', ms: 220, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
};

/** A 24px stroke icon as a data URI; `ink` is a bare hex so the `#` can be escaped. */
const glyph = (ink: string, path: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23${ink}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='${path}'/%3E%3C/svg%3E")`;

const NAV_SOLID = 'background-color:var(--nebula-nav-accent);color:var(--mantine-primary-color-contrast);';
const NAV_TINT = 'background-color:var(--nebula-nav-tint);color:var(--mantine-color-text);';
const NAV_FILL = 'background-color:var(--nebula-nav-fill);';
const NAV_SOFT_FILL =
  'background-color:color-mix(in srgb,var(--nebula-nav-fill) 60%,transparent);color:var(--mantine-color-text);';

/** Each style's hovered and current link, and the icon in either state; `round` makes every link a pill. */
const NAV_STYLES: Record<
  Exclude<NavHover, 'default'>,
  { hover: string; current: string; hoverIcon?: string; currentIcon?: string; round?: boolean }
> = {
  filled: { hover: NAV_TINT, current: NAV_SOLID },
  filledSecondary: { hover: NAV_SOFT_FILL, current: `${NAV_FILL}color:var(--nebula-nav-ink);` },
  iconPill: {
    hover: 'background-color:transparent;',
    current: 'background-color:transparent;color:var(--mantine-color-text);',
    hoverIcon: 'background-color:var(--nebula-nav-tint);color:var(--nebula-nav-ink);',
    currentIcon: NAV_SOLID,
  },
  pill: { hover: NAV_TINT, current: NAV_SOLID, round: true },
  pillSecondary: {
    hover: NAV_SOFT_FILL,
    current: `${NAV_FILL}color:var(--mantine-color-text);`,
    currentIcon: 'color:var(--nebula-nav-ink);',
    round: true,
  },
};

/**
 * Core's menu links are a NavLink around a subtle Button that gets `active` while current, the same in every
 * sidebar layout; the horizontal layout repeats them in `.nebula-topnav` and its portaled section dropdowns
 * (`.nebula-topnav-menu`). The accent is read on the link, not the button, so `buttonColor` (which repaints the
 * blue variables on buttons) leaves the menu on the accent.
 */
function navHoverCss(hover: Exclude<NavHover, 'default'>): string[] {
  const style = NAV_STYLES[hover];
  const on = (suffix: string) =>
    ['#sidebar-content', '.nebula-topnav', '.nebula-topnav-menu']
      .map((scope) => `html:root ${scope} a${suffix}`)
      .join(',');
  const BUTTON = ' > .mantine-Button-root';
  const ICON = ' .mantine-Button-label > svg';

  const css = [
    `${on('')}{--nebula-nav-accent:var(--mantine-color-blue-filled);--nebula-nav-tint:var(--mantine-color-blue-light);--nebula-nav-ink:var(--mantine-color-blue-light-color);}`,
    // the neutral fill: the overlay colour in dark mode, a step of the gray scale on light mode's near white
    'html:root[data-mantine-color-scheme="dark"]{--nebula-nav-fill:var(--mantine-color-default-hover);}',
    'html:root[data-mantine-color-scheme="light"]{--nebula-nav-fill:var(--mantine-color-gray-2);}',
    `@media (hover:hover){${on(`${BUTTON}:not(.active):hover`)}{${style.hover}}}`,
    // light mode draws the current link as an outline button
    `${on(`${BUTTON}.active`)}{border-color:transparent;${style.current}}`,
    // GroupedNav's rail marker keeps pointing at the current link; its hover tick belongs to the default look
    'html:root .nebula-sb-items a:not(.active):hover::before{background:transparent;}',
  ];
  if (style.round) css.push(`${on(BUTTON)}{border-radius:999px;}`);
  // FontAwesome's svg is content-box, so the padding grows a tile around the glyph
  if (hover === 'iconPill') {
    const icon = on(`${BUTTON}${ICON}`);
    css.push(
      `${icon}{padding:0.375em 0.3em;border-radius:var(--mantine-radius-sm);transition:background-color 120ms ease,color 120ms ease;}`,
      `@media (prefers-reduced-motion:reduce){${icon}{transition:none;}}`,
    );
  }
  if (style.hoverIcon) {
    css.push(`@media (hover:hover){${on(`${BUTTON}:not(.active):hover${ICON}`)}{${style.hoverIcon}}}`);
  }
  if (style.currentIcon) css.push(`${on(`${BUTTON}.active${ICON}`)}{${style.currentIcon}}`);
  return css;
}

/**
 * The desktop sidebar is core's `#sidebar-desktop` card beside the content column of the dashboard, server and
 * admin routers (the setup wizard's keeps core's look); app.css makes it flush, which is the 'default' layout.
 * Its display, width and position are Tailwind `!` utilities, and a layered !important beats any unlayered one,
 * so the rail and the hidden sidebar cap its size with max-width/max-height instead. Below lg the card is hidden
 * and core's drawer shows, which no rule here touches. The bars across the content, the rail's logo and tooltips
 * are elements/sidebar/*; their static styles live in app.css.
 */
const SIDEBAR = 'html:root #sidebar-desktop:has(~ :is(#dashboard-root,#server-root,#admin-root))';
// core's header (logo, Quick actions, the server block) and footer (server switcher, account) wrappers
const SIDEBAR_HEADER = `${SIDEBAR} #sidebar-content > .shrink-0:first-child`;
const SIDEBAR_FOOTER = `${SIDEBAR} #sidebar-content > .shrink-0:last-child`;

/** 'slim': a fixed 64px icon rail; RailTip names the links in tooltips, GroupedNav shows every section's links. */
function railCss(): string[] {
  const LINK = `${SIDEBAR} a > .mantine-Button-root`;
  const SEARCH = `${SIDEBAR_HEADER} > .mantine-Button-root`;
  const SERVER = `${SIDEBAR_HEADER} > .mantine-Card-root`;
  const ACCOUNT = `${SIDEBAR} #sidebar-account-card`;
  return [
    `${SIDEBAR}{max-width:4rem;padding:0.5rem;}`,
    // app.css lets the scroller reach into the padding for its bar; the rail is too narrow for one
    `${SIDEBAR} #sidebar-content > .overflow-y-auto{margin-right:-0.5rem;padding-right:0.5rem;scrollbar-width:none;}`,
    // the names shrink to nothing rather than going, so screen readers still read them
    `${LINK}{padding-inline:0;}`,
    `${LINK} .mantine-Button-label{justify-content:center;font-size:0;}`,
    `${LINK} .mantine-Button-label > svg{margin:0;font-size:1rem;}`,
    // RailLogo's square icon stands in for the logo or banner
    `${SIDEBAR} .nebula-rail-logo{display:block;}`,
    `${SIDEBAR} a:has(> .nebula-rail-logo) > :not(.nebula-rail-logo){display:none;}`,
    // core's Quick actions button keeps its magnifier; its inner row is aligned by an inline style
    `${SEARCH}{padding-inline:0;}`,
    `${SEARCH} .mantine-Button-inner{justify-content:center!important;}`,
    `${SEARCH} .mantine-Button-label{font-size:0;}`,
    `${SEARCH} .mantine-Button-section{margin:0;}`,
    `${SEARCH} .mantine-Button-section[data-position="right"]{display:none;}`,
    // the server block keeps its status dot and the power buttons, stacked
    `${SERVER}{align-items:center;padding:0.375rem 0.25rem;}`,
    `${SERVER} > :first-child,${SERVER} > :nth-child(2) > :not(:first-child){display:none;}`,
    `${SERVER} > :nth-child(2){justify-content:center;}`,
    `${SERVER} > :nth-child(3){flex-direction:column;align-self:stretch;gap:0.25rem;margin-top:0.375rem;}`,
    `${SERVER} > :nth-child(3) > *,${SERVER} .mantine-Button-root{width:100%;}`,
    `${SERVER} .mantine-Button-root{padding-inline:0;}`,
    `${SERVER} .mantine-Button-label{font-size:0;}`,
    `${SERVER} .mantine-Button-section{margin:0;}`,
    // the restart button's icon is its label, not a section
    `${SERVER} .mantine-Button-label > svg{font-size:0.75rem;}`,
    // the footer keeps the account, down to its avatar over the menu button
    `${SIDEBAR_FOOTER} > :not(#sidebar-account-card){display:none;}`,
    `${ACCOUNT}{flex-wrap:wrap;justify-content:center;gap:0.25rem;padding:0.25rem 0;}`,
    `${ACCOUNT} > :first-child{flex:0 0 100%;justify-content:center;}`,
    `${ACCOUNT} > :first-child > span{display:none;}`,
    // section toggles and labelled dividers become plain rules
    `${SIDEBAR} .nebula-sb-toggle,${SIDEBAR} .mantine-Divider-label{display:none;}`,
    `${SIDEBAR} .nebula-sb-rule{display:block;}`,
    `${SIDEBAR} .nebula-sb-items{display:block;margin:0;padding:0;border:0;}`,
    `${SIDEBAR} .nebula-sb-items a::before{content:none;}`,
    `${SIDEBAR} .mantine-Divider-root[data-with-label]{border-top:1px solid var(--mantine-color-default-border);}`,
  ];
}

/** `sidebarLayout` and `dockPosition`; the defaults (flush sidebar, dock in it) emit nothing. */
function layoutCss(t: NebulaTheme): string[] {
  const css: string[] = [];
  // core's own inset card, which app.css flattens
  if (t.sidebarLayout === 'floating') {
    css.push(
      `${SIDEBAR}{margin:0.5rem 0 0.5rem 0.5rem;top:0.5rem;height:calc(100vh - 1rem);border-radius:var(--paper-radius);border-width:1px;}`,
    );
  }
  // the account moves to the slim bar SidebarShell draws across the content
  if (t.sidebarLayout === 'pill') {
    css.push(
      `${SIDEBAR}{margin:0.75rem 0 0.75rem 0.75rem;top:0.75rem;height:calc(100vh - 1.5rem);border-radius:1.75rem;border-width:1px;padding:1rem 0.75rem;}`,
      `${SIDEBAR} #sidebar-account-card{display:none;}`,
    );
  }
  if (t.sidebarLayout === 'slim') css.push(...railCss());
  // SidebarShell's top bar takes over; the card stays mounted for core but takes no room
  if (t.sidebarLayout === 'horizontal') {
    css.push(`${SIDEBAR}{max-width:0;max-height:0;margin:0;padding:0;border:0;visibility:hidden;}`);
  }
  // SidebarShell wraps the dock in the header as `.nebula-dock-origin` (the drawer keeps showing it)
  if (t.dockPosition !== 'sidebar' && t.sidebarLayout !== 'horizontal') {
    css.push(`${SIDEBAR} .nebula-dock-origin{display:none;}`);
  }
  return css;
}

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
  const mono = MONO_FONT_STACKS[t.monoFont];
  if (mono) {
    shared.push(['--mantine-font-family-monospace', mono], ['--font-mono', mono]);
  }

  // translucent blocks: `--nebula-card` is the colour Mantine paints cards in both schemes
  const blockAlpha = t.blockOpacity / 100;
  const darkScheme: [string, string][] = [
    ['--nebula-card', t.blockOpacity < 100 ? alpha(dark[6], blockAlpha) : dark[6]],
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

  // light mode gets its own neutrals; the dark-only overrides above are picked against a dark page
  const light = lightBase(t);
  // Mantine's light styles draw hovers, fills, borders and tooltips from `gray`, as dark mode does from `dark`
  const gray = [0.03, 0.06, 0.09, 0.13, 0.19, 0.33, 0.5, 0.7, 0.8, 0.88].map((w) => mix(light.text, light.surface, w));
  const accentInk = readable(t.accent, light.text, light.surface);
  const lightScheme: [string, string][] = [
    ...scale('gray', gray),
    ['--nebula-card', t.blockOpacity < 100 ? alpha(light.surface, blockAlpha) : light.surface],
    ['--nebula-button-ink', light.text],
    ['--nebula-highlight', readable(t.highlight, light.text, light.surface, 3)],
    // cards, menus, inputs and dropdowns are painted `white` in light mode, their text `black`
    ['--mantine-color-white', light.surface],
    ['--mantine-color-black', light.text],
    ['--mantine-color-bright', light.text],
    ['--mantine-color-body', light.background],
    ['--mantine-color-text', light.text],
    ['--mantine-color-dimmed', mix(light.text, light.surface, 0.62)],
    ['--mantine-color-placeholder', gray[5]],
    ['--mantine-color-default', light.surface],
    ['--mantine-color-default-hover', gray[0]],
    ['--mantine-color-default-color', light.text],
    ['--mantine-color-default-border', gray[4]],
    ['--mantine-color-anchor', accentInk],
    ['--mantine-color-blue-filled', blue[6]],
    ['--mantine-color-blue-filled-hover', blue[7]],
    ['--mantine-color-blue-light', alpha(t.accent, 0.1)],
    ['--mantine-color-blue-light-hover', alpha(t.accent, 0.14)],
    ['--mantine-color-blue-light-color', accentInk],
    ['--mantine-color-blue-outline', blue[6]],
    ['--mantine-color-blue-outline-hover', alpha(t.accent, 0.05)],
    ['--mantine-color-blue-text', accentInk],
    ['--chart-series-1', t.chartOne || blue[6]],
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
    // light mode keeps its neutral gray scale, so gray badges and buttons take the colour directly
    lightScheme.push(
      ['--mantine-color-gray-filled', shades[6]],
      ['--mantine-color-gray-filled-hover', shades[7]],
      ['--mantine-color-gray-light', alpha(t.offline, 0.12)],
      ['--mantine-color-gray-light-hover', alpha(t.offline, 0.18)],
      ['--mantine-color-gray-light-color', readable(t.offline, light.text, light.surface)],
      ['--mantine-color-gray-outline', shades[6]],
      ['--mantine-color-gray-text', readable(t.offline, light.text, light.surface)],
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
      `html:root[data-mantine-color-scheme="light"] .mantine-Button-root,html:root[data-mantine-color-scheme="light"] .mantine-ActionIcon-root{${vars(
        [
          ['--mantine-color-blue-filled-hover', shades[7]],
          ['--mantine-color-blue-light', alpha(t.buttonColor, 0.1)],
          ['--mantine-color-blue-light-hover', alpha(t.buttonColor, 0.14)],
          ['--mantine-color-blue-light-color', readable(t.buttonColor, light.text, light.surface)],
          ['--mantine-color-blue-outline', shades[6]],
          ['--mantine-color-blue-outline-hover', alpha(t.buttonColor, 0.05)],
        ],
      )}}`,
    );
  }

  // painted in both schemes; the dim is the page colour of whichever one is showing
  if (t.backgroundImage) {
    const dim = `color-mix(in srgb,var(--mantine-color-body) ${t.backgroundDim}%,transparent)`;
    css.push(`html:root{background-image:linear-gradient(${dim},${dim}),url("${t.backgroundImage}");}`);
  }

  // `nebula-auth` sits on html only while an auth page is mounted (elements/auth/AuthScope.tsx);
  // the dim follows the page colour of whichever scheme is showing
  if (t.loginBackground) {
    const dim = `color-mix(in srgb,var(--mantine-color-body) ${t.loginDim}%,transparent)`;
    css.push(`html:root.nebula-auth{background-image:linear-gradient(${dim},${dim}),url("${t.loginBackground}");}`);
  }

  // blocks are Mantine cards (the sidebar is one) and bordered papers; overlays (modals, menus, popovers,
  // dialogs) are left alone so they stay solid, and so is a card floating in a fixed bar (the bulk action bar)
  const CARD = 'html:root .mantine-Card-root';
  const PAPER =
    'html:root .mantine-Paper-root[data-with-border]:not(.mantine-Card-root,.mantine-Dialog-root,.mantine-ActionBar-root)';
  const SEE_THROUGH = `${CARD}:not(.fixed > *),${PAPER}`;
  if (t.blockOpacity < 100) {
    css.push(
      `${CARD}:not(.fixed > *){background-color:var(--nebula-card);}`,
      `${PAPER}{background-color:color-mix(in srgb,var(--mantine-color-body) ${t.blockOpacity}%,transparent);}`,
    );
    const blur = 'blur(14px) saturate(160%)';
    if (t.glass) css.push(`${SEE_THROUGH}{-webkit-backdrop-filter:${blur};backdrop-filter:${blur};}`);
  }
  if (!t.blockBorder) css.push(`${CARD},${PAPER}{border-color:transparent;}`);

  // borderless inputs take Mantine's `filled` background so they still stand out; errors keep their red border
  if (!t.inputBorder) {
    const INPUT = '.mantine-Input-wrapper[data-variant="default"]';
    css.push(
      `html:root[data-mantine-color-scheme="dark"] ${INPUT}{--input-bg:var(--mantine-color-dark-5);}`,
      `html:root[data-mantine-color-scheme="light"] ${INPUT}{--input-bg:var(--mantine-color-gray-1);}`,
      `html:root ${INPUT}:not([data-error],[data-success]){--input-bd:transparent;}`,
    );
  }

  // Mantine puts `mantine-active` on enabled buttons and action icons and nudges them 1px down on press ('drop')
  const PRESSED = 'html:root .mantine-active:active:not(fieldset:disabled *)';
  if (t.clickEffect === 'none') css.push(`${PRESSED}{transform:none;}`);
  if (t.clickEffect === 'shrink') {
    css.push(
      `html:root .mantine-active{transition:transform 120ms ease;}${PRESSED}{transform:scale(0.96);}`,
      `@media (prefers-reduced-motion:reduce){html:root .mantine-active{transition:none;}${PRESSED}{transform:none;}}`,
    );
  }
  if (t.clickEffect === 'outline') {
    css.push(`${PRESSED}{transform:none;outline:2px solid var(--mantine-color-blue-filled);outline-offset:2px;}`);
  }

  // core's toast stack (providers/ToastProvider.tsx); `data-nebula-tone` is the toast's Mantine colour,
  // added by the Notification props interceptor in index.ts: green success, red error, yellow warning, teal info
  if (t.toastStyle === 'glassy') {
    const TOAST = 'html:root .fixed.z-999 .mantine-Notification-root';
    const tones: [string, string, string][] = [
      ['green', 'M5 12.5l4.5 4.5L19 7.5', t.success || '#40c057'],
      ['red', 'M7 7l10 10M17 7L7 17', t.danger || '#fa5252'],
      ['yellow', 'M12 6v8M12 18.5h.01', t.warning || '#fab005'],
    ];
    const blur = 'blur(14px) saturate(160%)';
    css.push(
      `${TOAST}{background-color:color-mix(in srgb,var(--notification-color) 14%,color-mix(in srgb,var(--mantine-color-body) 68%,transparent));border:1px solid color-mix(in srgb,var(--notification-color) 38%,transparent);box-shadow:0 12px 32px -14px color-mix(in srgb,var(--notification-color) 55%,transparent);-webkit-backdrop-filter:${blur};backdrop-filter:${blur};padding-inline-start:54px;min-height:56px;}`,
      // Mantine's colour bar becomes the icon tile
      `${TOAST}::before{display:block;top:50%;bottom:auto;width:30px;height:30px;margin-top:-15px;inset-inline-start:12px;border-radius:var(--mantine-radius-sm);background:${glyph('ffffff', 'M12 11v6.5M12 6.5h.01')} center/16px no-repeat,var(--notification-color);}`,
      // the glyph turns dark on light tiles (a yellow warning), the same cut as the text on the accent
      ...tones.map(
        ([tone, path, colour]) =>
          `${TOAST}[data-nebula-tone="${tone}"]::before{background-image:${glyph(luminance(colour) > 0.45 ? '111111' : 'ffffff', path)};}`,
      ),
      // counts down core's 7.5s `toastTimeout`; progress toasts stay until they finish, so they get none
      `${TOAST}:not(:has(.mantine-Progress-root))::after{content:'';position:absolute;inset-inline:0;bottom:0;height:3px;background:var(--notification-color);transform-origin:0 50%;animation:nebula-toast-countdown 7500ms linear forwards;}`,
      `@media (prefers-reduced-motion:reduce){${TOAST}::after{display:none;}}`,
    );
  }

  // PageTransition (elements/page/PageTransition.tsx) marks the element holding the page after a route change
  // and drops the mark once the animation ends; no fill mode, so no transform outlives it (xterm, the editor)
  if (t.pageTransition !== 'none') {
    const { keyframes, ms, easing } = PAGE_ANIMATIONS[t.pageTransition];
    css.push(
      `@media (prefers-reduced-motion:no-preference){html:root [data-nebula-page-enter] > *{animation:${keyframes} ${ms}ms ${easing};}}`,
    );
  }

  // most server page titles go through `hidePageTitle` (elements/page/PageTitles.tsx); core's Files page draws
  // its own beside its settings and view buttons, so only that heading is hidden here and the buttons stay
  if (!t.pageTitles) {
    css.push(
      'html:root [data-file-manager-page] > .mantine-Group-root > .mantine-Group-root > .mantine-Title-root{display:none;}',
    );
  }

  // titled cards: core's TitleCard header (`#title-card-header`, the extension's Home cards too) and core's
  // chart cards (ChartBlock, a bordered header row holding an h3); TitleCard's divider is an inline style
  if (t.boxStyle !== 'default') {
    const TITLE_CARD = 'html:root .mantine-Card-root > #title-card-header';
    const CHART_CARD = 'html:root .mantine-Card-root > .border-b:first-child:has(> div > h3)';
    const HEAD = `${TITLE_CARD},${CHART_CARD}`;
    const TITLE = `${TITLE_CARD} > .mantine-Title-root,${CHART_CARD} > div > h3`;
    const line = 'var(--mantine-color-default-border)';
    if (t.boxStyle === 'line') css.push(`${HEAD}{background:transparent;border-bottom:1px solid ${line}!important;}`);
    if (t.boxStyle === 'fill') {
      css.push(
        `${HEAD}{background:var(--mantine-color-blue-light);border-bottom-color:transparent!important;}`,
        `${TITLE}{color:var(--mantine-color-blue-light-color);}`,
      );
    }
    if (t.boxStyle === 'pill') {
      css.push(
        `${HEAD}{background:transparent;border-bottom-color:transparent!important;padding-bottom:0;}`,
        `${TITLE}{padding:4px 12px;border-radius:999px;background:var(--mantine-color-blue-light);color:var(--mantine-color-blue-light-color);}`,
      );
    }
  }

  // core's StatCard: a card holding a row of a filled ThemeIcon square, then the label and value (`ml-4`)
  if (t.statStyle !== 'default') {
    const ROW = 'html:root .mantine-Card-root > .flex.flex-row.items-center:has(> .mantine-ThemeIcon-root + .flex-col)';
    const reversed = t.statStyle === 'reversed' || t.statStyle === 'minimalReversed';
    if (reversed) css.push(`${ROW}{flex-direction:row-reverse;}${ROW} > .flex-col{margin-left:0;margin-right:1rem;}`);
    if (t.statStyle === 'minimal' || t.statStyle === 'minimalReversed') {
      // the bare glyph in the tile's colour, next to the label instead of centred on the whole tile
      css.push(
        `${ROW} > .mantine-ThemeIcon-root{width:auto;height:auto;min-width:0;min-height:0;align-self:flex-start;margin-top:2px;background:transparent;border-color:transparent;color:var(--ti-bg,var(--mantine-primary-color-filled));font-size:0.75rem;}`,
        `${ROW} > .flex-col{${reversed ? 'margin-right' : 'margin-left'}:0.75rem;}`,
      );
    }
  }

  // core's Table (elements/Table.tsx): a div with an inline border and fill around Mantine's scroll container.
  // The rows are painted rather than their cells, so the fills core puts inline on a row (a selected or dragged
  // over file) and the file manager's drag selection still win; the end cells round the corners, which clips the
  // row's fill. The file list's virtual padding rows hold one empty cell and stay invisible.
  if (t.tableStyle === 'cards') {
    const TABLE = '.mantine-TableScrollContainer-scrollContainer .mantine-Table-table';
    const ROW = `html:root ${TABLE} > .mantine-Table-tbody > tr:not(:has(> td:only-child:empty))`;
    const edge = t.blockBorder ? 'var(--mantine-color-default-border)' : 'transparent';
    const radius = 'var(--mantine-radius-md)';
    css.push(
      'html:root div[style]:has(> .mantine-TableScrollContainer-scrollContainer){background:none!important;border-color:transparent!important;}',
      `html:root ${TABLE}{border-collapse:separate;border-spacing:0 6px;--nebula-row:var(--nebula-card);}`,
      // inside a card the rows take the raised fill, so they still stand apart from it
      `html:root .mantine-Card-root ${TABLE}{--nebula-row:var(--mantine-color-default);}`,
      `html:root ${TABLE} > .mantine-Table-thead > tr > th{box-shadow:none;color:var(--mantine-color-dimmed);}`,
      `${ROW}{background-color:var(--nebula-row);}`,
      `@media (hover:hover){${ROW}[data-hover]:hover{background-color:color-mix(in srgb,var(--mantine-color-text) 5%,var(--nebula-row));}}`,
      `${ROW} > td{border-block:1px solid ${edge};}`,
      `${ROW} > td:first-child{border-inline-start:1px solid ${edge};border-start-start-radius:${radius};border-end-start-radius:${radius};}`,
      `${ROW} > td:last-child{border-inline-end:1px solid ${edge};border-start-end-radius:${radius};border-end-end-radius:${radius};}`,
    );
  }

  // menu links (navHoverCss); 'default' is app.css's accent tint on the current link and core's own hover
  if (t.navHover !== 'default') css.push(...navHoverCss(t.navHover));

  // the sidebar layouts and dock position (layoutCss)
  css.push(...layoutCss(t));

  return css.join('\n');
}
