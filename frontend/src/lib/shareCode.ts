// Share codes: a theme's look packed into one pasteable string (`mint1.` + base64url of deflated JSON).
// A decoded code is untrusted input: callers lay it over the draft with `normalizeTheme({ ...draft, ...look }, draft)`,
// and normalizeTheme stays the security boundary. Decoding only bounds the work (input and inflated size) and
// keeps the look fields; it never checks a value.
import { normalizeTheme } from './normalize.ts';
import { DEFAULT_THEME, type NebulaTheme, pickUserTheme } from './theme.ts';

export const SHARE_PREFIX = 'mint1.';
/** The editor's hash for a share link: `<panel>/admin/mint#mint-share=<code>` opens the code in the paste modal. */
export const SHARE_HASH = 'mint-share=';
/** Pasted text longer than this is refused before any decoding. */
export const MAX_SHARE_INPUT = 16 * 1024;
/** The inflated JSON may not exceed this; reading stops as soon as it does. */
export const MAX_SHARE_JSON = 64 * 1024;

// anywhere in the text, so a pasted link (`…/admin/mint#mint-share=mint1.…`) or a sentence holding a code works
const CODE = /mint1\.([A-Za-z0-9_-]+)/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** The inflated text, or null when the data is broken or inflates past `MAX_SHARE_JSON`. */
async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<string | null> {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SHARE_JSON) {
        reader.cancel().catch(() => {
          // the stream is dropped either way
        });
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    all.set(chunk, at);
    at += chunk.byteLength;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(all);
  } catch {
    return null;
  }
}

/** The theme's look as a share code; only fields that differ from the default look are kept. */
export async function encodeShareCode(theme: Partial<NebulaTheme>): Promise<string> {
  const look = pickUserTheme(normalizeTheme(theme)) as Record<string, unknown>;
  const base = pickUserTheme(DEFAULT_THEME) as Record<string, unknown>;
  const diff: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(look)) {
    if (JSON.stringify(value) !== JSON.stringify(base[key])) diff[key] = value;
  }
  const deflated = new Blob([JSON.stringify(diff)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(deflated).arrayBuffer());
  return SHARE_PREFIX + toBase64Url(bytes);
}

/**
 * The full look a share code (found anywhere in `text`) carries, absent fields being the default's, or null.
 * The values are unchecked: lay the result over the draft with `normalizeTheme({ ...draft, ...look }, draft)`.
 */
export async function decodeShareCode(text: string): Promise<Partial<NebulaTheme> | null> {
  if (text.length > MAX_SHARE_INPUT) return null;
  const match = CODE.exec(text);
  if (!match) return null;
  const bytes = fromBase64Url(match[1]);
  if (!bytes) return null;
  const json = await inflate(bytes);
  if (json === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return { ...pickUserTheme(DEFAULT_THEME), ...pickUserTheme(parsed) };
}
