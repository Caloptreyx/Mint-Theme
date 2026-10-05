import { useEffect, useSyncExternalStore } from 'react';
import { axiosInstance } from './core.ts';
import { type AnnouncementCta, type CtaMap, normalizeCtas } from './cta.ts';

// Buttons follow announcement visibility: the global map only holds unscoped announcements' buttons (any signed in
// user may read it), and each server's scoped ones come from a route behind core's server access check.
const CTA_PATH = 'extensions/dev.caloptreyx.mint/announcement-ctas';
const CACHE_KEY = 'nebula:announcement-ctas';
const EMPTY: CtaMap = {};

function readCache(): CtaMap {
  try {
    return normalizeCtas(JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null'));
  } catch {
    return {};
  }
}

// the last known global map shows the buttons right away, like apply.ts does with the theme
let ctas: CtaMap = readCache();
let request: Promise<CtaMap> | null = null;
// per server uuid, kept in memory for the page load only: scoped buttons are never written to localStorage
const serverCtas = new Map<string, CtaMap>();
const serverRequests = new Map<string, Promise<CtaMap>>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function publish(next: CtaMap) {
  ctas = next;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // private mode or full storage, the next load waits for the fetch instead
  }
  notify();
}

/**
 * Fetches the global map once per page load and shares the answer; `force` asks again. A failed request is
 * forgotten, so the next caller tries again instead of getting the same rejection for good.
 */
function loadCtas(force = false): Promise<CtaMap> {
  if (force || !request) {
    const attempt = axiosInstance.get<{ ctas?: unknown }>(`/api/client/${CTA_PATH}`).then(({ data }) => {
      publish(normalizeCtas(data.ctas));
      return ctas;
    });
    attempt.catch(() => {
      if (request === attempt) request = null;
    });
    request = attempt;
  }
  return request;
}

/** One server's scoped buttons, fetched once per server and page load; a failure is forgotten like `loadCtas`. */
function loadServerCtas(server: string): Promise<CtaMap> {
  const pending = serverRequests.get(server);
  if (pending) return pending;

  const attempt = axiosInstance
    .get<{ ctas?: unknown }>(`/api/client/servers/${server}/${CTA_PATH}`)
    .then(({ data }) => {
      const map = normalizeCtas(data.ctas);
      // a refresh may have dropped this request meanwhile, its answer could predate the save
      if (serverRequests.get(server) === attempt) {
        serverCtas.set(server, map);
        notify();
      }
      return map;
    });
  attempt.catch(() => {
    if (serverRequests.get(server) === attempt) serverRequests.delete(server);
  });
  serverRequests.set(server, attempt);
  return attempt;
}

/** The stored button of any announcement, shown or not, for the admin form (`announcements.read`). */
export async function loadAdminCta(announcement: string): Promise<AnnouncementCta | null> {
  const { data } = await axiosInstance.get<{ cta?: unknown }>(`/api/admin/${CTA_PATH}/${announcement}`);
  return normalizeCtas({ [announcement]: data.cta })[announcement.toLowerCase()] ?? null;
}

/**
 * After a save: the backend decides who sees a button, so the global map is fetched again and the server maps are
 * dropped (each is fetched again when an alert needs it), instead of writing the button in by hand.
 */
export function refreshCtas() {
  serverRequests.clear();
  serverCtas.clear();
  notify();
  loadCtas(true).catch(() => undefined);
}

// another tab's fetch or save lands in the cache, so this one follows it without asking the server
const onStorage = (event: StorageEvent) => {
  if (event.key !== CACHE_KEY) return;
  ctas = readCache();
  notify();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
};

/** The global map, fetched the first time a caller with `enabled` mounts. */
export function useCtas(enabled: boolean): CtaMap {
  const map = useSyncExternalStore(subscribe, () => ctas);
  useEffect(() => {
    // a failed fetch keeps the cached map; the endpoint is not worth a toast on every page
    if (enabled) loadCtas().catch(() => undefined);
  }, [enabled]);
  return map;
}

/** A server's scoped buttons, fetched the first time a caller asks for that server; null asks for nothing. */
export function useServerCtas(server: string | null): CtaMap {
  const map = useSyncExternalStore(subscribe, () => (server === null ? EMPTY : (serverCtas.get(server) ?? EMPTY)));
  // `map` is a dependency so that a refresh, which empties it, asks again
  useEffect(() => {
    if (server !== null && map === EMPTY) loadServerCtas(server).catch(() => undefined);
  }, [server, map]);
  return map;
}
