import { ALL_ARRANGEABLE, EMPTY_NAV_ORDER, type NavArrange, type NavOrder } from './navOrder.ts';

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
export const PAGE_TRANSITIONS = ['none', 'fade', 'fadeUp', 'fadeScale', 'slide', 'slideDown', 'zoom', 'blur'] as const;
export type PageTransition = (typeof PAGE_TRANSITIONS)[number];
export const CARD_ENTRANCES = ['none', 'fade', 'rise'] as const;
export type CardEntrance = (typeof CARD_ENTRANCES)[number];
export const HOVER_EFFECTS = ['none', 'lift', 'glow'] as const;
export type HoverEffect = (typeof HOVER_EFFECTS)[number];
/** 'default' is Mantine's own: modals fade down, drawers slide in, menus and popovers fade. */
export const OVERLAY_MOTIONS = ['default', 'pop', 'slideUp', 'none'] as const;
export type OverlayMotion = (typeof OVERLAY_MOTIONS)[number];
export const ANIMATION_SPEEDS = ['slow', 'normal', 'fast'] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number];
export const BOX_STYLES = ['default', 'line', 'fill', 'pill'] as const;
export type BoxStyle = (typeof BOX_STYLES)[number];
export const STAT_STYLES = ['default', 'reversed', 'minimal', 'minimalReversed'] as const;
export type StatStyle = (typeof STAT_STYLES)[number];
/** The servers list's default view: 'list' is the table/rows view, 'grid' shows cards. */
export const SERVER_LIST_VIEWS = ['list', 'grid'] as const;
export type ServerListView = (typeof SERVER_LIST_VIEWS)[number];
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
/** Desktop navigation: 'default' is the flush full height sidebar (app.css); below lg `mobileNav` takes over. */
export const SIDEBAR_LAYOUTS = ['default', 'floating', 'pill', 'slim', 'horizontal'] as const;
export type SidebarLayout = (typeof SIDEBAR_LAYOUTS)[number];
/** Where the sidebar's header block (logo, search, the server block) sits; the horizontal layout ignores it. */
export const DOCK_POSITIONS = ['sidebar', 'header', 'top'] as const;
export type DockPosition = (typeof DOCK_POSITIONS)[number];
/**
 * Phone navigation below lg: 'drawer' is core's floating menu button, 'bottomBar' a fixed bar of links on the bottom
 * edge and 'floatingBar' the same bar as a rounded pill above it (BottomNav).
 */
export const MOBILE_NAVS = ['drawer', 'bottomBar', 'floatingBar'] as const;
export type MobileNav = (typeof MOBILE_NAVS)[number];

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
  'gauges',
  'commands',
  'connect',
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

/** Around core's terminal: 'card' is core's card, 'flush' drops its fill, border and padding, 'glass' blurs. */
export const TERMINAL_FRAMES = ['card', 'flush', 'glass'] as const;
export type TerminalFrame = (typeof TERMINAL_FRAMES)[number];
/** 'auto' is the console's 62vh; 'fill' runs to the bottom of the window from lg up, 'tall' is a taller fixed height. */
export const TERMINAL_HEIGHTS = ['auto', 'fill', 'tall'] as const;
export type TerminalHeight = (typeof TERMINAL_HEIGHTS)[number];
/** Core hides the terminal's cursor ('none'); the others show it in that shape. */
export const TERMINAL_CURSORS = ['none', 'block', 'bar', 'underline'] as const;
export type TerminalCursor = (typeof TERMINAL_CURSORS)[number];
/** xterm's `lineHeight`; core's is 1.2. */
export const TERMINAL_LINE_HEIGHT = { min: 1, max: 2, default: 1.2 } as const;
/**
 * The console terminal's ANSI colours in xterm order: black, red, green, yellow, blue, magenta, cyan, white (0-7), then
 * the bright ones (8-15). Core's dark scheme (`getXtermTheme()` in core's `src/lib/editor/xterm.ts`) sets none, so it
 * draws xterm 6's own (`DEFAULT_ANSI_COLORS` in `@xterm/xterm`'s `src/browser/Types.ts`); its light one sets darker
 * colours of its own.
 */
