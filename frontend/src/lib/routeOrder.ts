type RouteOrderItem = { type: string; path?: string };

/**
 * An egg configuration's `routeOrder` names server routes by path, and core hides every named route it does not
 * list (sidebar and router alike). With Home on (`home`), Mint moves the console from `/` to `/console` and puts
 * Home at `/`, so:
 * - an order saved without Mint's route interceptor (before Mint was installed, or while it was disabled) lists the
 *   console as `/` and has no `/console`: Home takes the console's slot and the console is gone. Such an order gets
 *   `/console` right after its `/`, the same pair Mint's own default order has.
 * - an order that lists `/console` but not `/` would hide Home, the server root every core link (and core's guard
 *   while a server installs) sends users to, so they would land on Not Found. It gets `/` right before `/console`.
 * With Home off the console stays at `/`, as in core: an order saved while Home was on that lists `/console` but not
 * `/` gets its `/console` renamed to `/`. An order listing both shows the console in the slot of `/`.
 * An order that needs no change is returned as is (same reference).
 */
export function withConsoleRoute<T extends RouteOrderItem>(order: T[], home: boolean): T[] {
  const root = order.findIndex((item) => item.type === 'route' && item.path === '/');
  const console = order.findIndex((item) => item.type === 'route' && item.path === '/console');
  if (!home) {
    return root === -1 && console !== -1
      ? order.map((item, i) => (i === console ? { ...item, path: '/' } : item))
      : order;
  }
  if ((root === -1) === (console === -1)) return order;

  if (root === -1) return [...order.slice(0, console), { type: 'route', path: '/' } as T, ...order.slice(console)];
  return [...order.slice(0, root + 1), { type: 'route', path: '/console' } as T, ...order.slice(root + 1)];
}
