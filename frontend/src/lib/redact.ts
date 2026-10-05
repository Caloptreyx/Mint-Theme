import { z } from 'zod';
import { useUserSetting } from './core.ts';

/**
 * Core's "Hide server addresses" user setting. Core's own helper (`@/plugins/privacy/useRedactAddresses.ts`)
 * only exists from 1.2.3 on, so the setting is read directly; on older panels it is never set and nothing is masked.
 */
const REDACT_ADDRESSES_KEY = 'app::redact_addresses';

const ALWAYS_VISIBLE: Record<string, true> = {
  '::': true,
  '::1': true,
  '127.0.0.1': true,
  '0.0.0.0': true,
  localhost: true,
};

function isSensitive(host: string): boolean {
  const address = host
    .trim()
    .replace(/^\[|\]$/g, '')
    .toLowerCase();
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return address !== '' && ALWAYS_VISIBLE[mapped ? mapped[1] : address] !== true;
}

function splitPort(value: string): [string, string] {
  const bracketed = value.match(/^(\[[^\]]+\])(:\d+)$/);
  if (bracketed) return [bracketed[1], bracketed[2]];
  // a bare IPv6 address has several colons and no port
  if ((value.match(/:/g) ?? []).length > 1) return [value, ''];
  const ported = value.match(/^(.+)(:\d+)$/);
  if (ported) return [ported[1], ported[2]];
  return [value, ''];
}

/** Masks the host of `host`, `host:port` or `[v6]:port` with asterisks, keeping the port, as core does. */
export function maskAddress(value: string | null | undefined): string {
  if (!value) return '';
  const [host, port] = splitPort(value);
  return isSensitive(host) ? `${'*'.repeat([...host].length)}${port}` : value;
}

/** Whether the user asked core to hide server addresses. */
export function useRedactAddresses(): boolean {
  const [redact] = useUserSetting(REDACT_ADDRESSES_KEY, z.boolean(), false);
  return redact;
}

/** The address as it should be displayed; copy actions keep the raw value. */
export const shownAddress = (value: string | null | undefined, redact: boolean): string =>
  redact ? maskAddress(value) : (value ?? '');
