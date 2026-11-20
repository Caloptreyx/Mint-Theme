import type { NebulaTheme } from './theme.ts';
import { accentShades, contrastRatio, lightBase, mix, readable, surfaceShades } from './color.ts';

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
