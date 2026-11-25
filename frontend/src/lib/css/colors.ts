import type { ButtonStyle, Font, MonoFont, NebulaTheme } from '../theme.ts';
// The colour variables of both schemes, light mode's repaints, the button styles and the background images.
import { accentShades, alpha, lightBase, mix, readable, surfaceShades } from '../color.ts';

const FONT_STACKS: Partial<Record<Font, string>> = {
  exo: "'Exo 2', Helvetica, Arial, sans-serif",
  montserrat: "'Montserrat', Helvetica, Arial, sans-serif",
  outfit: "'Outfit', Helvetica, Arial, sans-serif",
  jakarta: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif",
  space: "'Space Grotesk', Helvetica, Arial, sans-serif",
};

/** `--button-bg` is the per-colour value Mantine sets inline, so each colour keeps its own shade. */
const BUTTON = 'html:root .mantine-Button-root[data-variant="filled"]:not([data-disabled]):not(:disabled)';
const INK = 'var(--nebula-button-ink)';

const BUTTON_CSS: Record<ButtonStyle, string> = {
  filled: '',
  tinted: `${BUTTON}{background-color:color-mix(in srgb,var(--button-bg) 22%,transparent)!important;border:1px solid color-mix(in srgb,var(--button-bg) 62%,transparent)!important;color:color-mix(in srgb,var(--button-bg) 55%,${INK})!important;}
${BUTTON}:hover{background-color:color-mix(in srgb,var(--button-bg) 34%,transparent)!important;}`,
  outline: `${BUTTON}{background-color:transparent!important;border:1px solid color-mix(in srgb,var(--button-bg) 70%,transparent)!important;color:color-mix(in srgb,var(--button-bg) 55%,${INK})!important;}
${BUTTON}:hover{background-color:color-mix(in srgb,var(--button-bg) 18%,transparent)!important;}`,
  glass: `${BUTTON}{background-color:color-mix(in srgb,var(--button-bg) 28%,transparent)!important;border:1px solid color-mix(in srgb,${INK} 22%,transparent)!important;color:color-mix(in srgb,var(--button-bg) 70%,${INK})!important;backdrop-filter:blur(10px);box-shadow:inset 0 1px 0 color-mix(in srgb,${INK} 12%,transparent);}
${BUTTON}:hover{background-color:color-mix(in srgb,var(--button-bg) 40%,transparent)!important;}`,
};

/** Also read by the console terminal, which takes its font from xterm's options, not the CSS variables. */
export const MONO_FONT_STACKS: Partial<Record<MonoFont, string>> = {
  jetbrains: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
  fira: "'Fira Code', ui-monospace, Menlo, Consolas, monospace",
};

/**
 * A background image under a veil of the page colour of whichever scheme is showing, `dim` percent opaque.
 * `image` must have passed SAFE_URL in normalizeTheme, so it cannot close the url("...").
 */
export function dimmedImage(image: string, dim: number): string {
  const veil = `color-mix(in srgb,var(--mantine-color-body) ${dim}%,transparent)`;
  return `linear-gradient(${veil},${veil}),url("${image}")`;
}