export const TERMINAL_COLOR_NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const;
export const TERMINAL_COLOR_COUNT = 16;
// prettier-ignore
export const CORE_TERMINAL_COLORS: readonly string[] = [
  '#2e3436', '#cc0000', '#4e9a06', '#c4a000', '#3465a4', '#75507b', '#06989a', '#d3d7cf',
  '#555753', '#ef2929', '#8ae234', '#fce94f', '#729fcf', '#ad7fa8', '#34e2e2', '#eeeeec',
];
/** The console's banner widget: 'full' is the Home banner, the others one slim row. */
export const CONSOLE_BANNERS = ['full', 'compact', 'minimal'] as const;
export type ConsoleBanner = (typeof CONSOLE_BANNERS)[number];
/** The console's charts: core's filled areas or bare lines. */
export const CHART_STYLES = ['area', 'line'] as const;
export type ChartStyle = (typeof CHART_STYLES)[number];
/** The plot's minimum height; 'medium' is core's 15rem. */
export const CHART_HEIGHTS = ['small', 'medium', 'large'] as const;
export type ChartHeight = (typeof CHART_HEIGHTS)[number];
/** A run of charts side by side as in core ('row'), or each on its own full width row. */
export const CHART_ARRANGEMENTS = ['row', 'stacked'] as const;
export type ChartArrangement = (typeof CHART_ARRANGEMENTS)[number];

/** A button of the console's quick command bar. */
export interface ConsoleCommand {
  label: string;
  command: string;
}

export const MAX_CONSOLE_COMMANDS = 8;
export const MAX_COMMAND_LABEL = 40;
export const MAX_COMMAND_LENGTH = 200;

export interface EggImages {
  banner: string;
  icon: string;
}

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
  /** The page scrollbar's thumb in dark mode; '' keeps the derived `--mantine-color-dark-4`. */
  scrollbar: string;
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
  /**
   * Mint's Home page at the server root, with the console moved to `/console`. Off, the console stays the server
   * root as in core (still with `consoleLayout`) and the Home fields below go unused.
   */
  serverHome: boolean;
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
  /** Cards and table rows of the page content fade or rise in, staggered, when the route changes. */
  cardEntrance: CardEntrance;
  /** Interactive cards (server cards, cards that are links) and buttons under the pointer. */
  hoverEffect: HoverEffect;
  /** How modals, drawers, menus and popovers open; they close the Mantine way. */
  overlayMotion: OverlayMotion;
  /** Scales every Mint animation's duration, except the glassy toast's countdown (core's real 7.5s). */
  animationSpeed: AnimationSpeed;
  /** Site wide: turns Mint's animations and Mantine's overlay transitions off for everyone. */
  reduceMotion: boolean;
  /** The title row of core's server pages; its search box and buttons stay either way. */
  pageTitles: boolean;
  /** The title row of titled cards: 'default' is core's band with a divider line. */
  boxStyle: BoxStyle;
  /** Core's stat tiles: 'default' is core's icon square on the left of the label and value. */
  statStyle: StatStyle;
  /** Widgets around the console terminal, each used at most once. */
  consoleLayout: ConsoleLayout;
  /** Core's card around the terminal, none, or glass. */
  terminalFrame: TerminalFrame;
  terminalHeight: TerminalHeight;
  /** xterm options; core hides the cursor ('none'), blinking only applies to a shown one. */
  terminalCursor: TerminalCursor;
  terminalCursorBlink: boolean;
  terminalLineHeight: number;
  /** 16 lowercase `#rrggbb` in xterm order (`CORE_TERMINAL_COLORS`), or [] for core's own. */
  terminalColors: string[];
  /** The banner widget: the Home banner, one row, or a slim status line. */
  consoleBanner: ConsoleBanner;
  /** The console's charts only, never core's charts elsewhere. */
  chartStyle: ChartStyle;
  chartHeight: ChartHeight;
  chartArrangement: ChartArrangement;
  /** The `commands` widget's buttons, each sending its command over the server's websocket. */
  consoleCommands: ConsoleCommand[];
  /** Auth pages; the defaults are core's own: a card under the logo, no links. */
  authLayout: AuthLayout;
  authLogoPosition: AuthPosition;
  supportLinks: SupportLink[];
  supportLinksPosition: AuthPosition;
  /** The servers list's default view before a user toggles their own locally. */
  serverListView: ServerListView;
  /** The servers grid's cards; the grid's columns follow the style. */
  serverCardStyle: ServerCardStyle;
  tableStyle: TableStyle;
  navHover: NavHover;
  searchComponent: SearchComponent;
  sidebarLayout: SidebarLayout;
  dockPosition: DockPosition;
  /** The browser tab and home screen icon; '' keeps the panel's own. */
  favicon: string;
  mobileNav: MobileNav;
  /** Phones (touch, editor under 768px wide): Monaco gets phone settings and the file editor a key row. */
  mobileEditor: boolean;
  /** The admin area's menu for everyone, over core's order; users can still arrange their own on top. */
  adminNavOrder: NavOrder;
  /** Per menu, whether users get 'Arrange menu' and their own order there (admins included). */
  userArrange: NavArrange;
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
  scrollbar: '',
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
  serverHome: true,
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
  cardEntrance: 'none',
  hoverEffect: 'none',
  overlayMotion: 'default',
  animationSpeed: 'normal',
  reduceMotion: false,
  pageTitles: true,
  boxStyle: 'default',
  statStyle: 'default',
  consoleLayout: DEFAULT_CONSOLE_LAYOUT,
  terminalFrame: 'card',
  terminalHeight: 'auto',
  terminalCursor: 'none',
  terminalCursorBlink: false,
  terminalLineHeight: TERMINAL_LINE_HEIGHT.default,
  terminalColors: [],
  consoleBanner: 'full',
  chartStyle: 'area',
  chartHeight: 'medium',
  chartArrangement: 'row',
  consoleCommands: [],
  authLayout: 'default',
  authLogoPosition: 'aboveForm',
  supportLinks: [],
  supportLinksPosition: 'header',
  serverListView: 'list',
  serverCardStyle: 'default',
  tableStyle: 'table',
  navHover: 'default',
  searchComponent: 'palette',
  sidebarLayout: 'default',
  dockPosition: 'sidebar',
  favicon: '',
  mobileNav: 'drawer',
  mobileEditor: true,
  adminNavOrder: EMPTY_NAV_ORDER,
  userArrange: ALL_ARRANGEABLE,
};

