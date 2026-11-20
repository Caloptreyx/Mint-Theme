// Animation timings, the motion switches, and the page, card, hover and overlay animations.
import type { AnimationSpeed, CardEntrance, NebulaTheme, OverlayMotion, PageTransition } from '../theme.ts';

/**
 * Page transitions; the keyframes live in app.css, which the editor's option tiles play too (slowed down). Every
 * keyframes name starts with `nebula-page`: PageTransition keeps its mark while one of them runs.
 */
export const PAGE_ANIMATIONS: Record<
  Exclude<PageTransition, 'none'>,
  { keyframes: string; ms: number; easing: string }
> = {
  fade: { keyframes: 'nebula-page-fade', ms: 200, easing: 'ease-out' },
  fadeUp: { keyframes: 'nebula-page-fade-up', ms: 240, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  fadeScale: { keyframes: 'nebula-page-fade-scale', ms: 220, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  slide: { keyframes: 'nebula-page-slide', ms: 250, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  slideDown: { keyframes: 'nebula-page-slide-down', ms: 240, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  zoom: { keyframes: 'nebula-page-zoom', ms: 240, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  blur: { keyframes: 'nebula-page-blur', ms: 250, easing: 'ease-out' },
};

/** Card entrance: each card or table row plays this, the first `CARD_STAGGER_MAX` one `CARD_STAGGER_MS` apart. */
export const CARD_ANIMATIONS: Record<
  Exclude<CardEntrance, 'none'>,
  { keyframes: string; ms: number; easing: string }
> = {
  fade: { keyframes: 'nebula-page-card-fade', ms: 260, easing: 'ease-out' },
  rise: { keyframes: 'nebula-page-card-rise', ms: 320, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
};
export const CARD_STAGGER_MS = 40;
export const CARD_STAGGER_MAX = 8;

/**
 * How modals and drawers open (menus and popovers take `DROPDOWN_SHARE` of the time). 'default' is Mantine's own
 * modal entrance, which buildCss leaves alone; its keyframes exist only for the editor's tile.
 */
export const OVERLAY_ANIMATIONS: Record<
  Exclude<OverlayMotion, 'none'>,
  { keyframes: string; ms: number; easing: string }
> = {
  default: { keyframes: 'nebula-overlay-fade-down', ms: 200, easing: 'ease' },
  pop: { keyframes: 'nebula-overlay-pop', ms: 200, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  slideUp: { keyframes: 'nebula-overlay-slide-up', ms: 240, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
};
const DROPDOWN_SHARE = 0.75;

/** What `animationSpeed` multiplies Mint's durations by; `reduceMotion` makes it 0. */
export const ANIMATION_SPEED_FACTORS: Record<AnimationSpeed, number> = { slow: 1.5, normal: 1, fast: 0.6 };

/** Mint's durations and its two motion switches: the visitor's `prefers-reduced-motion` and the theme's `reduceMotion`. */
export interface Motion {
  /** `animationSpeed`'s factor, 0 with `reduceMotion`. */
  factor: number;
  /** A duration scaled by `animationSpeed`. */
  ms: (base: number) => number;
  /** Rules that move: under `prefers-reduced-motion: no-preference`, nothing at all with `reduceMotion`. */
  moving: (rules: string) => string;
  /** Rules for reduced motion: under `prefers-reduced-motion: reduce`, unconditional with `reduceMotion`. */
  still: (rules: string) => string;
}

export function motionOf(t: NebulaTheme): Motion {
  const factor = t.reduceMotion ? 0 : ANIMATION_SPEED_FACTORS[t.animationSpeed];
  return {
    factor,
    ms: (base) => Math.round(base * factor),
    moving: (rules) => (t.reduceMotion ? '' : `@media (prefers-reduced-motion:no-preference){${rules}}`),
    still: (rules) => (t.reduceMotion ? rules : `@media (prefers-reduced-motion:reduce){${rules}}`),
  };
}

export function motionCss(t: NebulaTheme, motion: Motion): string[] {
  const css: string[] = [];
  // app.css's own transitions (the sidebar sections) multiply their durations by `--nebula-speed`
  if (motion.factor !== 1) css.push(`html:root{--nebula-speed:${motion.factor};}`);

  // PageTransition (elements/page/PageTransition.tsx) marks the element holding the page after a route change
  // and drops the mark once the animation ends; no fill mode, so no transform outlives it (xterm, the editor)
  if (t.pageTransition !== 'none' && !t.reduceMotion) {
    const { keyframes, ms, easing } = PAGE_ANIMATIONS[t.pageTransition];
    css.push(
      motion.moving(`html:root [data-nebula-page-enter] > *{animation:${keyframes} ${motion.ms(ms)}ms ${easing};}`),
    );
  }

  // card entrance, on the same mark: the page's outermost cards and every table row, the first few staggered.
  // `backwards` only holds the first frame through the delay; nothing is left once a card's animation ends
  if (t.cardEntrance !== 'none' && !t.reduceMotion) {
    const { keyframes, ms, easing } = CARD_ANIMATIONS[t.cardEntrance];
    const ITEM =
      'html:root [data-nebula-page-enter] :is(.mantine-Card-root:not([data-nebula-page-enter] .mantine-Card-root .mantine-Card-root),tbody > tr)';
    const delays = Array.from({ length: CARD_STAGGER_MAX - 2 }, (_, i) => i + 2).map(
      (n) => `${ITEM}:nth-child(${n}){animation-delay:${motion.ms(CARD_STAGGER_MS * (n - 1))}ms;}`,
    );
    css.push(
      motion.moving(
        `${ITEM}{animation:${keyframes} ${motion.ms(ms)}ms ${easing} backwards;}${delays.join('')}${ITEM}:nth-child(n+${CARD_STAGGER_MAX}){animation-delay:${motion.ms(CARD_STAGGER_MS * (CARD_STAGGER_MAX - 1))}ms;}`,
      ),
    );
  }

  // hover effect: core's hoverable cards (`cursor-pointer`: the servers list's cards and rows, core's server
  // items) and cards that are links, not the small hoverable cards inside them, and buttons that are not
  // subtle (the menu links) or disabled. Core's hoverable cards transition `all` (`transition-all!`, which nothing
  // unlayered beats), so only the duration is ours there; a lift keeps Mantine's press nudge (`:not(:active)`)
  if (t.hoverEffect !== 'none') {
    const CARD =
      'html:root :is(.mantine-Card-root.cursor-pointer,a.mantine-Card-root):not(.cursor-pointer .mantine-Card-root)';
    const BUTTON =
      'html:root .mantine-Button-root:not([data-variant="subtle"],[data-variant="transparent"],:disabled,[data-disabled],[data-loading])';
    const ring = (colour: string, alpha: number, spread: string) =>
      `0 0 0 1px color-mix(in srgb,${colour} ${alpha}%,transparent),${spread} color-mix(in srgb,${colour} ${alpha + 15}%,transparent)`;
    const lift = t.hoverEffect === 'lift';
    css.push(
      lift
        ? `@media (hover:hover){${CARD}:hover{box-shadow:0 14px 30px -16px rgb(0 0 0 / 0.55);}${BUTTON}:hover{box-shadow:0 8px 18px -10px rgb(0 0 0 / 0.6);}}`
        : // a filled button glows in its own colour, the others in their text colour
          `@media (hover:hover){${CARD}:hover{box-shadow:${ring('var(--mantine-color-blue-filled)', 50, '0 10px 32px -12px')};}${BUTTON}:hover{box-shadow:${ring('currentColor', 45, '0 0 18px -4px')};}${BUTTON}[data-variant="filled"]:hover{box-shadow:${ring('var(--button-bg)', 55, '0 0 18px -4px')};}}`,
      motion.still(`${CARD}{transition-duration:0s;}${BUTTON}{transition:none;}`),
    );
    if (!t.reduceMotion) {
      css.push(
        motion.moving(
          `@media (hover:hover){${CARD}{transition:transform ${motion.ms(190)}ms ease,box-shadow ${motion.ms(190)}ms ease;}${BUTTON}{transition:transform ${motion.ms(150)}ms ease,box-shadow ${motion.ms(150)}ms ease;}${
            lift
              ? `${CARD}:hover{transform:translateY(-3px);}${BUTTON}:hover:not(:active){transform:translateY(-1px);}`
              : ''
          }}`,
        ),
      );
    }
  }

  // overlays: Mantine's Transition writes the open or closed state inline (`opacity: 0` while closed, in every
  // Mantine transition) along with an inline `transition`. While open its transition is switched off, so the
  // open state lands at once and the keyframes (which outrank inline styles while they run) do the entrance;
  // closing goes back to the inline transition, so overlays close Mantine's way. 'none' and `reduceMotion` drop
  // the transition both ways
  const OVERLAY = ':is(.mantine-Modal-content,.mantine-Drawer-content)';
  const DROPDOWN = ':is(.mantine-Popover-dropdown,.mantine-Menu-dropdown,.mantine-Combobox-dropdown)';
  if (t.reduceMotion || t.overlayMotion === 'none') {
    const tooltip = t.reduceMotion ? ',html:root .mantine-Tooltip-tooltip' : '';
    css.push(
      `html:root ${OVERLAY},html:root ${DROPDOWN},html:root :is(.mantine-Modal-overlay,.mantine-Drawer-overlay)${tooltip}{transition:none!important;}`,
    );
  } else if (t.overlayMotion !== 'default') {
    const { keyframes, ms, easing } = OVERLAY_ANIMATIONS[t.overlayMotion];
    const OPEN = ':not([style*="opacity: 0;"])';
    css.push(
      motion.moving(
        `html:root ${OVERLAY}${OPEN},html:root ${DROPDOWN}${OPEN}{transition:none!important;}html:root ${OVERLAY}{animation:${keyframes} ${motion.ms(ms)}ms ${easing};}html:root ${DROPDOWN}{--nebula-overlay-shift:8px;transform-origin:top center;animation:${keyframes} ${motion.ms(ms * DROPDOWN_SHARE)}ms ${easing};}html:root ${DROPDOWN}[data-position^="top"]{transform-origin:bottom center;}`,
      ),
    );
  }

  return css;
}
