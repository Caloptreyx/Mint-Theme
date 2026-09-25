import { FitAddon } from '@xterm/addon-fit';
import type { ITerminalInitOnlyOptions, ITerminalOptions, Terminal } from '@xterm/xterm';
import { currentTheme, subscribeTheme } from './apply.ts';
import { MONO_FONT_STACKS } from './theme.ts';

// 'a' is in the latin file and 'Ā' in latin-ext, so both subsets are fetched before xterm draws with them
const SAMPLE = 'aĀ';

let panelFont: string | undefined;
const unsubscribes = new Map<Terminal, () => void>();

/** xterm draws on a canvas, so the monospace choice has to reach its options instead of the CSS. */
export function initTerminalFont(options: ITerminalOptions & ITerminalInitOnlyOptions) {
  panelFont = options.fontFamily;
  const family = MONO_FONT_STACKS[currentTheme().monoFont];
  // xterm measures its cells on open; a font that is still loading would leave the grid sized for the fallback
  if (family && document.fonts.check(`${options.fontSize ?? 14}px ${family}`, SAMPLE)) {
    options.fontFamily = family;
  }
}

/**
 * Switches to the picked font once it has loaded (changing the option makes xterm remeasure its cells)
 * and keeps following the theme, so editor previews and a late theme fetch reach an open terminal.
 */
export function attachTerminalFont(term: Terminal) {
  const fit = new FitAddon();
  term.loadAddon(fit);

  let wanted = term.options.fontFamily;
  const sync = () => {
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

  unsubscribes.set(term, subscribeTheme(sync));
  sync();
}

export function detachTerminalFont(term: Terminal) {
  unsubscribes.get(term)?.();
  unsubscribes.delete(term);
}
