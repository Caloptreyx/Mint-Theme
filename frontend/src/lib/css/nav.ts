// The menu link styles and the sidebar layouts.
import type { NavHover, NebulaTheme } from '../theme.ts';
import type { Motion } from './motion.ts';

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

/** Menu links (navHoverCss; 'default' is app.css's accent tint on the current link), then the sidebar layout. */
export function navCss(t: NebulaTheme, motion: Motion): string[] {
  return [...(t.navHover === 'default' ? [] : navHoverCss(t.navHover, motion)), ...layoutCss(t)];
}

/**
 * Core's menu links are a NavLink around a subtle Button that gets `active` while current, the same in every
 * sidebar layout; the horizontal layout repeats them in `.nebula-topnav` and its portaled section dropdowns
 * (`.nebula-topnav-menu`). The accent is read on the link, not the button, so `buttonColor` (which repaints the
 * blue variables on buttons) leaves the menu on the accent.
 */
function navHoverCss(hover: Exclude<NavHover, 'default'>, motion: Motion): string[] {
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
      `${icon}{padding:0.375em 0.3em;border-radius:var(--mantine-radius-sm);transition:background-color ${motion.ms(120)}ms ease,color ${motion.ms(120)}ms ease;}`,
      motion.still(`${icon}{transition:none;}`),
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
  // core's links, and 'Arrange menu' (elements/sidebar/ArrangeMenu.tsx), which copies their button
  const LINK = `${SIDEBAR} :is(a > .mantine-Button-root,.nebula-arrange)`;
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
