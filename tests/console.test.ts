// The console page options: normalizeTheme() validation of every field and the CSS buildCss() emits for them.
// Run with `node --test "tests/*.test.ts"`.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { contrastRatio, lightBase } from '../frontend/src/lib/color.ts';
import { buildCss } from '../frontend/src/lib/css/index.ts';
import { normalizeTheme } from '../frontend/src/lib/normalize.ts';
import {
  CHART_ARRANGEMENTS,
  CHART_HEIGHTS,
  CHART_STYLES,
  CONSOLE_BANNERS,
  CONSOLE_WIDGETS,
  CORE_TERMINAL_COLORS,
  DEFAULT_CONSOLE_LAYOUT,
  DEFAULT_THEME,
  MAX_COMMAND_LABEL,
  MAX_COMMAND_LENGTH,
  MAX_CONSOLE_COMMANDS,
  type NebulaTheme,
  TERMINAL_CURSORS,
  TERMINAL_FRAMES,
  TERMINAL_HEIGHTS,
  TERMINAL_LINE_HEIGHT,
  USER_THEME_FIELDS,
} from '../frontend/src/lib/theme.ts';

const CONSOLE_FIELDS = [
  'terminalFrame',
  'terminalHeight',
  'terminalCursor',
  'terminalCursorBlink',
  'terminalLineHeight',
  'consoleBanner',
  'chartStyle',
  'chartHeight',
  'chartArrangement',
  'consoleCommands',
] as const;

const ENUMS = [
  ['terminalFrame', TERMINAL_FRAMES, 'card'],
  ['terminalHeight', TERMINAL_HEIGHTS, 'auto'],
  ['terminalCursor', TERMINAL_CURSORS, 'none'],
  ['consoleBanner', CONSOLE_BANNERS, 'full'],
  ['chartStyle', CHART_STYLES, 'area'],
  ['chartHeight', CHART_HEIGHTS, 'medium'],
  ['chartArrangement', CHART_ARRANGEMENTS, 'row'],
] as const;

/** A theme saved before these fields existed. */
function olderTheme(): Record<string, unknown> {
  const old: Record<string, unknown> = { ...DEFAULT_THEME };
  for (const key of CONSOLE_FIELDS) delete old[key];
  old.consoleLayout = DEFAULT_CONSOLE_LAYOUT;
  return old;
}

describe('console defaults', () => {
  test('the defaults are core\'s console: card, today\'s height, hidden cursor, line height 1.2, full banner', () => {
    assert.equal(DEFAULT_THEME.terminalFrame, 'card');
    assert.equal(DEFAULT_THEME.terminalHeight, 'auto');
    assert.equal(DEFAULT_THEME.terminalCursor, 'none');
    assert.equal(DEFAULT_THEME.terminalCursorBlink, false);
    assert.equal(DEFAULT_THEME.terminalLineHeight, 1.2);
    assert.equal(TERMINAL_LINE_HEIGHT.default, 1.2);
    assert.equal(DEFAULT_THEME.consoleBanner, 'full');
    assert.equal(DEFAULT_THEME.chartStyle, 'area');
    assert.equal(DEFAULT_THEME.chartHeight, 'medium');
    assert.equal(DEFAULT_THEME.chartArrangement, 'row');
    assert.deepEqual(DEFAULT_THEME.consoleCommands, []);
  });

  test('an older saved theme gets the defaults and builds exactly the same css', () => {
    const theme = normalizeTheme(olderTheme());
    for (const key of CONSOLE_FIELDS) assert.deepEqual(theme[key], DEFAULT_THEME[key], key);
    assert.equal(buildCss(theme), buildCss(DEFAULT_THEME));
    assert.ok(!buildCss(theme).includes('nebula-terminal'));
  });

  test('every console field is site wide', () => {
    for (const key of CONSOLE_FIELDS) assert.ok(!USER_THEME_FIELDS.includes(key), key);
  });
});

describe('console enums', () => {
  for (const [key, values, fallback] of ENUMS) {
    test(`${key} keeps its allowed values and falls back otherwise`, () => {
      assert.equal(DEFAULT_THEME[key], fallback);
      for (const value of values) assert.equal(normalizeTheme({ [key]: value })[key], value);
      for (const bad of ['', 'nope', 1, null, true, [values[1]], { value: values[1] }, `${values[1]} `]) {
        assert.equal(normalizeTheme({ [key]: bad })[key], fallback, JSON.stringify(bad));
      }
      const d = normalizeTheme({ [key]: values[1] });
      assert.equal(normalizeTheme({ [key]: 'nope' }, d)[key], values[1]);
    });
  }

  test('the cursor values are the shapes plus none', () => {
    assert.deepEqual([...TERMINAL_CURSORS], ['none', 'block', 'bar', 'underline']);
  });

  test('terminalCursorBlink takes booleans only', () => {
    assert.equal(normalizeTheme({ terminalCursorBlink: true }).terminalCursorBlink, true);
    for (const bad of ['true', 1, null, {}]) {
      assert.equal(normalizeTheme({ terminalCursorBlink: bad }).terminalCursorBlink, false, JSON.stringify(bad));
    }
    const d = normalizeTheme({ terminalCursorBlink: true });
    assert.equal(normalizeTheme({ terminalCursorBlink: 'x' }, d).terminalCursorBlink, true);
  });
});