export function colorCss(t: NebulaTheme): string[] {
  const blue = accentShades(t.accent);
  const dark = surfaceShades(t);
  const vars = (entries: [string, string][]) => entries.map(([k, v]) => `${k}:${v};`).join('');
  const scale = (name: string, shades: string[]) =>
    shades.map((v, i) => [`--mantine-color-${name}-${i}`, v] as [string, string]);

  const shared: [string, string][] = [
    ...scale('blue', blue),
    ...scale('dark', dark),
    ['--nebula-highlight', t.highlight],
    ['--mantine-radius-xs', `${Math.round(t.elementRadius * 0.6)}px`],
    ['--mantine-radius-sm', `${t.elementRadius}px`],
    ['--mantine-radius-default', `${t.elementRadius}px`],
    ['--mantine-radius-md', `${t.radius}px`],
    ['--mantine-radius-lg', `${t.radius + 4}px`],
  ];
  const stack = FONT_STACKS[t.font];
  if (stack) {
    shared.push(['--mantine-font-family', stack], ['--mantine-font-family-headings', stack], ['--font-sans', stack]);
  }
  const mono = MONO_FONT_STACKS[t.monoFont];
  if (mono) {
    shared.push(['--mantine-font-family-monospace', mono], ['--font-mono', mono]);
  }

  // translucent blocks: `--nebula-card` is the colour Mantine paints cards in both schemes
  const blockAlpha = t.blockOpacity / 100;
  const darkScheme: [string, string][] = [
    ['--nebula-card', t.blockOpacity < 100 ? alpha(dark[6], blockAlpha) : dark[6]],
    ['--nebula-button-ink', '#ffffff'],
    ['--mantine-color-body', dark[7]],
    ['--mantine-color-text', dark[0]],
    ['--mantine-color-dimmed', t.textMuted || dark[2]],
    ['--mantine-color-placeholder', t.textFaint || dark[3]],
    ['--mantine-color-default', t.surfaceRaised || mix(t.text, t.background, 0.05)],
    ['--mantine-color-default-hover', t.surfaceOverlay || mix(t.text, t.background, 0.1)],
    ['--mantine-color-default-border', t.line || dark[4]],
    ['--mantine-color-anchor', blue[4]],
    ['--mantine-color-blue-filled', blue[6]],
    ['--mantine-color-blue-filled-hover', blue[5]],
    ['--mantine-color-blue-light', alpha(t.accent, 0.2)],
    ['--mantine-color-blue-light-hover', alpha(t.accent, 0.28)],
    ['--mantine-color-blue-light-color', blue[3]],
    ['--mantine-color-blue-outline', blue[4]],
    ['--mantine-color-blue-outline-hover', alpha(blue[4], 0.08)],
    ['--mantine-color-blue-text', blue[4]],
    ['--chart-series-1', t.chartOne || blue[4]],
  ];
  // app.css falls back to `--mantine-color-dark-4`, so an unset colour emits nothing
  if (t.scrollbar) darkScheme.push(['--nebula-scrollbar', t.scrollbar]);

  // light mode gets its own neutrals; the dark-only overrides above are picked against a dark page
  const light = lightBase(t);
  // Mantine's light styles draw hovers, fills, borders and tooltips from `gray`, as dark mode does from `dark`
  const gray = [0.03, 0.06, 0.09, 0.13, 0.19, 0.33, 0.5, 0.7, 0.8, 0.88].map((w) => mix(light.text, light.surface, w));
  const accentInk = readable(t.accent, light.text, light.surface);
  const lightScheme: [string, string][] = [
    ...scale('gray', gray),
    ['--nebula-card', t.blockOpacity < 100 ? alpha(light.surface, blockAlpha) : light.surface],
    ['--nebula-button-ink', light.text],
    ['--nebula-highlight', readable(t.highlight, light.text, light.surface, 3)],
    // cards, menus, inputs and dropdowns are painted `white` in light mode, their text `black`
    ['--mantine-color-white', light.surface],
    ['--mantine-color-black', light.text],
    ['--mantine-color-bright', light.text],
    ['--mantine-color-body', light.background],
    ['--mantine-color-text', light.text],
    ['--mantine-color-dimmed', mix(light.text, light.surface, 0.62)],
    ['--mantine-color-placeholder', gray[5]],
    ['--mantine-color-default', light.surface],
    ['--mantine-color-default-hover', gray[0]],
    ['--mantine-color-default-color', light.text],
    ['--mantine-color-default-border', gray[4]],
    ['--mantine-color-anchor', accentInk],
    ['--mantine-color-blue-filled', blue[6]],
    ['--mantine-color-blue-filled-hover', blue[7]],
    ['--mantine-color-blue-light', alpha(t.accent, 0.1)],
    ['--mantine-color-blue-light-hover', alpha(t.accent, 0.14)],
    ['--mantine-color-blue-light-color', accentInk],
    ['--mantine-color-blue-outline', blue[6]],
    ['--mantine-color-blue-outline-hover', alpha(t.accent, 0.05)],
    ['--mantine-color-blue-text', accentInk],
    ['--chart-series-1', t.chartOne || blue[6]],
    // core's chart axis labels are a fixed grey there
    ['--chart-tick-color', 'var(--mantine-color-dimmed)'],
  ];
  // core and Mantine pin `--mantine-primary-color-contrast` per scheme (`:root[data-mantine-color-scheme]`), so a
  // set colour goes in both scheme blocks; empty keeps theirs, `--mantine-color-white`
  if (t.textOnAccent) {
    darkScheme.push(['--mantine-primary-color-contrast', t.textOnAccent]);
    lightScheme.push(['--mantine-primary-color-contrast', t.textOnAccent]);
  }

  // status colours repaint the whole Mantine palette they belong to, plus the server state dots. The 0-9 scales
  // beat Mantine's `:root` from plain html:root; the variants go in the scheme blocks, because core and Mantine pin
  // them on `:root[data-mantine-color-scheme]`, which plain html:root loses to
  const darkVariants = (name: string, value: string, shades: string[]): [string, string][] => [
    [`--mantine-color-${name}-filled`, shades[6]],
    [`--mantine-color-${name}-filled-hover`, shades[5]],
    [`--mantine-color-${name}-light`, alpha(value, 0.2)],
    [`--mantine-color-${name}-light-hover`, alpha(value, 0.28)],
    [`--mantine-color-${name}-light-color`, shades[3]],
    [`--mantine-color-${name}-outline`, shades[4]],
    [`--mantine-color-${name}-outline-hover`, alpha(shades[4], 0.08)],
    [`--mantine-color-${name}-text`, shades[4]],
  ];
  // light mode's tint text is pulled toward the ink until it reads on the surface
  const lightVariants = (name: string, value: string, shades: string[], tint: [number, number]): [string, string][] => {
    const ink = readable(value, light.text, light.surface);
    return [
      [`--mantine-color-${name}-filled`, shades[6]],
      [`--mantine-color-${name}-filled-hover`, shades[7]],
      [`--mantine-color-${name}-light`, alpha(value, tint[0])],
      [`--mantine-color-${name}-light-hover`, alpha(value, tint[1])],
      [`--mantine-color-${name}-light-color`, ink],
      [`--mantine-color-${name}-outline`, shades[6]],
      [`--mantine-color-${name}-outline-hover`, alpha(value, 0.05)],
      [`--mantine-color-${name}-text`, ink],
    ];
  };
  const status: [string, string, string][] = [
    [t.success, 'green', 'running'],
    [t.warning, 'yellow', 'starting'],
    [t.danger, 'red', 'offline'],
  ];
  for (const [value, name] of status) {
    if (!value) continue;
    const shades = accentShades(value);
    shared.push(...scale(name, shades));
    darkScheme.push(...darkVariants(name, value, shades));
    lightScheme.push(...lightVariants(name, value, shades, [0.1, 0.14]));
  }
  if (t.success) shared.push(['--color-server-status-running', t.success]);
  if (t.warning)
    shared.push(['--color-server-status-starting', t.warning], ['--color-server-status-stopping', t.warning]);
  if (t.danger) shared.push(['--color-server-status-offline', t.danger]);
  if (t.offline) {
    const shades = accentShades(t.offline);
    shared.push(...scale('gray', shades));
    darkScheme.push(...darkVariants('gray', t.offline, shades));
    // light mode keeps its neutral gray scale, so gray badges and buttons take the colour directly
    lightScheme.push(...lightVariants('gray', t.offline, shades, [0.12, 0.18]));
  }
  // core pins the chart series per scheme too
  if (t.chartTwo) {
    darkScheme.push(['--chart-series-2', t.chartTwo]);
    lightScheme.push(['--chart-series-2', t.chartTwo]);
  }

  // html:root outranks Mantine's :root rules; the scheme blocks also outrank the `:root[data-mantine-color-scheme]`
  // ones of core's app.css and Mantine
  const css = [
    `html:root{${vars(shared)}}`,
    `html:root[data-mantine-color-scheme="dark"]{${vars(darkScheme)}}`,
    `html:root[data-mantine-color-scheme="light"]{${vars(lightScheme)}}`,
  ];

  // when the admin allows Calagopus 1.2.11+'s Pure Black dark variant, pair its OLED palette with Mint's card and
  // default surface tokens (respecting blockOpacity); left off, emit nothing so existing output stays unchanged
  if (t.allowPureBlack) {
    const pureBlack: [string, string][] = [
      ['--nebula-card', t.blockOpacity < 100 ? alpha('#0a0a0a', blockAlpha) : '#0a0a0a'],
      ['--mantine-color-body', '#000000'],
      ['--mantine-color-dark-4', '#2a2a2a'],
      ['--mantine-color-dark-5', '#1f1f1f'],
      ['--mantine-color-dark-6', '#141414'],
      ['--mantine-color-dark-7', '#000000'],
      ['--mantine-color-dark-8', '#000000'],
      ['--mantine-color-dark-9', '#000000'],
      ['--mantine-color-dark-light', 'rgba(255,255,255,0.06)'],
      ['--mantine-color-dark-light-hover', 'rgba(255,255,255,0.1)'],
      ['--mantine-color-default', '#141414'],
      ['--mantine-color-default-hover', '#1f1f1f'],
      ['--mantine-color-default-border', '#2a2a2a'],
    ];
    css.push(`html:root[data-mantine-color-scheme="dark"][data-theme-variant="pure-black"]{${vars(pureBlack)}}`);
  }

  // light mode repaints what core hardcodes for a white page. xterm paints its viewport in the terminal theme's
  // background, inline, and core's light one is `#ffffff` (its xterm.css only clears the other layers); the
  // Tailwind greys on auth subtitles, links and hints are `!` utilities, which live in a layer and so beat any
  // unlayered `!important`, hence the variable they read is redefined on the element instead
  const LIGHT = 'html:root[data-mantine-color-scheme="light"]';
  const GREYS = ['neutral-400', 'gray-400', 'gray-500', 'gray-600'];
  const greyClasses = GREYS.flatMap((g) => [`text-${g}`, `text-${g}!`, `light:text-${g}!`]).map(
    (c) => `[class~="${c}"]`,
  );
  css.push(
    `${LIGHT} .xterm .xterm-scrollable-element{background-color:transparent!important;}`,
    `${LIGHT} .xterm .xterm-rows{color:var(--mantine-color-text);}`,
    `${LIGHT} :is(${greyClasses.join(',')}){${GREYS.map((g) => `--color-${g}:var(--mantine-color-dimmed);`).join('')}}`,
  );

  if (BUTTON_CSS[t.buttonStyle]) css.push(BUTTON_CSS[t.buttonStyle]);

  if (t.buttonText) {
    css.push(
      `html:root .mantine-Button-root[data-variant="filled"]:not([data-disabled]):not(:disabled){color:${t.buttonText}!important;}`,
    );
  }

  // Mantine gives accent filled buttons, action icons and badges `--mantine-color-white` text through an inline
  // variable next to the inline fill, so the text is swapped where that fill is the accent; a badge with no colour
  // or variant has no inline style and is the accent by default. On buttons the other styles and `buttonText`
  // set `color` itself and still win.
  if (t.textOnAccent) {
    const on = `${t.textOnAccent}!important`;
    const accent = (fill: string) => `[style*="${fill}: var(--mantine-color-blue-filled);"]`;
    css.push(
      `html:root .mantine-Button-root${accent('--button-bg')}{--button-color:${on};}`,
      `html:root .mantine-ActionIcon-root${accent('--ai-bg')}{--ai-color:${on};}`,
      `html:root .mantine-Badge-root:is(${accent('--badge-bg')},:not([style*="--badge-bg"])){--badge-color:${on};}`,
    );
  }

  if (t.buttonColor) {
    // Redefining the accent vars ON the button makes its own inline `var(--mantine-color-blue-*)`
    // reference resolve to these, so red and green buttons keep their own colours.
    const shades = accentShades(t.buttonColor);
    css.push(
      `html:root .mantine-Button-root,html:root .mantine-ActionIcon-root{${vars([
        ['--mantine-color-blue-filled', shades[6]],
        ['--mantine-color-blue-filled-hover', shades[5]],
        ['--mantine-color-blue-light', alpha(t.buttonColor, 0.2)],
        ['--mantine-color-blue-light-hover', alpha(t.buttonColor, 0.28)],
        ['--mantine-color-blue-light-color', shades[3]],
        ['--mantine-color-blue-outline', shades[4]],
        ['--mantine-color-blue-outline-hover', alpha(shades[4], 0.08)],
      ])}}`,
      `html:root[data-mantine-color-scheme="light"] .mantine-Button-root,html:root[data-mantine-color-scheme="light"] .mantine-ActionIcon-root{${vars(
        [
          ['--mantine-color-blue-filled-hover', shades[7]],
          ['--mantine-color-blue-light', alpha(t.buttonColor, 0.1)],
          ['--mantine-color-blue-light-hover', alpha(t.buttonColor, 0.14)],
          ['--mantine-color-blue-light-color', readable(t.buttonColor, light.text, light.surface)],
          ['--mantine-color-blue-outline', shades[6]],
          ['--mantine-color-blue-outline-hover', alpha(t.buttonColor, 0.05)],
        ],
      )}}`,
    );
  }

  // painted in both schemes; the dim is the page colour of whichever one is showing
  if (t.backgroundImage) css.push(`html:root{background-image:${dimmedImage(t.backgroundImage, t.backgroundDim)};}`);

  // `nebula-auth` sits on html only while an auth page is mounted (elements/auth/AuthScope.tsx)
  if (t.loginBackground) {
    css.push(`html:root.nebula-auth{background-image:${dimmedImage(t.loginBackground, t.loginDim)};}`);
  }

  return css;
}
