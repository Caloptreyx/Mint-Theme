/**
 * The side menu's arrangement, on top of the order core renders it in: the theme's `adminNavOrder` for the admin
 * menu (site wide), then each user's own order for the menu they are in (`nebula::nav_order`). Pure, so the tests
 * run it without React; elements/sidebar/nav.ts applies it to the menu's nodes.
 */

export const NAV_MENUS = ['server', 'dashboard', 'admin'] as const;
export type NavMenu = (typeof NAV_MENUS)[number];
/**
 * Ids are a link's path (see `navLinkId`) and `section:` ids for the sections the panel's labelled dividers open.
 * Neither list needs every id: what an order leaves out keeps its place after the entry core shows before it. A type,
 * not an interface, so it stays assignable to the JSON core stores user settings as.
 */
export type NavOrder = {
  /** The top level: links outside a section and whole sections. */
  top: string[];
  /** Per section id, the order of its links. */
  sections: Record<string, string[]>;
};

export const EMPTY_NAV_ORDER: NavOrder = { top: [], sections: {} };

const MAX_IDS = 200;
const MAX_SECTIONS = 50;
const MAX_ID_LENGTH = 300;

export const isEmptyNavOrder = (order: NavOrder) => order.top.length === 0 && Object.keys(order.sections).length === 0;

/** Which of core's sidebars a page shows; null for the setup wizard, whose sidebar holds its steps. */
export function navMenuOf(pathname: string): NavMenu | null {
  if (pathname === '/oobe' || pathname.startsWith('/oobe/')) return null;
  if (/^\/server\/[^/]+/.test(pathname)) return 'server';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return 'dashboard';
}

/**
 * A link's id: its path, without a server's id (its pages and the server menu's "View in Admin Area" link), so one
 * order fits every server. The admin menu itself never links to one server.
 */
export function navLinkId(to: string): string {
  const path = to.endsWith('/*') ? to.slice(0, -2) : to;
  return path
    .replace(/^\/server\/[^/]+(?=\/|$)/, '/server')
    .replace(/^\/admin\/servers\/[^/]+(?=\/|$)/, '/admin/servers/:server');
}

/**
 * A section's id. The admin menu wraps each category in a fragment keyed by the category, which flattening puts in
 * front of the divider's own key (`.0/.1:$system/.0`); its label is translated, the key is not. The server and
 * dashboard menus label their dividers with the operator's own text from the route order, so the label is the id.
 */
export function navSectionId(label: string, key: string | null): string {
  const category = key ? /\$([^/]+)\/[^/]+$/.exec(key)?.[1] : undefined;
  return `section:${category ? category.replace(/=2/g, ':').replace(/=0/g, '=') : label}`;
}

const isId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH;

const ids = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter(isId))].slice(0, MAX_IDS) : []);

/** Stored orders come from users (their own settings) and operators (the theme): strings only, bounded, deduplicated. */
export function normalizeNavOrder(raw: unknown): NavOrder {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const sections = (
    r.sections && typeof r.sections === 'object' && !Array.isArray(r.sections) ? r.sections : {}
  ) as Record<string, unknown>;

  return {
    top: ids(r.top),
    // fromEntries defines own properties, so a `__proto__` id stays a plain key
    sections: Object.fromEntries(
      Object.entries(sections)
        .filter(([id]) => isId(id))
        .map(([id, list]) => [id, ids(list)] as const)
        .filter(([, list]) => list.length > 0)
        .slice(0, MAX_SECTIONS),
    ),
  };
}

/**
 * Puts the items with an id in the order `order` gives them. An id the order does not know (a route added later, an
 * extension's link) follows the item core shows right before it; items without an id (plain rules) keep their slot.
 */
export function arrange<T>(items: readonly T[], idOf: (item: T) => string | null, order: readonly string[]): T[] {
  if (order.length === 0) return [...items];

  const rank = new Map<string, number>();
  order.forEach((id, index) => {
    if (!rank.has(id)) rank.set(id, index);
  });

  const movable = items.filter((item) => idOf(item) !== null);
  const rankOf = (item: T) => rank.get(idOf(item) as string);
  // Array.prototype.sort is stable, so items sharing an id keep core's order
  const sorted = movable.filter((item) => rankOf(item) !== undefined).sort((a, b) => rankOf(a)! - rankOf(b)!);

  let previous: T | null = null;
  for (const item of movable) {
    if (rankOf(item) === undefined) sorted.splice(previous === null ? 0 : sorted.indexOf(previous) + 1, 0, item);
    previous = item;
  }

  let next = 0;
  return items.map((item) => (idOf(item) === null ? item : sorted[next++]));
}

/**
 * The ids someone arranged (`next`, what they could see) kept with the ids of `previous` they could not see this
 * time (another server's links, an admin page their role hides), each after the id it followed before.
 */
export function mergeOrder(previous: readonly string[], next: readonly string[]): string[] {
  const out = [...next];
  const seen = new Set(next);
  let before: string | null = null;

  for (const id of previous) {
    if (!seen.has(id)) {
      out.splice(before === null ? 0 : out.indexOf(before) + 1, 0, id);
      seen.add(id);
    }
    before = id;
  }

  return out;
}

/** An arrangement made from what was on screen, merged into the order it replaces (see `mergeOrder`). */
export function mergeNavOrder(previous: NavOrder, next: NavOrder): NavOrder {
  const sections: Record<string, string[]> = { ...previous.sections };
  for (const [id, list] of Object.entries(next.sections)) sections[id] = mergeOrder(previous.sections[id] ?? [], list);
  return normalizeNavOrder({ top: mergeOrder(previous.top, next.top), sections });
}
