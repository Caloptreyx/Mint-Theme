import { useLayoutEffect } from 'react';
import { type ServerStore, useServerStoreApi } from '@/stores/server.ts';
import { withConsoleRoute } from '../../lib/routeOrder.ts';

/**
 * Registered in `pages.global`, inside core's server store provider (one per router, so popout windows get their
 * own). Core's ServerRouter and quick actions read the egg configuration's `routeOrder` straight from the loaded
 * server, so the order is fixed there (`withConsoleRoute`) the moment a server lands in the store: the listener
 * runs inside `setServer`, before React renders the router with it.
 */
export default function ConsoleRouteOrder() {
  const store = useServerStoreApi();

  useLayoutEffect(() => {
    const fix = (server: ServerStore['server']) => {
      const config = server.eggConfiguration;
      if (!config?.routeOrder) return;

      const routeOrder = withConsoleRoute(config.routeOrder);
      if (routeOrder !== config.routeOrder)
        store.setState({ server: { ...server, eggConfiguration: { ...config, routeOrder } } });
    };

    fix(store.getState().server);
    return store.subscribe((state, prev) => {
      if (state.server !== prev.server) fix(state.server);
    });
  }, [store]);

  return null;
}
