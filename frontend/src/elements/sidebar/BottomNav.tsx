import { faBars, faLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fragment, isValidElement, type ReactElement, type ReactNode, useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useNebulaTheme } from '../../lib/apply.ts';
import { Card } from '../../lib/core.ts';
import { customIconOf, useCustomIcon } from '../../lib/customIcon.ts';
import { isEmptyNavOrder, type NavOrder } from '../../lib/navOrder.ts';
import type { MobileNav } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import { withConsoleRoot } from '../console/ConsoleFallback.tsx';
import GroupedNav from './GroupedNav.tsx';
import {
  arrangeMenu,
  findLink,
  flatten,
  isNavActive,
  type SidebarLinkProps,
  type SidebarProps,
  swapLink,
  useNavOrders,
} from './nav.ts';

// Paths the bar prefers, in order. Server paths are relative to the server's own base (`/server/<id>`): Mint's
// Home (the console with `serverHome` off), the console, files, then backups or settings, whichever the user may
// open first.
const SERVER_ORDER = ['', '/console', '/files', '/backups', '/settings'];
const ADMIN_ORDER = ['/', '/admin', '/admin/servers', '/admin/users'];
const DASHBOARD_ORDER = ['/', '/account', '/admin'];

// colours, the current page's pill and the press tint are app.css's (`.nebula-bn-*`), which also gives Menu the pill
// while no link on the bar is the current page
const ITEM_CLASS =
  'nebula-bn-item flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pt-2 pb-1.5 text-[11px] font-medium leading-none rounded-md focus-visible:outline-solid! focus-visible:outline-2! focus-visible:-outline-offset-2! focus-visible:outline-(--mantine-color-blue-filled)!';
const ICON_CLASS = 'nebula-bn-icon flex h-7 w-12 items-center justify-center rounded-full text-base';

// 'bottomBar' spans the bottom edge and reaches under the system navigation bar (`.nebula-bn-edge`, app.css);
// 'floatingBar' is a pill held clear of the edges and that bar. Both keep their links to a phone's width on tablets.
const BAR_CLASS: Record<Exclude<MobileNav, 'drawer'>, string> = {
  bottomBar: 'nebula-bn-edge inset-x-0 rounded-none! border-x-0! border-b-0!',
  floatingBar:
    'inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] mx-auto max-w-md rounded-full! px-1.5! shadow-lg',
};
// what the bar covers above its own height: the floating bar's gap to the system navigation bar
const BAR_GAP: Record<Exclude<MobileNav, 'drawer'>, string> = { bottomBar: '0px', floatingBar: '0.75rem' };

// core's floating menu button: an ActionIcon right inside the Card core renders first, before its drawer
const MENU_BUTTON = '.mantine-Card-root > .mantine-ActionIcon-root';
let warnedMissingButton = false;

/** Clicks core's menu button, looking through the Sidebar's own nodes between the marker and the bar. */
function openDrawer(marker: HTMLElement | null, bar: HTMLElement | null) {
  for (let node = marker?.nextElementSibling; node && node !== bar; node = node.nextElementSibling) {
    const button = node.matches(MENU_BUTTON) ? node : node.querySelector(MENU_BUTTON);
    if (button instanceof HTMLElement) {
      button.click();
      return;
    }
  }
  if (!warnedMissingButton) {
    warnedMissingButton = true;
    console.warn("[Mint] the bottom bar's Menu button found no sidebar menu button to open the drawer with");
  }
}

const linkPath = (node: ReactNode) => {
  const to = findLink(node)?.to ?? '';
  return to.endsWith('/*') ? to.slice(0, -2) : to;
};

/** Menu nodes in the order of their paths in `order`, then with `rest` the others in the menu's order. */
function ranked(nodes: ReactNode[], order: string[], base = '', rest = true): ReactNode[] {
  const rank = (node: ReactNode) => order.indexOf(linkPath(node).slice(base.length));
  const preferred = nodes.filter((node) => rank(node) !== -1).sort((a, b) => rank(a) - rank(b));
  return rest ? [...preferred, ...nodes.filter((node) => rank(node) === -1)] : preferred;
}

/**
 * The menu entries worth a slot, from the menu the Sidebar received, so routes the user may not see or the egg
 * hides never show and extension routes can. On a server page its own links (the dashboard and admin links above
 * them stay in the drawer); in the admin area Back and the busiest pages; on the dashboard Servers, Account, Admin.
 * A menu the site or the user arranged gives its first links instead, in that order.
 */
function primaryLinks({ header, children }: SidebarProps, pathname: string, orders: NavOrder[]): ReactNode[] {
  const menu =
    isValidElement<{ children?: ReactNode }>(children) && children.type === GroupedNav
      ? children.props.children
      : children;
  const arranged = !orders.every(isEmptyNavOrder);
  // redirects can point off the panel
  const nodes = [...flatten(header, 'header/'), ...arrangeMenu(flatten(menu, 'menu/'), orders)].filter((node) =>
    linkPath(node).startsWith('/'),
  );

  const server = nodes.map((node) => /^\/server\/[^/]+/.exec(linkPath(node))?.[0]).find(Boolean);
  if (server) {
    const own = nodes.filter((node) => linkPath(node) === server || linkPath(node).startsWith(`${server}/`));
    return arranged ? own : ranked(own, SERVER_ORDER, server);
  }
  if (arranged) return nodes;
  if (pathname.startsWith('/admin')) return ranked(nodes, ADMIN_ORDER);
  return ranked(nodes, DASHBOARD_ORDER, '', false);
}