/**
 * What a user's own theme choice (a preset an admin made selectable) takes from the preset: the look.
 * Everything else stays the site's: content (home banner, articles, egg images, the Home and console
 * layouts), the auth pages and any field not listed here, so a field added later is site wide by default.
 */
export const USER_THEME_FIELDS: readonly (keyof NebulaTheme)[] = [
  'accent',
  'highlight',
  'background',
  'surface',
  'text',
  'font',
  'buttonStyle',
  'buttonColor',
  'buttonText',
  'surfaceRaised',
  'surfaceOverlay',
  'textMuted',
  'textFaint',
  'textOnAccent',
  'line',
  'scrollbar',
  'success',
  'warning',
  'danger',
  'offline',
  'chartOne',
  'chartTwo',
  'terminalColors',
  'sidebarGroups',
  'radius',
  'elementRadius',
  'backgroundImage',
  'backgroundDim',
  'monoFont',
  'lightBackground',
  'lightSurface',
  'lightText',
  'blockOpacity',
  'glass',
  'blockBorder',
  'inputBorder',
  'clickEffect',
  'toastStyle',
  'pageTransition',
  'cardEntrance',
  'hoverEffect',
  'overlayMotion',
  'animationSpeed',
  'pageTitles',
  'boxStyle',
  'statStyle',
  'serverListView',
  'serverCardStyle',
  'tableStyle',
  'navHover',
  'searchComponent',
  'sidebarLayout',
  'dockPosition',
];

/** Only the `USER_THEME_FIELDS` a preset sets. */
export function pickUserTheme(preset: unknown): Partial<NebulaTheme> {
  const r = (preset && typeof preset === 'object' ? preset : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of USER_THEME_FIELDS) if (key in r) out[key] = r[key];
  return out as Partial<NebulaTheme>;
}
