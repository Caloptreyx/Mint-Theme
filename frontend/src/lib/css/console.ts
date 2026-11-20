// The console terminal's look; the other console options are classes on the console page.
import type { NebulaTheme, TerminalCursor } from '../theme.ts';

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
