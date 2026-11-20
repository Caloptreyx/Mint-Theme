import type { NebulaTheme } from './theme.ts';
import { accentShades, contrastRatio, derivedColors, lightBase, mix, readable, surfaceShades } from './color.ts';

/** WCAG AA: 4.5:1 for text, 3:1 for icons and other UI graphics. */
export const MIN_TEXT_CONTRAST = 4.5;
export const MIN_UI_CONTRAST = 3;

export type ContrastField =
  | 'accent'
  | 'background'
  | 'surface'
  | 'text'
  | 'textMuted'
  | 'textOnAccent'
  | 'buttonColor'
  | 'buttonText'
  | 'lightBackground'
  | 'lightSurface'
  | 'lightText';

export interface ContrastIssue {
  fg: ContrastField;
  bg: ContrastField;
  /**
   * Set when the colour painted is derived from `fg` rather than `fg` itself (the link shade, light mode's dimmed
   * text), or the pair is one of several uses of `fg` (text on accent's badges, checkboxes and switches).
   */
  role?: 'links' | 'dimmed' | 'accentFills';
  ratio: number;
  min: number;
}

/** The pairs the panel really paints (derived fallbacks included) that fall below their WCAG minimum. */
export function contrastIssues(t: NebulaTheme): ContrastIssue[] {
  const blue = accentShades(t.accent);
  const dark = surfaceShades(t);
  const light = lightBase(t);
  type Pair = [ContrastField, ContrastField, string, string, ContrastIssue['role']?];
  const pairs: Pair[] = [
    ['text', 'background', t.text, t.background],
    ['text', 'surface', t.text, t.surface],
    ['textMuted', 'surface', t.textMuted || dark[2], t.surface],
    // links and `c='blue'` text are the anchor shade, not the accent itself
    ['accent', 'surface', blue[4], t.surface, 'links'],
    ['lightText', 'lightBackground', light.text, light.background],
    ['lightText', 'lightSurface', light.text, light.surface],
    ['lightText', 'lightSurface', mix(light.text, light.surface, 0.62), light.surface, 'dimmed'],
    ['accent', 'lightSurface', readable(t.accent, light.text, light.surface), light.surface, 'links'],
  ];
  // `buttonText` sets the label's colour in every style; solid buttons put it on the button colour, the others on
  // a tint of it over the card (outline: the card itself)
  if (t.buttonStyle === 'filled') {
    pairs.push(['buttonText', 'buttonColor', t.buttonText || t.textOnAccent || '#ffffff', t.buttonColor || t.accent]);
  } else if (t.buttonText) {
    const tint = { tinted: 0.22, glass: 0.28, outline: 0 }[t.buttonStyle];
    const fill = t.buttonColor || t.accent;
    pairs.push(
      ['buttonText', 'surface', t.buttonText, mix(fill, t.surface, tint)],
      ['buttonText', 'lightSurface', t.buttonText, mix(fill, light.surface, tint)],
    );
  }
  const issues: ContrastIssue[] = pairs.map(([fg, bg, a, b, role]) => ({
    fg,
    bg,
    ...(role && { role }),
    ratio: contrastRatio(a, b),
    min: MIN_TEXT_CONTRAST,
  }));
  // text on accent (core's white while empty) is painted on the accent wherever no style changes it: badges with no
  // colour or variant, checked checkboxes and switches, filled action icons; bold small labels and marks, so 3:1
  const onAccent = t.textOnAccent || '#ffffff';
  issues.push({
    fg: 'textOnAccent',
    bg: 'accent',
    role: 'accentFills',
    ratio: contrastRatio(onAccent, t.accent),
    min: MIN_UI_CONTRAST,
  });
  // the solid menu styles paint the current link's label on it ('iconPill' only its icon, covered above)
  if (t.navHover === 'filled' || t.navHover === 'pill') {
    issues.push({ fg: 'textOnAccent', bg: 'accent', ratio: contrastRatio(onAccent, t.accent), min: MIN_TEXT_CONTRAST });
  }
  return issues.filter((issue) => issue.ratio < issue.min);
}

const sameIssue = (a: ContrastIssue, b: ContrastIssue) =>
  a.fg === b.fg && a.bg === b.bg && a.role === b.role && a.min === b.min;

/** Mixing steps toward black and toward white: 1% each, so a fix is never more than a step past the minimum. */
const FIX_STEPS = 100;

/**
 * The smallest change to `issue.fg` (the field, never its partner) that clears `issue`: its colour (the derived
 * fallback while empty) is mixed toward black and toward white in 1% steps, each direction stopping at the first
 * colour where `contrastIssues` no longer has the issue. Of the two, fewer issues overall wins, then the shorter
 * move. Null when neither direction clears it.
 */
export function fixContrast(t: NebulaTheme, issue: ContrastIssue): Partial<NebulaTheme> | null {
  const field = issue.fg;
  const start = t[field] || (derivedColors(t) as Record<string, string>)[field];
  let best: { color: string; issues: number; step: number } | null = null;
  for (const target of ['#000000', '#ffffff']) {
    for (let step = 1; step <= FIX_STEPS; step++) {
      const color = mix(target, start, step / FIX_STEPS);
      const issues = contrastIssues({ ...t, [field]: color });
      if (issues.some((other) => sameIssue(other, issue))) continue;
      if (!best || issues.length < best.issues || (issues.length === best.issues && step < best.step)) {
        best = { color, issues: issues.length, step };
      }
      break;
    }
  }
  return best && { [field]: best.color };
}

/**
 * Fixes the issues one at a time with `fixContrast`, recomputing them after each change (a new accent can break
 * text on accent, for one). The stricter minimum goes first, so text on accent moves once for 4.5:1 rather than
 * once for 3:1 and again. `patch` holds every field changed, `unfixed` what is still failing afterwards.
 */
export function fixAllContrast(t: NebulaTheme): { patch: Partial<NebulaTheme>; unfixed: ContrastIssue[] } {
  let theme = t;
  let patch: Partial<NebulaTheme> = {};
  const skipped: ContrastIssue[] = [];
  // every pass either fixes one issue or skips one for good; the cap stops fixes that keep undoing each other
  for (let pass = 0; pass < 32; pass++) {
    const issue = contrastIssues(theme)
      .filter((i) => !skipped.some((s) => sameIssue(s, i)))
      .sort((a, b) => b.min - a.min)[0];
    if (!issue) break;
    const fix = fixContrast(theme, issue);
    if (!fix) {
      skipped.push(issue);
      continue;
    }
    theme = { ...theme, ...fix };
    patch = { ...patch, ...fix };
  }
  return { patch, unfixed: contrastIssues(theme) };
}