function BarLink({ link, active }: { link: SidebarLinkProps; active: boolean }) {
  const { pathname } = useLocation();
  const to = link.to.endsWith('/*') ? link.to.slice(0, -2) : link.to;
  const icon = useCustomIcon(customIconOf(link), link.icon);

  // the console's link leads to Home (the server root) while core blocks the console; it lights up there only
  return withConsoleRoot(to, (root) => {
    const current = root ? pathname.replace(/\/$/, '') === root : active;
    return (
      <Link to={root ?? to} aria-current={current ? 'page' : undefined} className={ITEM_CLASS}>
        <span className={ICON_CLASS}>
          <FontAwesomeIcon icon={icon ?? faLink} />
        </span>
        <span className='w-full truncate text-center'>{link.name ?? link.title}</span>
      </Link>
    );
  });
}

/**
 * `mobileNav: 'bottomBar'` or `'floatingBar'`: below lg a bar fixed to the bottom of the screen with up to four links
 * from the menu and a Menu button. Core keeps its drawer's state inside the Sidebar, so Menu clicks core's own floating
 * menu button, which app.css hides after the marker rendered just before core's element. `--nebula-bottom-nav-h` on
 * html (with `data-nebula-bottom-nav` while the bar shows) is the room the bar covers: its measured height without the
 * padding that only reaches under the system navigation bar, plus its gap and `env(safe-area-inset-bottom)`, which is
 * left to CSS because Chrome on Android changes it while its bottom chin slides in and out. app.css turns it into room
 * below the content column, core's bottom action bar and bottom toasts. app.css hides the bar while a text field has
 * focus on a touch screen (the on-screen keyboard is up), which measures 0 and gives that room back. `lg:` is the
 * variant core hides its menu button with, so the bar shows exactly where the drawer does; every desktop layout stays
 * as it was.
 */
export default function BottomNav({ element, ...sidebar }: SidebarProps & { element: ReactElement<SidebarProps> }) {
  const { mobileNav } = useNebulaTheme();
  const { pathname } = useLocation();
  const { t } = useExtTranslations();
  const { site, own } = useNavOrders();
  const marker = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  // the setup wizard's sidebar holds its steps, so it keeps core's menu button
  const style = mobileNav === 'drawer' || pathname.startsWith('/oobe') ? null : mobileNav;

  useLayoutEffect(() => {
    const el = bar.current;
    if (!style || !el) return;
    const root = document.documentElement;

    const clear = () => {
      root.style.removeProperty('--nebula-bottom-nav-h');
      delete root.dataset.nebulaBottomNav;
    };
    // display: none (from `lg` up, or while typing) measures 0, which clears the room again
    const measure = () => {
      if (el.offsetHeight) {
        const height = el.offsetHeight - (Number.parseFloat(getComputedStyle(el).paddingBottom) || 0);
        root.style.setProperty(
          '--nebula-bottom-nav-h',
          `calc(${Math.round(height)}px + ${BAR_GAP[style]} + env(safe-area-inset-bottom, 0px))`,
        );
        root.dataset.nebulaBottomNav = '';
      } else {
        clear();
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => {
      observer.disconnect();
      clear();
    };
  }, [style]);

  if (!style) return element;

  const links = primaryLinks(sidebar, pathname, [site, own]);

  return (
    <>
      <span ref={marker} hidden data-nebula-bottom-nav-marker='' />
      {element}
      <Card
        ref={bar}
        p={0}
        data-nebula-bottom-nav-bar=''
        className={`fixed! z-100 backdrop-blur-md lg:hidden! ${BAR_CLASS[style]}`}
      >
        {/* links first, as they show: one the user may not open renders nothing, so past the fourth link one
            only shows when an earlier one is missing; Menu always comes last */}
        <nav
          aria-label={t('bottomNav.label', {})}
          className='nebula-bn-nav mx-auto flex w-full max-w-xl [&>a:nth-of-type(n+5)]:hidden'
        >
          {links.map((node) => (
            <Fragment key={(node as ReactElement).key}>
              {swapLink(node, (link) => (
                <BarLink link={link} active={isNavActive(node, pathname)} />
              ))}
            </Fragment>
          ))}
          <button
            type='button'
            onClick={() => openDrawer(marker.current, bar.current)}
            className={`nebula-bn-menu ${ITEM_CLASS} text-[11px]! leading-none!`}
          >
            <span className={ICON_CLASS}>
              <FontAwesomeIcon icon={faBars} />
            </span>
            <span className='w-full truncate text-center'>{t('bottomNav.menu', {})}</span>
          </button>
        </nav>
      </Card>
    </>
  );
}
