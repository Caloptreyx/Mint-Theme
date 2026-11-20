// fixContrast() and fixAllContrast(): the editor's 'Fix' buttons. Run with `node --test "tests/*.test.ts"`.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { mix } from '../frontend/src/lib/color.ts';
import { type ContrastIssue, contrastIssues, fixAllContrast, fixContrast } from '../frontend/src/lib/contrast.ts';
import { DEFAULT_THEME, type NebulaTheme } from '../frontend/src/lib/theme.ts';

const theme = (patch: Partial<NebulaTheme>): NebulaTheme => ({ ...DEFAULT_THEME, ...patch });

const same = (a: ContrastIssue, b: ContrastIssue) =>
  a.fg === b.fg && a.bg === b.bg && a.role === b.role && a.min === b.min;
const has = (t: NebulaTheme, issue: ContrastIssue) => contrastIssues(t).some((other) => same(other, issue));

function findIssue(t: NebulaTheme, match: Partial<ContrastIssue>): ContrastIssue {
  const issue = contrastIssues(t).find((i) =>
    (Object.keys(match) as (keyof ContrastIssue)[]).every((k) => i[k] === match[k]),
  );
  assert.ok(issue, `expected an issue like ${JSON.stringify(match)}`);
  return issue;
}

/**
 * Asserts the fix only sets `issue.fg`, clears the issue, and is the first 1% step from `start` (the colour
 * painted before) toward black or white that does: the step before it still fails.
 */
function assertJustEnough(t: NebulaTheme, issue: ContrastIssue, start: string) {
  const patch = fixContrast(t, issue);
  assert.ok(patch, 'expected a fix');
  assert.deepEqual(Object.keys(patch), [issue.fg]);
  const color = patch[issue.fg] as string;
  assert.match(color, /^#[0-9a-f]{6}$/);
  assert.notEqual(color, start);
  assert.equal(has({ ...t, ...patch }, issue), false, 'the fix must clear the issue');

  const found = ['#000000', '#ffffff'].flatMap((target) => {
    const step = Array.from({ length: 100 }, (_, i) => i + 1).find((s) => mix(target, start, s / 100) === color);
    return step ? [{ target, step }] : [];
  });
  assert.ok(found.length, `${color} is not a 1% step from ${start}`);
  const { target, step } = found[0];
  const before = mix(target, start, (step - 1) / 100);
  assert.equal(has({ ...t, [issue.fg]: before }, issue), true, `${before} already passes, so ${color} overshoots`);
  return color;
}

describe('fixContrast', () => {
  test('dim body text on the background', () => {
    const t = theme({ text: '#555555' });
    assertJustEnough(t, findIssue(t, { fg: 'text', bg: 'background' }), '#555555');
  });

  test('derived muted text starts from the colour painted', () => {
    const t = theme({ text: '#555555' });
    const issue = findIssue(t, { fg: 'textMuted', bg: 'surface' });
    assert.equal(t.textMuted, '');
    const patch = fixContrast(t, issue);
    assert.ok(patch?.textMuted);
    assert.equal(has({ ...t, ...patch }, issue), false);
  });

  test('links on the dark surface move the accent', () => {
    const t = theme({ accent: '#202040' });
    assertJustEnough(t, findIssue(t, { fg: 'accent', bg: 'surface', role: 'links' }), '#202040');
  });

  test('links on the light surface move the accent', () => {
    const t = theme({ lightText: '#888888' });
    assertJustEnough(t, findIssue(t, { fg: 'accent', bg: 'lightSurface', role: 'links' }), t.accent);
  });

  test('white text on a bright accent at 3:1', () => {
    const t = theme({ accent: '#ffe066' });
    const issue = findIssue(t, { fg: 'textOnAccent', role: 'accentFills' });
    assert.equal(issue.min, 3);
    assertJustEnough(t, issue, '#ffffff');
  });

  test("white text on a bright accent at 4.5:1 under the 'filled' menu", () => {
    const t = theme({ accent: '#ffe066', navHover: 'filled' });
    const issue = findIssue(t, { fg: 'textOnAccent', min: 4.5 });
    assert.equal(issue.role, undefined);
    const color = assertJustEnough(t, issue, '#ffffff');
    // the 3:1 check on the same pair passes too, and the 3:1 fix alone would not clear this one
    assert.deepEqual(contrastIssues({ ...t, textOnAccent: color }), []);
    const weaker = fixContrast(t, findIssue(t, { fg: 'textOnAccent', role: 'accentFills' }));
    assert.equal(has({ ...t, ...weaker }, issue), true);
  });

  test('filled button text starts from text on accent, then white', () => {
    const t = theme({ buttonStyle: 'filled', buttonColor: '#ffe066' });
    assertJustEnough(t, findIssue(t, { fg: 'buttonText', bg: 'buttonColor' }), '#ffffff');
    const onAccent = theme({ buttonStyle: 'filled', buttonColor: '#ffe066', textOnAccent: '#eeeeee' });
    assertJustEnough(onAccent, findIssue(onAccent, { fg: 'buttonText', bg: 'buttonColor' }), '#eeeeee');
  });

  test('light mode text', () => {
    const t = theme({ lightText: '#bbbbbb' });
    assertJustEnough(t, findIssue(t, { fg: 'lightText', bg: 'lightBackground' }), '#bbbbbb');
    assertJustEnough(t, findIssue(t, { fg: 'lightText', bg: 'lightSurface', role: undefined }), '#bbbbbb');
  });

  test('null when no colour of the field clears it', () => {
    // dimmed light text is 62% of the way to a mid grey surface: neither black nor white text reads at 4.5:1
    const t = theme({ lightSurface: '#777777' });
    assert.equal(fixContrast(t, findIssue(t, { fg: 'lightText', role: 'dimmed' })), null);
  });
});

describe('fixAllContrast', () => {
  test('nothing to do on a passing theme', () => {
    assert.deepEqual(fixAllContrast(DEFAULT_THEME), { patch: {}, unfixed: [] });
  });

  for (const [name, patch] of [
    ['several fields', { text: '#555555', accent: '#ffe066', navHover: 'filled', lightText: '#bbbbbb' }],
    ['filled buttons', { buttonStyle: 'filled', buttonColor: '#ffe066', accent: '#202040' }],
    ['an unfixable pair', { lightSurface: '#777777', text: '#444444' }],
  ] as [string, Partial<NebulaTheme>][]) {
    test(`leaves no fixable issue: ${name}`, () => {
      const t = theme(patch);
      assert.ok(contrastIssues(t).length);
      const { patch: fix, unfixed } = fixAllContrast(t);
      // only foreground fields move, never a background or surface
      const foregrounds = ['accent', 'text', 'textMuted', 'textOnAccent', 'buttonText', 'lightText'];
      for (const key of Object.keys(fix)) assert.ok(foregrounds.includes(key), key);
      const fixed = { ...t, ...fix };
      assert.deepEqual(unfixed, contrastIssues(fixed));
      for (const issue of unfixed) assert.equal(fixContrast(fixed, issue), null, `${issue.fg} on ${issue.bg}`);
    });
  }

  test('reports what it could not fix', () => {
    const { unfixed } = fixAllContrast(theme({ lightSurface: '#777777' }));
    assert.ok(unfixed.some((i) => i.fg === 'lightText' && i.role === 'dimmed'));
  });
});