describe('terminalLineHeight', () => {
  test('is clamped to 1..2 and kept to two decimals', () => {
    assert.equal(normalizeTheme({ terminalLineHeight: 1.5 }).terminalLineHeight, 1.5);
    assert.equal(normalizeTheme({ terminalLineHeight: 0.2 }).terminalLineHeight, 1);
    assert.equal(normalizeTheme({ terminalLineHeight: -4 }).terminalLineHeight, 1);
    assert.equal(normalizeTheme({ terminalLineHeight: 9 }).terminalLineHeight, 2);
    assert.equal(normalizeTheme({ terminalLineHeight: 1.234 }).terminalLineHeight, 1.23);
    assert.equal(normalizeTheme({ terminalLineHeight: 1.999 }).terminalLineHeight, 2);
  });

  test('anything but a finite number is the fallback', () => {
    for (const bad of ['1.5', null, Number.NaN, Number.POSITIVE_INFINITY, [1.5], {}]) {
      assert.equal(normalizeTheme({ terminalLineHeight: bad }).terminalLineHeight, 1.2, String(bad));
    }
    const d = normalizeTheme({ terminalLineHeight: 1.6 });
    assert.equal(normalizeTheme({ terminalLineHeight: 'x' }, d).terminalLineHeight, 1.6);
  });
});

describe('consoleCommands', () => {
  test('keeps label and command, nothing else', () => {
    const commands = normalizeTheme({
      consoleCommands: [{ label: 'Save', command: 'save-all', extra: 'x', icon: 'url(x)' }],
    }).consoleCommands;
    assert.deepEqual(commands, [{ label: 'Save', command: 'save-all' }]);
  });

  test(`keeps at most ${MAX_CONSOLE_COMMANDS} and cuts labels and commands to their limits`, () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ label: `L${i}`, command: `c${i}` }));
    const commands = normalizeTheme({ consoleCommands: many }).consoleCommands;
    assert.equal(commands.length, MAX_CONSOLE_COMMANDS);
    assert.deepEqual(commands.at(-1), { label: 'L7', command: 'c7' });

    const [long] = normalizeTheme({
      consoleCommands: [{ label: 'x'.repeat(100), command: 'y'.repeat(1000) }],
    }).consoleCommands;
    assert.equal(long.label.length, MAX_COMMAND_LABEL);
    assert.equal(long.command.length, MAX_COMMAND_LENGTH);
  });

  test('drops control characters, so a command is one console line, and trims', () => {
    const [entry] = normalizeTheme({
      consoleCommands: [{ label: '  Say\thi ', command: ' say hi\nstop\r\u0000\u007f ' }],
    }).consoleCommands;
    assert.deepEqual(entry, { label: 'Sayhi', command: 'say histop' });
  });

  test('drops buttons missing a label or a command, or with non string parts', () => {
    const commands = normalizeTheme({
      consoleCommands: [
        { label: '', command: 'stop' },
        { label: 'Stop', command: '   ' },
        { label: 'Stop' },
        { label: 1, command: 'stop' },
        { label: 'Stop', command: ['stop'] },
        null,
        'stop',
        { label: 'Ok', command: 'list' },
      ],
    }).consoleCommands;
    assert.deepEqual(commands, [{ label: 'Ok', command: 'list' }]);
  });

  test('anything but an array is the fallback; an empty array clears it', () => {
    const d = normalizeTheme({ consoleCommands: [{ label: 'A', command: 'a' }] });
    for (const bad of ['stop', null, { label: 'A', command: 'a' }, 3]) {
      assert.deepEqual(normalizeTheme({ consoleCommands: bad }, d).consoleCommands, d.consoleCommands);
      assert.deepEqual(normalizeTheme({ consoleCommands: bad }).consoleCommands, []);
    }
    assert.deepEqual(normalizeTheme({ consoleCommands: [] }, d).consoleCommands, []);
  });
});

