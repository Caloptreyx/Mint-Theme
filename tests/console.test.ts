// The console page options: normalizeTheme() validation of every field and the CSS buildCss() emits for them.
// Run with `node --test "tests/*.test.ts"`.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildCss,
  CHART_ARRANGEMENTS,
  CHART_HEIGHTS,
  CHART_STYLES,
  CONSOLE_BANNERS,
  CONSOLE_WIDGETS,
  DEFAULT_CONSOLE_LAYOUT,
  DEFAULT_THEME,
  MAX_COMMAND_LABEL,
  MAX_COMMAND_LENGTH,
  MAX_CONSOLE_COMMANDS,
  type NebulaTheme,
  normalizeTheme,
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
