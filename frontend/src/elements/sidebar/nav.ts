import {
  Children,
  type ComponentProps,
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { matchPath, useLocation } from 'react-router';
import { z } from 'zod';
import { useNebulaTheme } from '../../lib/apply.ts';
import { getUserSetting, removeUserSetting, Sidebar, setUserSetting, useUserSetting } from '../../lib/core.ts';
import {
  arrange,
  EMPTY_NAV_ORDER,
  isEmptyNavOrder,
  NAV_MENUS,
  type NavMenu,
  type NavOrder,
  navLinkId,
  navMenuOf,
  navSectionId,
  normalizeNavOrder,
} from '../../lib/navOrder.ts';

export type SidebarProps = ComponentProps<typeof Sidebar>;
export type SidebarLinkProps = ComponentProps<typeof Sidebar.Link>;

export type NavSection = {
  kind: 'section';
  /** `navSectionId`: what saved orders call it. */
  id: string;
  label: string;
  divider: ReactElement<{ label?: string }>;
  items: ReactNode[];
};
export type NavEntry = { kind: 'node'; node: ReactNode } | NavSection;

/**
 * The routers wrap menus in fragments, which Children.toArray keeps as single nodes. Children of a nested fragment
 * get its key as a prefix, so the admin categories (one fragment each) don't hand out the same keys twice.
 */
export function flatten(children: ReactNode, prefix = ''): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      return flatten((child.props as { children?: ReactNode }).children, `${prefix}${child.key}/`);
    }
    return prefix && isValidElement(child) ? [cloneElement(child, { key: `${prefix}${child.key}` })] : [child];
  });
}

export const isNavDivider = (node: ReactNode): node is ReactElement<{ label?: string }> =>
  isValidElement(node) && node.type === Sidebar.Divider;

/**
 * Core's sidebar header holds the dock (logo, Quick actions or the menu style's search, the server block) and on
 * the dashboard and admin pages a few links above a divider. The links stay navigation wherever the dock goes.
 */
export function splitHeader(header: ReactNode): { dock: ReactNode[]; nav: ReactNode[] } {
  const dock: ReactNode[] = [];
  const nav: ReactNode[] = [];
  for (const node of flatten(header, 'header/')) {
    (isNavDivider(node) || (isValidElement(node) && node.type === Sidebar.Link) ? nav : dock).push(node);
  }
  return { dock, nav };
}

/**
 * Follows the panel's own dividers: a labelled divider opens a section that collects the links after it, an
 * unlabelled one closes it and stays a plain rule. Labels come from the egg's route order (or the admin
 * categories), so operators name the sections in the panel itself.
 */
export function groupNav(nodes: ReactNode[]): NavEntry[] {
  const out: NavEntry[] = [];
  let section: NavSection | null = null;

  for (const node of nodes) {
    if (isNavDivider(node)) {
      const { label } = node.props;
      section = label ? { kind: 'section', id: navSectionId(label, node.key), label, divider: node, items: [] } : null;
      out.push(section ?? { kind: 'node', node });
    } else if (section) {
      section.items.push(node);
    } else {
      out.push({ kind: 'node', node });
    }
  }

  return out;
}

/** The Sidebar.Link in a menu node, which may sit inside a permission wrapper (`ServerCan`). */
export function findLink(node: ReactNode): SidebarLinkProps | null {
  if (!isValidElement(node)) return null;
  if (node.type === Sidebar.Link) return node.props as SidebarLinkProps;
  const { children } = node.props as { children?: unknown };
  if (typeof children === 'function') return null;
  for (const child of Children.toArray(children as ReactNode)) {
    const found = findLink(child);
    if (found) return found;
  }
  return null;
}

/** A menu node's id in saved orders (`navLinkId`); null for anything but a link, which keeps its slot. */
export function navNodeId(node: ReactNode): string | null {
  const link = findLink(node);
  return link ? navLinkId(link.to) : null;
}

export const navEntryId = (entry: NavEntry) => (entry.kind === 'section' ? entry.id : navNodeId(entry.node));