describe('console widgets', () => {
  test('gauges, commands and connect are widgets, not on the default page', () => {
    for (const id of ['gauges', 'commands', 'connect'] as const) {
      assert.ok(CONSOLE_WIDGETS.includes(id), id);
      for (const slot of ['top', 'left', 'right', 'bottom'] as const) assert.ok(!DEFAULT_CONSOLE_LAYOUT[slot].includes(id));
    }
  });

  test('the layout keeps them where they are placed', () => {
    const layout = normalizeTheme({
      consoleLayout: { top: ['banner', 'gauges'], left: ['connect'], right: ['commands'], bottom: [] },
    }).consoleLayout;
    assert.deepEqual(layout, { top: ['banner', 'gauges'], left: ['connect'], right: ['commands'], bottom: [] });
  });
});

describe('console css', () => {
  const css = buildCss(DEFAULT_THEME);
  const build = (patch: Partial<NebulaTheme>) => buildCss(normalizeTheme({ ...DEFAULT_THEME, ...patch }));

  test('frame, height, banner, charts, line height and commands are classes and options, never global css', () => {
    for (const [key, values] of ENUMS) {
      if (key === 'terminalCursor') continue;
      for (const value of values) assert.equal(build({ [key]: value }), css, `${key}: ${value}`);
    }
    assert.equal(build({ terminalLineHeight: 1.8 }), css);
    assert.equal(build({ consoleCommands: [{ label: 'Save', command: 'save-all' }] }), css);
  });

  test('a hidden cursor emits nothing, blinking or not', () => {
    assert.equal(build({ terminalCursor: 'none', terminalCursorBlink: true }), css);
  });

  for (const cursor of ['block', 'bar', 'underline'] as const) {
    test(`a ${cursor} cursor is painted on core's terminals only, over xterm's transparent colour`, () => {
      const out = build({ terminalCursor: cursor });
      const rule = `html:root .xterm.nebula-terminal .xterm-rows .xterm-cursor.xterm-cursor-${cursor}:not(.xterm-cursor-blink){`;
      assert.ok(out.startsWith(css), 'the default css stays first');
      assert.ok(out.includes(rule), rule);
      const declarations = out.slice(out.indexOf(rule)).split('}')[0];
      assert.ok(declarations.includes('var(--mantine-color-text)') && declarations.includes('!important'));
      assert.ok(!out.includes('@keyframes nebula-cursor-blink'));
      for (const other of ['block', 'bar', 'underline'].filter((c) => c !== cursor)) {
        assert.ok(!out.includes(`.xterm-cursor-${other}`), other);
      }
    });
  }

  test('blinking adds its keyframes, off under reduced motion and with reduceMotion', () => {
    const out = build({ terminalCursor: 'bar', terminalCursorBlink: true });
    assert.ok(out.includes('@keyframes nebula-cursor-blink{50%{box-shadow:none;}}'));
    assert.ok(out.includes('.xterm-cursor-bar.xterm-cursor-blink{box-shadow:2px 0 0 var(--mantine-color-text) inset;'));
    assert.ok(out.includes('animation:nebula-cursor-blink 1s step-end infinite;'));
    assert.match(out, /@media \(prefers-reduced-motion:reduce\)\{[^}]*\.xterm-cursor-blink\{animation:none;\}\}/);

    const still = build({ terminalCursor: 'bar', terminalCursorBlink: true, reduceMotion: true });
    assert.ok(!still.includes('nebula-cursor-blink'));
    assert.ok(still.includes('.xterm-cursor-bar:not(.xterm-cursor-blink){'));
  });
});

