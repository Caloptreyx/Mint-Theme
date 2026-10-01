type RouteOrderItem = { type: string; path?: string };

/**
 * An egg configuration's `routeOrder` names server routes by path, and core hides every named route it does not
 * list (sidebar and router alike). Mint moves the console from `/` to `/console` and puts Home at `/`, so an order
 * saved without Mint's route interceptor (before Mint was installed, or while it was disabled) lists the console
 * as `/` and has no `/console`: Home takes the console's slot and the console is gone. Such an order gets
 * `/console` right after its `/`, the same pair Mint's own default order has. An order that already lists
 * `/console`, or has no `/` at all, is returned as is (same reference).
 */
export function withConsoleRoute<T extends RouteOrderItem>(order: T[]): T[] {
  if (order.some((item) => item.type === 'route' && item.path === '/console')) return order;

  const root = order.findIndex((item) => item.type === 'route' && item.path === '/');
  if (root === -1) return order;

  return [...order.slice(0, root + 1), { type: 'route', path: '/console' } as T, ...order.slice(root + 1)];
}
