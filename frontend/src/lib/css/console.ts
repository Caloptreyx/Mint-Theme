// The console terminal's look; the other console options are classes on the console page.
import { alpha, lightBase, readable } from '../color.ts';
import { type NebulaTheme, TERMINAL_COLOR_COUNT, type TerminalCursor } from '../theme.ts';

// the shown cursor in each shape: its declarations, and what its blink turns off for half a second
const CURSOR_PAINT: Record<Exclude<TerminalCursor, 'none'>, { on: string[]; off: string }> = {
  block: {
    on: ['background-color:var(--mantine-color-text)', 'color:var(--mantine-color-body)'],
    off: 'background-color:transparent;color:inherit;',
  },
  bar: { on: ['box-shadow:2px 0 0 var(--mantine-color-text) inset'], off: 'box-shadow:none;' },
  underline: { on: ['border-bottom-color:var(--mantine-color-text)'], off: 'border-bottom-color:transparent;' },
};

/**
 * The console terminal's cursor once `terminalCursor` shows it (lib/terminal.ts marks core's terminals with
 * `nebula-terminal`). Core's xterm theme paints the cursor transparent and is reset on every scheme change, so its
 * colour is CSS: xterm 6 draws it as classes on a row span, its unblinking block with `!important`. Blinking needs
 * keyframes of our own (xterm's animate the transparent colour) and stops under reduced motion.
 */
export function terminalCursorCss(t: NebulaTheme): string[] {
  if (t.terminalCursor === 'none') return [];
  const CURSOR = `html:root .xterm.nebula-terminal .xterm-rows .xterm-cursor.xterm-cursor-${t.terminalCursor}`;
  const { on, off } = CURSOR_PAINT[t.terminalCursor];
  const css = [`${CURSOR}:not(.xterm-cursor-blink){${on.map((rule) => `${rule}!important;`).join('')}}`];
  if (t.terminalCursorBlink && !t.reduceMotion) {
    css.push(
      `@keyframes nebula-cursor-blink{50%{${off}}}`,
      `${CURSOR}.xterm-cursor-blink{${on.map((rule) => `${rule};`).join('')}animation:nebula-cursor-blink 1s step-end infinite;}`,
      `@media (prefers-reduced-motion:reduce){${CURSOR}.xterm-cursor-blink{animation:none;}}`,
    );
  }
  return css;
}

const TERMINAL = '.xterm.nebula-terminal';

/**
 * The ANSI palette once `terminalColors` has all 16. xterm 6's DOM renderer paints a cell in palette colour N with the
 * class `xterm-fg-N` or `xterm-bg-N` (after swapping them for inverse, and with N + 8 for bold text while
 * `drawBoldTextInBrightColors` is on, xterm's default), plus `xterm-dim` at half opacity, from rules it injects as
 * `.xterm-dom-renderer-owner-<n> .xterm-fg-N` (two classes, three with dim); these outrank them without
 * `!important`, so the shown cursor (`terminalCursorCss`) still wins. Core resets its xterm theme on every scheme
 * change, so both schemes are painted here: dark as given, light (a transparent terminal over the card) with the text
 * colours pulled readable on the light surface; backgrounds stay as given.
 */
export function terminalColorsCss(t: NebulaTheme): string[] {
  if (t.terminalColors.length !== TERMINAL_COLOR_COUNT) return [];
  const light = lightBase(t);
  const fg = (scheme: string, colors: string[]) =>
    colors
      .map(
        (c, i) =>
          `${scheme} ${TERMINAL} .xterm-fg-${i}{color:${c};}` +
          `${scheme} ${TERMINAL} .xterm-fg-${i}.xterm-dim{color:${alpha(c, 0.5)};}`,
      )
      .join('');
  return [
    t.terminalColors.map((c, i) => `html:root ${TERMINAL} .xterm-bg-${i}{background-color:${c};}`).join(''),
    fg('html:root[data-mantine-color-scheme="dark"]', t.terminalColors),
    fg(
      'html:root[data-mantine-color-scheme="light"]',
      t.terminalColors.map((c) => readable(c, light.text, light.surface)),
    ),
  ];
}
