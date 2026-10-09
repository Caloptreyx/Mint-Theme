import { FitAddon } from '@xterm/addon-fit';
import type { ITerminalInitOnlyOptions, ITerminalOptions, Terminal } from '@xterm/xterm';
import { currentTheme, subscribeTheme } from './apply.ts';
import { MONO_FONT_STACKS, type NebulaTheme } from './theme.ts';

// 'a' is in the latin file and 'Ā' in latin-ext, so both subsets are fetched before xterm draws with them
const SAMPLE = 'aĀ';
// DECTCEM: core hides the cursor right after the after open handlers and strips both from the output
const SHOW_CURSOR = '\x1b[?25h';
const HIDE_CURSOR = '\x1b[?25l';
// xterm draws no cursor until it counts as initialised (a focus, a key, a screen switch); leaving the alternate
// screen while on the normal one switches nothing and only sets that flag, so the cursor shows unfocused too
const INIT_CURSOR = '\x1b[?47l';

let panelFont: string | undefined;
const unsubscribes = new Map<Terminal, () => void>();
const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

/** The cursor and line height options a theme asks for; xterm draws the unfocused cursor in the same shape. */
function cursorOptions(theme: NebulaTheme) {
  const style = theme.terminalCursor === 'none' ? 'block' : theme.terminalCursor;
  return {
    cursorStyle: style,
    cursorInactiveStyle: theme.terminalCursor === 'none' ? ('outline' as const) : style,
    cursorBlink:
      theme.terminalCursor !== 'none' && theme.terminalCursorBlink && !theme.reduceMotion && !reducedMotion?.matches,
    lineHeight: theme.terminalLineHeight,
  };
}

/**
 * xterm styles its rows with the `fontFamily` option and sizes its cells from it, so the CSS never reaches it.
 * The cursor and line height are options too, set before xterm measures its cells.
 */
export function initTerminal(options: ITerminalOptions & ITerminalInitOnlyOptions) {
  const theme = currentTheme();
  panelFont = options.fontFamily;
  const family = MONO_FONT_STACKS[theme.monoFont];
  // xterm measures its cells on open; a font that is still loading would leave the grid sized for the fallback
  if (family && document.fonts.check(`${options.fontSize ?? 14}px ${family}`, SAMPLE)) {
    options.fontFamily = family;
  }
  Object.assign(options, cursorOptions(theme));
}

/**
 * Switches to the picked font once it has loaded (changing the option makes xterm remeasure its cells), shows
 * or hides the cursor, and keeps following the theme, so editor previews and a late theme fetch reach an open
 * terminal. The `nebula-terminal` class scopes buildCss's cursor colour to core's console terminals.
 */
export function attachTerminal(term: Terminal) {
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.element?.classList.add('nebula-terminal');

  let wanted = term.options.fontFamily;
  // core writes its hide after this handler returns, so the first answer goes out after it
  let cursorShown = false;
  let opened = false;

  const syncFont = () => {
    const family = MONO_FONT_STACKS[currentTheme().monoFont] ?? panelFont;
    if (!family || family === wanted) return;
    wanted = family;
    void document.fonts
      .load(`${term.options.fontSize ?? 14}px ${family}`, SAMPLE)
      .catch(() => undefined)
      .then(() => {
        if (!unsubscribes.has(term) || wanted !== family) return;
        term.options.fontFamily = family;
        fit.fit();
      });
  };

  const syncCursor = () => {
    if (!unsubscribes.has(term)) return;
    const theme = currentTheme();
    const { lineHeight, ...cursor } = cursorOptions(theme);
    term.options.cursorStyle = cursor.cursorStyle;
    term.options.cursorInactiveStyle = cursor.cursorInactiveStyle;
    term.options.cursorBlink = cursor.cursorBlink;
    if (term.options.lineHeight !== lineHeight) {
      term.options.lineHeight = lineHeight;
      fit.fit();
    }

    const show = theme.terminalCursor !== 'none';
    if (!opened || show === cursorShown) return;
    cursorShown = show;
    term.write(show ? `${INIT_CURSOR}${SHOW_CURSOR}` : HIDE_CURSOR);
  };

  const sync = () => {
    syncFont();
    syncCursor();
  };

  reducedMotion?.addEventListener('change', syncCursor);
  const unsubscribe = subscribeTheme(sync);
  unsubscribes.set(term, () => {
    unsubscribe();
    reducedMotion?.removeEventListener('change', syncCursor);
  });
  sync();

  queueMicrotask(() => {
    opened = true;
    syncCursor();
  });
}

export function detachTerminal(term: Terminal) {
  unsubscribes.get(term)?.();
  unsubscribes.delete(term);
}
