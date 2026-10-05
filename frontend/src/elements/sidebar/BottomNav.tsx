import { faBars, faLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from 'react';
import { Link, useLocation } from 'react-router';
import { useNebulaTheme } from '../../lib/apply.ts';
import { Card, Sidebar } from '../../lib/core.ts';
import { useExtTranslations } from '../../translations.ts';
import { withConsoleRoot } from '../console/ConsoleFallback.tsx';
import GroupedNav from './GroupedNav.tsx';
import { findLink, flatten, isNavActive, type SidebarLinkProps, type SidebarProps } from './nav.ts';

// Paths the bar prefers, in order. Server paths are relative to the server's own base (`/server/<id>`): Mint's
// Home, the console, files, then backups or settings, whichever the user may open first.
const SERVER_ORDER = ['', '/console', '/files', '/backups', '/settings'];
const ADMIN_ORDER = ['/', '/admin', '/admin/servers', '/admin/users'];
const DASHBOARD_ORDER = ['/', '/account', '/admin'];

const ITEM_CLASS =
  'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pt-2 pb-1.5 text-[11px] font-medium leading-none rounded-md focus-visible:outline-solid! focus-visible:outline-2! focus-visible:-outline-offset-2! focus-visible:outline-(--mantine-color-blue-filled)!';
const ICON_CLASS =
  'flex h-7 w-12 items-center justify-center rounded-full text-base motion-safe:transition-colors motion-safe:duration-150';

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
 */
function primaryLinks({ header, children }: SidebarProps, pathname: string): ReactNode[] {
  const menu =
    isValidElement<{ children?: ReactNode }>(children) && children.type === GroupedNav
      ? children.props.children
      : children;
  // redirects can point off the panel
  const nodes = [...flatten(header, 'header/'), ...flatten(menu, 'menu/')].filter((node) =>
    linkPath(node).startsWith('/'),
  );

  const server = nodes.map((node) => /^\/server\/[^/]+/.exec(linkPath(node))?.[0]).find(Boolean);
  if (server) {
    const own = nodes.filter((node) => linkPath(node) === server || linkPath(node).startsWith(`${server}/`));
    return ranked(own, SERVER_ORDER, server);
  }
  if (pathname.startsWith('/admin')) return ranked(nodes, ADMIN_ORDER);
  return ranked(nodes, DASHBOARD_ORDER, '', false);
}

/** Replaces the Sidebar.Link inside a menu node, keeping its wrappers (`ServerCan` renders nothing without access). */
function swapLink(node: ReactNode, render: (link: SidebarLinkProps) => ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  if (node.type === Sidebar.Link) return render(node.props as SidebarLinkProps);
  return cloneElement(node, {
    children: Children.map(node.props.children, (child) => swapLink(child, render)),
  });
}

function BarLink({ link, active }: { link: SidebarLinkProps; active: boolean }) {
  const { pathname } = useLocation();
  const to = link.to.endsWith('/*') ? link.to.slice(0, -2) : link.to;

  // the console's link leads to Home (the server root) while core blocks the console; it lights up there only
  return withConsoleRoot(to, (root) => {
    const current = root ? pathname.replace(/\/$/, '') === root : active;
    return (
      <Link
        to={root ?? to}
        aria-current={current ? 'page' : undefined}
        className={`${ITEM_CLASS} ${current ? 'text-(--mantine-color-blue-light-color)' : 'text-(--mantine-color-dimmed)'}`}
      >
        <span className={`${ICON_CLASS} ${current ? 'bg-(--mantine-color-blue-light)' : ''}`}>
          <FontAwesomeIcon icon={link.icon ?? faLink} />
        </span>
        <span className='w-full truncate text-center'>{link.name ?? link.title}</span>
      </Link>
    );
  });
}

/**
 * `mobileNav: 'bottomBar'`: below lg a bar fixed to the bottom of the screen with up to four links from the menu and
 * a Menu button. Core keeps its drawer's state inside the Sidebar, so Menu clicks core's own floating menu button,
 * which app.css hides after the marker rendered just before core's element. The bar measures itself into
 * `--nebula-bottom-nav-h` on html (with `data-nebula-bottom-nav` while it shows), which app.css turns into room
 * below the content column, core's bottom action bar and bottom toasts. `lg:` is the variant core hides its menu
 * button with, so the bar shows exactly where the drawer does; every desktop layout stays as it was.
 */
export default function BottomNav({ element, ...sidebar }: SidebarProps & { element: ReactElement<SidebarProps> }) {
  const { mobileNav } = useNebulaTheme();
  const { pathname } = useLocation();
  const { t } = useExtTranslations();
  const marker = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const shown = mobileNav === 'bottomBar' && !pathname.startsWith('/oobe');

  useLayoutEffect(() => {
    const el = bar.current;
    if (!shown || !el) return;
    const root = document.documentElement;

    const clear = () => {
      root.style.removeProperty('--nebula-bottom-nav-h');
      delete root.dataset.nebulaBottomNav;
    };
    // display: none from `lg` up measures 0, which clears the room again
    const measure = () => {
      if (el.offsetHeight) {
        root.style.setProperty('--nebula-bottom-nav-h', `${el.offsetHeight}px`);
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
  }, [shown]);

  // the setup wizard's sidebar holds its steps, so it keeps core's menu button
  if (!shown) return element;

  const links = primaryLinks(sidebar, pathname);

  return (
    <>
      <span ref={marker} hidden data-nebula-bottom-nav-marker='' />
      {element}
      <Card
        ref={bar}
        p={0}
        className='fixed! inset-x-0 bottom-0 z-100 rounded-none! border-x-0! border-b-0! pb-[env(safe-area-inset-bottom)]! backdrop-blur-md lg:hidden!'
      >
        {/* links first, as they show: one the user may not open renders nothing, so past the fourth link one
            only shows when an earlier one is missing; Menu always comes last */}
        <nav aria-label={t('bottomNav.label', {})} className='flex w-full [&>a:nth-of-type(n+5)]:hidden'>
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
            className={`${ITEM_CLASS} text-[11px]! leading-none! text-(--mantine-color-dimmed)`}
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