/** One saved order over grouped entries: the top level, then each section's links. */
export function arrangeEntries(entries: NavEntry[], order: NavOrder): NavEntry[] {
  return arrange(entries, navEntryId, order.top).map((entry) => {
    const inside = entry.kind === 'section' ? order.sections[entry.id] : undefined;
    return entry.kind === 'section' && inside ? { ...entry, items: arrange(entry.items, navNodeId, inside) } : entry;
  });
}

/**
 * The menu's flat nodes in the saved orders, applied in turn (the site's, then the user's). A link moved right after
 * a section would join that section wherever the menu is grouped again (GroupedNav, the top bar), so a plain rule
 * closes the section first; core's own order never puts a link there.
 */
export function arrangeMenu(nodes: ReactNode[], orders: NavOrder[]): ReactNode[] {
  if (orders.every(isEmptyNavOrder)) return nodes;

  const entries = orders.reduce(arrangeEntries, groupNav(nodes));
  return entries.flatMap((entry, index) => {
    if (entry.kind === 'section') return [entry.divider, ...entry.items];
    const before = entries[index - 1];
    return before?.kind === 'section' && !isNavDivider(entry.node)
      ? [createElement(Sidebar.Divider, { key: `nebula-close/${before.id}` }), entry.node]
      : [entry.node];
  });
}

/** Replaces the Sidebar.Link inside a menu node, keeping its wrappers (`ServerCan` renders nothing without access). */
export function swapLink(node: ReactNode, render: (link: SidebarLinkProps) => ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  if (node.type === Sidebar.Link) return render(node.props as SidebarLinkProps);
  return cloneElement(node, {
    children: Children.map(node.props.children, (child) => swapLink(child, render)),
  });
}

/** Each user's own order per menu, a core synced user setting so it follows them to every device. */
export const NAV_ORDER_KEY = 'nebula::nav_order';
type OwnOrders = Partial<Record<NavMenu, NavOrder>>;
// core caches the parse per schema and raw value, so every reader of one stored value gets the same objects
const OWN_ORDERS_SCHEMA = z
  .record(z.string(), z.unknown())
  .transform((map): OwnOrders => Object.fromEntries(NAV_MENUS.map((menu) => [menu, normalizeNavOrder(map[menu])])));
const NO_ORDERS: OwnOrders = {};

/** Stores the user's order for one menu; null (or an empty order) goes back to the site's. */
export function saveOwnNavOrder(menu: NavMenu, order: NavOrder | null) {
  const map: OwnOrders = { ...getUserSetting(NAV_ORDER_KEY, OWN_ORDERS_SCHEMA, NO_ORDERS) };
  if (order && !isEmptyNavOrder(order)) map[menu] = order;
  else delete map[menu];

  const kept = Object.fromEntries(Object.entries(map).filter(([, saved]) => saved && !isEmptyNavOrder(saved)));
  if (Object.keys(kept).length === 0) removeUserSetting(NAV_ORDER_KEY);
  else setUserSetting(NAV_ORDER_KEY, kept);
}

/**
 * The orders over the current page's menu: the theme's for the admin menu, then the user's own. `menu` is null in
 * the setup wizard, which is never arranged.
 */
export function useNavOrders(): { menu: NavMenu | null; site: NavOrder; own: NavOrder } {
  const { pathname } = useLocation();
  const { adminNavOrder } = useNebulaTheme();
  const [stored] = useUserSetting(NAV_ORDER_KEY, OWN_ORDERS_SCHEMA, NO_ORDERS);
  const menu = navMenuOf(pathname);

  return {
    menu,
    site: menu === 'admin' ? adminNavOrder : EMPTY_NAV_ORDER,
    own: (menu && stored[menu]) || EMPTY_NAV_ORDER,
  };
}

/** Whether a menu node is the current page, the way core's Sidebar.Link decides it. */
export function isNavActive(node: ReactNode, pathname: string): boolean {
  const link = findLink(node);
  if (!link) return false;
  const path = link.to.endsWith('/*') ? link.to.slice(0, -2) : link.to;
  // redirects can point off the panel
  if (!path.startsWith('/')) return false;
  return (
    !!matchPath({ path, end: !!link.end }, pathname) ||
    (link.activeMatches ?? []).some((pattern) => !!matchPath({ path: pattern, end: false }, pathname))
  );
}
