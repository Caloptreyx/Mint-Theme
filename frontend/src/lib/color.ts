// Colour maths shared by the stylesheet, the contrast checks and the editor's derived colours.
import type { NebulaTheme } from './theme.ts';

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (rgb: Rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** `weight` is how much of `a` ends up in the result. */
export function mix(a: string, b: string, weight: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] * weight + y[i] * (1 - weight)) as Rgb);
}

export const alpha = (hex: string, a: number) => `rgba(${toRgb(hex).join(', ')}, ${a})`;

export const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** `c` pulled toward `ink` just far enough to read on `paper`, so bright accents stay legible in light mode. */
export const readable = (c: string, ink: string, paper: string, ratio = 4.5) =>
  [1, 0.84, 0.7, 0.56, 0.42, 0.28].map((w) => mix(c, ink, w)).find((v) => contrastRatio(v, paper) >= ratio) ?? ink;

/** Mantine-style 10 shade scale with the picked colour at index 6. */
export function accentShades(accent: string): string[] {
  return [
    ...[0.1, 0.22, 0.4, 0.58, 0.76, 0.9].map((w) => mix(accent, '#ffffff', w)),
    accent,
    ...[0.84, 0.7, 0.56].map((w) => mix(accent, '#000000', w)),
  ];
}

/** Mantine's dark scale: 0 is text, 4 borders, 6 cards, 7 the page. */
export function surfaceShades(t: NebulaTheme): string[] {
  const { text, background, surface } = t;
  return [
    text,
    mix(text, background, 0.8),
    mix(text, background, 0.58),
    mix(text, background, 0.4),
    mix(text, background, 0.14),
    mix(text, background, 0.08),
    surface,
    background,
    mix(background, '#000000', 0.75),
    mix(background, '#000000', 0.55),
  ];
}

/** Light mode's base colours: the dark page becomes the ink, the surfaces near white with a hint of accent. */
export function lightBase(t: NebulaTheme) {
  const text = t.lightText || (luminance(t.background) < 0.05 ? t.background : mix(t.accent, '#000000', 0.15));
  return {
    background: t.lightBackground || mix(t.accent, mix(text, '#ffffff', 0.05), 0.06),
    surface: t.lightSurface || mix(t.accent, '#ffffff', 0.025),
    text,
  };
}

/** The colour each optional field falls back to, so the editor can show what is really painted. */
export function derivedColors(t: NebulaTheme) {
  const blue = accentShades(t.accent);
  const dark = surfaceShades(t);
  const light = lightBase(t);

  return {
    surfaceRaised: mix(t.text, t.background, 0.05),
    surfaceOverlay: mix(t.text, t.background, 0.1),
    textMuted: dark[2],
    textFaint: dark[3],
    // core and Mantine pin it to `--mantine-color-white`, which light mode paints as its surface
    textOnAccent: '#ffffff',
    line: dark[4],
    // app.css paints the page's dark scrollbar in dark-4, so the derived colour is the same as the hairline's
    scrollbar: dark[4],
    buttonColor: t.accent,
    buttonText: t.textOnAccent || '#ffffff',
    success: '#40c057',
    warning: '#fab005',
    danger: '#fa5252',
    offline: '#868e96',
    chartOne: blue[4],
    chartTwo: '#facc15',
    lightBackground: light.background,
    lightSurface: light.surface,
    lightText: light.text,
  };
}
