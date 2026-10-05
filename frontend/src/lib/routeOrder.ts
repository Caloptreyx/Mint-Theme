type RouteOrderItem = { type: string; path?: string };

/**
 * An egg configuration's `routeOrder` names server routes by path, and core hides every named route it does not
 * list (sidebar and router alike). Mint moves the console from `/` to `/console` and puts Home at `/`, so:
 * - an order saved without Mint's route interceptor (before Mint was installed, or while it was disabled) lists the
 *   console as `/` and has no `/console`: Home takes the console's slot and the console is gone. Such an order gets
 *   `/console` right after its `/`, the same pair Mint's own default order has.
 * - an order that lists `/console` but not `/` would hide Home, the server root every core link (and core's guard
 *   while a server installs) sends users to, so they would land on Not Found. It gets `/` right before `/console`.
 * An order that lists both, or neither, is returned as is (same reference).
 */
export function withConsoleRoute<T extends RouteOrderItem>(order: T[]): T[] {
  const root = order.findIndex((item) => item.type === 'route' && item.path === '/');
  const console = order.findIndex((item) => item.type === 'route' && item.path === '/console');
  if ((root === -1) === (console === -1)) return order;

  if (root === -1) return [...order.slice(0, console), { type: 'route', path: '/' } as T, ...order.slice(console)];
  return [...order.slice(0, root + 1), { type: 'route', path: '/console' } as T, ...order.slice(root + 1)];
}