describe('terminalColors', () => {
  // prettier-ignore
  const PALETTE = [
    '#101010', '#ff5555', '#50fa7b', '#f1fa8c', '#6272a4', '#ff79c6', '#8be9fd', '#bbbbbb',
    '#555555', '#ff6e6e', '#69ff94', '#ffffa5', '#d6acff', '#ff92df', '#a4ffff', '#ffffff',
  ];
  const build = (patch: Partial<NebulaTheme>) => buildCss(normalizeTheme({ ...DEFAULT_THEME, ...patch }));
  const DARK = 'html:root[data-mantine-color-scheme="dark"] .xterm.nebula-terminal';
  const LIGHT = 'html:root[data-mantine-color-scheme="light"] .xterm.nebula-terminal';
  /** The colour a rule paints, or undefined when the rule is missing. */
  const painted = (css: string, selector: string) => /^[^;}]*:([^;}]*);/.exec(css.split(`${selector}{`)[1] ?? '')?.[1];

  test('defaults to core\'s palette ([]), whose fallback colours are xterm\'s own 16', () => {
    assert.deepEqual(DEFAULT_THEME.terminalColors, []);
    assert.equal(CORE_TERMINAL_COLORS.length, 16);
    assert.equal(CORE_TERMINAL_COLORS[1], '#cc0000');
    assert.equal(CORE_TERMINAL_COLORS[15], '#eeeeec');
  });

  test('16 hex colours are kept in order and lowercased', () => {
    const upper = PALETTE.map((c) => c.toUpperCase());
    assert.deepEqual(normalizeTheme({ terminalColors: upper }).terminalColors, PALETTE);
  });

  test('an invalid entry falls back on its own: to the fallback theme\'s colour there, else core\'s', () => {
    const mixed: unknown[] = [...PALETTE];
    mixed[1] = 'red;}body{display:none}';
    mixed[9] = '#fff';
    mixed[15] = null;
    const out = normalizeTheme({ terminalColors: mixed }).terminalColors;
    assert.deepEqual(
      out,
      PALETTE.map((c, i) => ([1, 9, 15].includes(i) ? CORE_TERMINAL_COLORS[i] : c)),
    );

    const d = normalizeTheme({ terminalColors: PALETTE.map(() => '#123456') });
    const overD = normalizeTheme({ terminalColors: mixed }, d).terminalColors;
    assert.equal(overD[1], '#123456');
    assert.equal(overD[9], '#123456');
    assert.equal(overD[2], PALETTE[2]);
  });

  test('any other length or a non array keeps the fallback; [] goes back to core\'s', () => {
    const d = normalizeTheme({ terminalColors: PALETTE });
    for (const bad of [PALETTE.slice(0, 15), [...PALETTE, '#000000'], 'red', null, { 0: '#000000' }, 16]) {
      assert.deepEqual(normalizeTheme({ terminalColors: bad }, d).terminalColors, PALETTE, JSON.stringify(bad));
      assert.deepEqual(normalizeTheme({ terminalColors: bad }).terminalColors, [], JSON.stringify(bad));
    }
    assert.deepEqual(normalizeTheme({ terminalColors: [] }, d).terminalColors, []);
  });

  test('core\'s palette emits nothing, so core\'s dark and light xterm colours stay', () => {
    assert.equal(build({ terminalColors: [] }), buildCss(DEFAULT_THEME));
    assert.ok(!buildCss(DEFAULT_THEME).includes('.xterm-fg-'));
    assert.equal(build({ terminalColors: PALETTE.slice(0, 15) }), buildCss(DEFAULT_THEME));
  });

  test('a palette paints xterm\'s colour classes on core\'s terminals only, after the rest of the css', () => {
    const css = build({ terminalColors: PALETTE });
    assert.ok(css.startsWith(buildCss(DEFAULT_THEME)));
    for (const [i, c] of PALETTE.entries()) {
      assert.equal(painted(css, `${DARK} .xterm-fg-${i}`), c, `fg ${i}`);
      assert.equal(painted(css, `html:root .xterm.nebula-terminal .xterm-bg-${i}`), c, `bg ${i}`);
    }
    // xterm draws dim text at half opacity of the palette colour, in a rule with one more class
    assert.equal(painted(css, `${DARK} .xterm-fg-1.xterm-dim`), 'rgba(255, 85, 85, 0.5)');
    assert.ok(!css.includes('.xterm-fg-16'));
    // scoped to the terminals lib/terminal.ts marks, never every xterm (core's log viewers), and without
    // !important so the shown cursor's colour still wins on its cell
    const palette = css.slice(buildCss(DEFAULT_THEME).length);
    assert.equal(palette.split('{').length - 1, 16 * 5);
    for (const rule of palette.split('}').filter((part) => part.trim())) {
      assert.match(rule, /\.xterm\.nebula-terminal \.xterm-[fb]g-\d+/);
      assert.ok(!rule.includes('!important'), rule);
    }
  });

  test('light mode pulls the text colours readable on the light card and keeps dark ones as given', () => {
    const theme = normalizeTheme({ ...DEFAULT_THEME, terminalColors: PALETTE });
    const css = buildCss(theme);
    const { surface } = lightBase(theme);
    for (const [i, c] of PALETTE.entries()) {
      const light = painted(css, `${LIGHT} .xterm-fg-${i}`);
      assert.ok(light, `fg ${i}`);
      assert.ok(contrastRatio(light, surface) >= 4.5, `${i}: ${light}`);
      if (contrastRatio(c, surface) >= 4.5) assert.equal(light, c, `${i} already reads`);
    }
    assert.notEqual(painted(css, `${LIGHT} .xterm-fg-15`), '#ffffff');
    assert.equal(painted(css, `${LIGHT} .xterm-fg-0`), '#101010');
    // backgrounds are one rule for both schemes
    assert.ok(!css.includes(`${LIGHT} .xterm-bg-`));
  });

  test('light mode follows lightText and lightSurface', () => {
    const css = build({ terminalColors: PALETTE, lightSurface: '#fff8e7', lightText: '#3a1f00' });
    const yellow = painted(css, `${LIGHT} .xterm-fg-3`);
    assert.ok(yellow && contrastRatio(yellow, '#fff8e7') >= 4.5);
    assert.notEqual(yellow, painted(build({ terminalColors: PALETTE }), `${LIGHT} .xterm-fg-3`));
  });
});
