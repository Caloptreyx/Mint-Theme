import {
  Children,
  type ComponentProps,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { matchPath } from 'react-router';
import Sidebar from '@/elements/Sidebar.tsx';

export type SidebarProps = ComponentProps<typeof Sidebar>;
export type SidebarLinkProps = ComponentProps<typeof Sidebar.Link>;

export type NavEntry = { kind: 'node'; node: ReactNode } | { kind: 'section'; label: string; items: ReactNode[] };

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
  let section: Extract<NavEntry, { kind: 'section' }> | null = null;

  for (const node of nodes) {
    if (isNavDivider(node)) {
      const { label } = node.props;
      section = label ? { kind: 'section', label, items: [] } : null;
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
function findLink(node: ReactNode): SidebarLinkProps | null {
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
