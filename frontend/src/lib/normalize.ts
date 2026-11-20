// The security boundary: operator supplied JSON in, a theme whose every value is safe to put in a stylesheet out.
import { normalizeNavArrange, normalizeNavOrder } from './navOrder.ts';
import {
  ANIMATION_SPEEDS,
  type Article,
  AUTH_LAYOUTS,
  AUTH_POSITIONS,
  BOX_STYLES,
  BUTTON_STYLES,
  CARD_ENTRANCES,
  CHART_ARRANGEMENTS,
  CHART_HEIGHTS,
  CHART_STYLES,
  CLICK_EFFECTS,
  CONSOLE_BANNERS,
  CONSOLE_SLOTS,
  CONSOLE_WIDGETS,
  type ConsoleCommand,
  type ConsoleLayout,
  type ConsoleWidget,
  DEFAULT_LAYOUT,
  DEFAULT_THEME,
  DOCK_POSITIONS,
  type EggImages,
  FONTS,
  HOME_CARDS,
  type HomeCard,
  HOVER_EFFECTS,
  MAX_ARTICLES,
  MAX_COMMAND_LABEL,
  MAX_COMMAND_LENGTH,
  MAX_CONSOLE_COMMANDS,
  MAX_SUPPORT_LINK_LABEL,
  MAX_SUPPORT_LINKS,
  MOBILE_NAVS,
  MONO_FONTS,
  NAV_HOVERS,
  type NebulaTheme,
  OVERLAY_MOTIONS,
  PAGE_TRANSITIONS,
  pickUserTheme,
  SEARCH_COMPONENTS,
  SERVER_CARD_STYLES,
  SIDEBAR_LAYOUTS,
  STAT_STYLES,
  SUPPORT_LINK_ICONS,
  type SupportLink,
  TABLE_STYLES,
  TERMINAL_CURSORS,
  TERMINAL_FRAMES,
  TERMINAL_HEIGHTS,
  TERMINAL_LINE_HEIGHT,
  TOAST_STYLES,
} from './theme.ts';

const MAX_EGGS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The site theme with a preset's look laid over it; invalid preset values keep the site's. */
export function withUserTheme(site: NebulaTheme, preset: unknown): NebulaTheme {
  return normalizeTheme({ ...site, ...pickUserTheme(preset) }, site);
}

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
    // by code points, so a cut never splits an emoji into a lone surrogate
    const label = typeof r.label === 'string' ? [...r.label.trim()].slice(0, MAX_SUPPORT_LINK_LABEL).join('') : '';
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

/** xterm's line height, clamped and kept to two decimals. */
function lineHeight(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.round(Math.min(TERMINAL_LINE_HEIGHT.max, Math.max(TERMINAL_LINE_HEIGHT.min, v)) * 100) / 100;
}

// a command is one console line: control characters (a newline would be a second command) are dropped
// oxlint-disable-next-line no-control-regex -- matching them is the point
const CONTROL = /[\u0000-\u001f\u007f]/g;

/** At most 8 buttons; both texts are cut to their limit and a button missing either is dropped. */
function consoleCommands(v: unknown, fallback: ConsoleCommand[]): ConsoleCommand[] {
  if (!Array.isArray(v)) return fallback;
  const out: ConsoleCommand[] = [];
  for (const raw of v.slice(0, MAX_CONSOLE_COMMANDS)) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    if (typeof r.label !== 'string' || typeof r.command !== 'string') continue;
    const label = r.label.replace(CONTROL, '').trim().slice(0, MAX_COMMAND_LABEL);
    const command = r.command.replace(CONTROL, '').trim().slice(0, MAX_COMMAND_LENGTH);
    if (label && command) out.push({ label, command });
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
    scrollbar: optional(r.scrollbar, d.scrollbar),
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
    serverHome: typeof r.serverHome === 'boolean' ? r.serverHome : d.serverHome,
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
    cardEntrance: CARD_ENTRANCES.find((entrance) => entrance === r.cardEntrance) ?? d.cardEntrance,
    hoverEffect: HOVER_EFFECTS.find((effect) => effect === r.hoverEffect) ?? d.hoverEffect,
    overlayMotion: OVERLAY_MOTIONS.find((motion) => motion === r.overlayMotion) ?? d.overlayMotion,
    animationSpeed: ANIMATION_SPEEDS.find((speed) => speed === r.animationSpeed) ?? d.animationSpeed,
    reduceMotion: typeof r.reduceMotion === 'boolean' ? r.reduceMotion : d.reduceMotion,
    pageTitles: typeof r.pageTitles === 'boolean' ? r.pageTitles : d.pageTitles,
    boxStyle: BOX_STYLES.find((style) => style === r.boxStyle) ?? d.boxStyle,
    statStyle: STAT_STYLES.find((style) => style === r.statStyle) ?? d.statStyle,
    consoleLayout: consoleLayout(r.consoleLayout, d.consoleLayout),
    terminalFrame: TERMINAL_FRAMES.find((frame) => frame === r.terminalFrame) ?? d.terminalFrame,
    terminalHeight: TERMINAL_HEIGHTS.find((height) => height === r.terminalHeight) ?? d.terminalHeight,
    terminalCursor: TERMINAL_CURSORS.find((cursor) => cursor === r.terminalCursor) ?? d.terminalCursor,
    terminalCursorBlink: typeof r.terminalCursorBlink === 'boolean' ? r.terminalCursorBlink : d.terminalCursorBlink,
    terminalLineHeight: lineHeight(r.terminalLineHeight, d.terminalLineHeight),
    consoleBanner: CONSOLE_BANNERS.find((banner) => banner === r.consoleBanner) ?? d.consoleBanner,
    chartStyle: CHART_STYLES.find((style) => style === r.chartStyle) ?? d.chartStyle,
    chartHeight: CHART_HEIGHTS.find((height) => height === r.chartHeight) ?? d.chartHeight,
    chartArrangement: CHART_ARRANGEMENTS.find((value) => value === r.chartArrangement) ?? d.chartArrangement,
    consoleCommands: consoleCommands(r.consoleCommands, d.consoleCommands),
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
    favicon: url(r.favicon, d.favicon),
    mobileNav: MOBILE_NAVS.find((nav) => nav === r.mobileNav) ?? d.mobileNav,
    mobileEditor: typeof r.mobileEditor === 'boolean' ? r.mobileEditor : d.mobileEditor,
    adminNavOrder:
      r.adminNavOrder && typeof r.adminNavOrder === 'object' && !Array.isArray(r.adminNavOrder)
        ? normalizeNavOrder(r.adminNavOrder)
        : d.adminNavOrder,
    userArrange: normalizeNavArrange(r.userArrange, d.userArrange),
  };
}
