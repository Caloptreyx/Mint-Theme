import { DEFAULT_THEME, type NebulaTheme, SAFE_URL } from './theme.ts';

// Checks the editor runs on the raw draft, before normalizeTheme() would silently drop a value.

/** '' (unset) or a URL normalizeTheme() keeps. */
export const urlValid = (value: string): boolean => value === '' || SAFE_URL.test(value);

/** Every URL in the draft that normalizeTheme() would refuse. */
export function invalidUrls(theme: NebulaTheme): string[] {
  const urls = [
    theme.backgroundImage,
    theme.homeBanner,
    theme.loginBackground,
    theme.loginLogo,
    theme.favicon,
    ...theme.articles.map((article) => article.url),
    ...theme.supportLinks.map((link) => link.url),
    ...Object.values(theme.eggs).flatMap((egg) => [egg.banner, egg.icon]),
  ];
  return urls.filter((value) => !urlValid(value));
}

/** A parsed import that looks like an exported theme: an object with at least one theme field. */
export const isThemeFile = (parsed: unknown): parsed is Record<string, unknown> =>
  !!parsed &&
  typeof parsed === 'object' &&
  !Array.isArray(parsed) &&
  Object.keys(DEFAULT_THEME).some((key) => Object.hasOwn(parsed, key));

const hex2 = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');

const channel = (raw: string) => (raw.endsWith('%') ? (Number.parseFloat(raw) * 255) / 100 : Number.parseFloat(raw));

/**
 * A complete colour in any form Mantine's ColorInput accepts (`#fff`, `fff`, `#rrggbb`, `rrggbb`, `#rrggbbaa`,
 * `rgb()`/`rgba()`, `hsl()`/`hsla()`) as the `#rrggbb` the theme stores; alpha is dropped. null while it is
 * incomplete or not a colour.
 */
export function toHexColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (hex) {
    const digits = hex[1];
    const full = digits.length <= 4 ? [...digits.slice(0, 3)].map((c) => c + c).join('') : digits.slice(0, 6);
    return `#${full}`;
  }

  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/.exec(v);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const nums = parts.slice(0, 3).map((part) => Number.parseFloat(part));
  if (nums.some((n) => !Number.isFinite(n))) return null;

  if (fn[1].startsWith('rgb')) return `#${parts.slice(0, 3).map(channel).map(hex2).join('')}`;

  const h = (((nums[0] % 360) + 360) % 360) / 360;
  const s = Math.min(100, Math.max(0, nums[1])) / 100;
  const l = Math.min(100, Math.max(0, nums[2])) / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return `#${[hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((c) => hex2(c * 255)).join('')}`;
}
