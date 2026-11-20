import type { NebulaTheme } from '../theme.ts';
import { blockCss, cardStyleCss } from './blocks.ts';
import { colorCss } from './colors.ts';
import { terminalColorsCss, terminalCursorCss } from './console.ts';
import { interfaceCss } from './interface.ts';
import { motionCss, motionOf } from './motion.ts';
import { navCss } from './nav.ts';

/** The theme's stylesheet; every value in `t` must have been through normalizeTheme. */
export function buildCss(t: NebulaTheme): string {
  const motion = motionOf(t);
  return [
    ...colorCss(t),
    ...blockCss(t),
    ...interfaceCss(t, motion),
    ...motionCss(t, motion),
    ...cardStyleCss(t),
    ...navCss(t, motion),
    ...terminalCursorCss(t),
    ...terminalColorsCss(t),
  ].join('\n');
}
