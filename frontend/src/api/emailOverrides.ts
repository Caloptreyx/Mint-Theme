import { axiosInstance } from '../lib/core.ts';

const BASE = '/api/admin/extensions/dev.caloptreyx.mint/email-overrides';

/** Core templates whose saved HTML in Mail Templates overrides Mint's default layout. */
export const getEmailOverrides = (): Promise<string[]> =>
  axiosInstance
    .get<{ overridden?: unknown }>(BASE)
    .then(({ data }) => (Array.isArray(data?.overridden) ? data.overridden.filter((x): x is string => typeof x === 'string') : []));

/** Clears the custom HTML override on overridden core templates (keeping enabled state and subject). */
export const resetEmailOverrides = (): Promise<string[]> =>
  axiosInstance
    .post<{ reset?: unknown }>(`${BASE}/reset`)
    .then(({ data }) => (Array.isArray(data?.reset) ? data.reset.filter((x): x is string => typeof x === 'string') : []));
