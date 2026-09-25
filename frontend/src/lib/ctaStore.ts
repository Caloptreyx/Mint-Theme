import { useEffect, useSyncExternalStore } from 'react';
import { axiosInstance } from '@/api/axios.ts';
import { type AnnouncementCta, type CtaMap, normalizeCtas } from './cta.ts';

const CTA_API = '/api/client/extensions/dev.s4way.nebula/announcement-ctas';
const CACHE_KEY = 'nebula:announcement-ctas';

function readCache(): CtaMap {
  try {
    return normalizeCtas(JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null'));
  } catch {
    return {};
  }
}

// the last known map shows the buttons right away, like apply.ts does with the theme
let ctas: CtaMap = readCache();
let request: Promise<CtaMap> | null = null;
const listeners = new Set<() => void>();

function publish(next: CtaMap) {
  ctas = next;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // private mode or full storage, the next load waits for the fetch instead
  }
  for (const listener of listeners) listener();
}

const currentCtas = () => ctas;

/** Fetches the map once per page load and shares the answer; `force` asks again (the admin form). */
export function loadCtas(force = false): Promise<CtaMap> {
  if (force || !request) {
    request = axiosInstance.get<{ ctas?: unknown }>(CTA_API).then(({ data }) => {
      publish(normalizeCtas(data.ctas));
      return ctas;
    });
  }
  return request;
}

/** After a save, so every alert on the page follows without another fetch. */
export function rememberCta(uuid: string, cta: AnnouncementCta | null) {
  const next = { ...ctas };
  if (cta) next[uuid] = cta;
  else delete next[uuid];
  publish(next);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The map, fetched the first time a caller with `enabled` mounts. */
export function useCtas(enabled: boolean): CtaMap {
  const map = useSyncExternalStore(subscribe, currentCtas);
  useEffect(() => {
    // a failed fetch keeps the cached map; the endpoint is not worth a toast on every page
    if (enabled) loadCtas().catch(() => undefined);
  }, [enabled]);
  return map;
}
