// The Animations section's theme fields: page transitions, card entrance, hover effect, overlay motion, animation
// speed and reduce motion. Run with `node --test "tests/*.test.ts"`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import {
  ANIMATION_SPEED_FACTORS,
  ANIMATION_SPEEDS,
  buildCss,
  CARD_ANIMATIONS,
  CARD_ENTRANCES,
  CARD_STAGGER_MAX,
  CARD_STAGGER_MS,
  DEFAULT_THEME,
  HOVER_EFFECTS,
  type NebulaTheme,
  normalizeTheme,
  OVERLAY_ANIMATIONS,
  OVERLAY_MOTIONS,
  PAGE_ANIMATIONS,
  PAGE_TRANSITIONS,
  USER_THEME_FIELDS,
} from '../frontend/src/lib/theme.ts';

const APP_CSS = readFileSync(new URL('../frontend/src/app.css', import.meta.url), 'utf8');
const braces = (css: string) => css.split('{').length === css.split('}').length;
const css = (theme: Partial<Record<keyof NebulaTheme, unknown>>) => buildCss(normalizeTheme(theme));
const TOAST = 'html:root .fixed.z-999 .mantine-Notification-root';

describe('motion defaults', () => {
  test('the defaults change nothing', () => {
    assert.equal(DEFAULT_THEME.cardEntrance, 'none');
    assert.equal(DEFAULT_THEME.hoverEffect, 'none');
    assert.equal(DEFAULT_THEME.overlayMotion, 'default');
    assert.equal(DEFAULT_THEME.animationSpeed, 'normal');
    assert.equal(DEFAULT_THEME.reduceMotion, false);
    const old = normalizeTheme({ accent: '#2fbf8f', buttonStyle: 'glass', radius: 12 });
    for (const output of [buildCss(DEFAULT_THEME), buildCss(old)]) {
      for (const marker of [
        'nebula-speed',
        'nebula-page',
        'nebula-overlay',
        'mantine-Modal',
        'mantine-Drawer',
        'mantine-Popover',
        'mantine-Menu',
        'mantine-Tooltip',
        'mantine-Button-root:not',
        'cursor-pointer',
        'prefers-reduced-motion',
        'transition:',
        'animation:',
      ]) {
        assert.equal(output.includes(marker), false, marker);
      }
    }
  });

  test('older themes with animations keep their exact rules', () => {
    const output = css({ pageTransition: 'fadeUp', clickEffect: 'shrink', toastStyle: 'glassy', navHover: 'iconPill' });
    assert.ok(
      output.includes(
        '@media (prefers-reduced-motion:no-preference){html:root [data-nebula-page-enter] > *{animation:nebula-page-fade-up 240ms cubic-bezier(0.2, 0.8, 0.3, 1);}}',
      ),
    );
    assert.ok(
      output.includes(
        'html:root .mantine-active{transition:transform 120ms ease;}html:root .mantine-active:active:not(fieldset:disabled *){transform:scale(0.96);}',
      ),
    );
    assert.ok(
      output.includes(
        '@media (prefers-reduced-motion:reduce){html:root .mantine-active{transition:none;}html:root .mantine-active:active:not(fieldset:disabled *){transform:none;}}',
      ),
    );
    assert.ok(output.includes(`@media (prefers-reduced-motion:reduce){${TOAST}::after{display:none;}}`));
    assert.ok(output.includes('transition:background-color 120ms ease,color 120ms ease;'));
    assert.equal(output.includes('nebula-speed'), false);
  });

  test('a picked preset carries the look, reduce motion stays site wide', () => {
    for (const key of ['cardEntrance', 'hoverEffect', 'overlayMotion', 'animationSpeed'] as const) {
      assert.ok(USER_THEME_FIELDS.includes(key), key);
    }
    assert.equal(USER_THEME_FIELDS.includes('reduceMotion'), false);
  });
});

describe('motion validation', () => {
  const cases: [keyof NebulaTheme, readonly string[], unknown[]][] = [
    ['pageTransition', PAGE_TRANSITIONS, ['Slide', 'slide-down', 'zoomIn', 'blur;}', '', 'constructor', 1, null]],
    ['cardEntrance', CARD_ENTRANCES, ['Rise', 'slide', 'fade;}', '', 'toString', 0, true, ['fade']]],
    ['hoverEffect', HOVER_EFFECTS, ['Lift', 'shadow', 'glow}', '', '__proto__', 1, false, { lift: 1 }]],
    ['overlayMotion', OVERLAY_MOTIONS, ['Pop', 'slide-up', 'fade', 'none;}', '', 'valueOf', 0, null]],
    ['animationSpeed', ANIMATION_SPEEDS, ['Fast', 'faster', '2', '', 'hasOwnProperty', 2, 0.5, null]],
  ];

  test('each option only accepts its allow list', () => {
    for (const [field, allowed, bad] of cases) {
      for (const value of allowed) assert.equal(normalizeTheme({ [field]: value })[field], value, `${field} ${value}`);
      for (const value of bad) {
        assert.equal(normalizeTheme({ [field]: value })[field], DEFAULT_THEME[field], `${field} ${String(value)}`);
      }
    }
  });

  test('invalid values fall back to the given theme, not the defaults', () => {
    const given: NebulaTheme = {
      ...DEFAULT_THEME,
      pageTransition: 'blur',
      cardEntrance: 'rise',
      hoverEffect: 'glow',
      overlayMotion: 'none',
      animationSpeed: 'fast',
      reduceMotion: true,
    };
    const out = normalizeTheme(
      {
        pageTransition: 'warp',
        cardEntrance: 'drop',
        hoverEffect: 1,
        overlayMotion: 'spin',
        animationSpeed: 'ludicrous',
        reduceMotion: 'no',
      },
      given,
    );
    for (const key of ['pageTransition', 'cardEntrance', 'hoverEffect', 'overlayMotion', 'animationSpeed', 'reduceMotion'] as const) {
      assert.equal(out[key], given[key], key);
    }
  });

  test('reduceMotion only accepts booleans', () => {
    assert.equal(normalizeTheme({ reduceMotion: true }).reduceMotion, true);
    assert.equal(normalizeTheme({ reduceMotion: false }, { ...DEFAULT_THEME, reduceMotion: true }).reduceMotion, false);
    for (const bad of ['true', 'yes', 1, 0, null, [], {}]) {
      assert.equal(normalizeTheme({ reduceMotion: bad }).reduceMotion, false, String(bad));
    }
  });
});

describe('motion css', () => {
  test('every keyframes name buildCss or the editor uses lives in app.css', () => {
    const names = [
      ...Object.values(PAGE_ANIMATIONS),
      ...Object.values(CARD_ANIMATIONS),
      ...Object.values(OVERLAY_ANIMATIONS),
    ].map(({ keyframes }) => keyframes);
    for (const name of names) assert.ok(APP_CSS.includes(`@keyframes ${name} {`), name);
    // PageTransition keeps its mark while an animation whose name starts with nebula-page runs
    for (const { keyframes } of [...Object.values(PAGE_ANIMATIONS), ...Object.values(CARD_ANIMATIONS)]) {
      assert.ok(keyframes.startsWith('nebula-page'), keyframes);
    }
    // the slide follows the reading direction
    assert.match(APP_CSS, /\[dir="rtl"\] \{\s*--nebula-slide-dir: -1;/);
  });

  test('the new page transitions animate the entering page like the others', () => {
    for (const transition of ['slide', 'slideDown', 'zoom', 'blur'] as const) {
      const { keyframes, ms, easing } = PAGE_ANIMATIONS[transition];
      const output = css({ pageTransition: transition });
      assert.ok(
        output.includes(
          `@media (prefers-reduced-motion:no-preference){html:root [data-nebula-page-enter] > *{animation:${keyframes} ${ms}ms ${easing};}}`,
        ),
        transition,
      );
      assert.equal(/forwards|both/.test(output), false);
      assert.ok(braces(output));
    }
  });

  test('card entrance staggers the first cards and rows, holds nothing afterwards', () => {
    for (const entrance of ['fade', 'rise'] as const) {
      const output = css({ cardEntrance: entrance });
      const { keyframes, ms, easing } = CARD_ANIMATIONS[entrance];
      assert.ok(output.includes('@media (prefers-reduced-motion:no-preference){'));
      assert.ok(output.includes(`{animation:${keyframes} ${ms}ms ${easing} backwards;}`), entrance);
      assert.ok(output.includes('[data-nebula-page-enter] :is(.mantine-Card-root'));
      assert.ok(output.includes('tbody > tr)'));
      // only the delay is filled: nothing outlives the animation
      assert.equal(/forwards|both/.test(output), false);
      const delays = [...output.matchAll(/animation-delay:(\d+)ms/g)].map((m) => Number(m[1]));
      assert.equal(delays.length, CARD_STAGGER_MAX - 1);
      assert.equal(Math.max(...delays), CARD_STAGGER_MS * (CARD_STAGGER_MAX - 1));
      assert.ok(output.includes(`:nth-child(n+${CARD_STAGGER_MAX}){animation-delay:`));
      assert.ok(braces(output));
    }
    assert.equal(css({ cardEntrance: 'none' }).includes('data-nebula-page-enter'), false);
  });

  test('hover lift moves only with motion allowed, glow never moves', () => {
    const lift = css({ hoverEffect: 'lift' });
    assert.match(lift, /@media \(hover:hover\)\{[^@]*\.mantine-Card-root\.cursor-pointer[^@]*:hover\{box-shadow:/);
    assert.match(
      lift,
      /@media \(prefers-reduced-motion:no-preference\)\{@media \(hover:hover\)\{[^@]*:hover\{transform:translateY\(-3px\);\}[^@]*:hover:not\(:active\)\{transform:translateY\(-1px\);\}\}\}/,
    );
    assert.match(lift, /@media \(prefers-reduced-motion:reduce\)\{[^@]*\{transition-duration:0s;\}[^@]*\{transition:none;\}\}/);
    // the menu links are subtle buttons; disabled and loading buttons stay put
    assert.ok(lift.includes('.mantine-Button-root:not([data-variant="subtle"],[data-variant="transparent"],:disabled,[data-disabled],[data-loading])'));
    assert.ok(braces(lift));

    const glow = css({ hoverEffect: 'glow' });
    assert.equal(glow.includes('translateY'), false);
    assert.match(glow, /:hover\{box-shadow:0 0 0 1px color-mix\(in srgb,var\(--mantine-color-blue-filled\) 50%,transparent\)/);
    assert.ok(glow.includes('[data-variant="filled"]:hover{box-shadow:0 0 0 1px color-mix(in srgb,var(--button-bg) 55%'));
    assert.ok(braces(glow));
  });

  test('overlay motion replaces the opening only, none drops the transitions', () => {
    for (const motion of ['pop', 'slideUp'] as const) {
      const output = css({ overlayMotion: motion });
      const { keyframes, ms, easing } = OVERLAY_ANIMATIONS[motion];
      assert.ok(output.includes('@media (prefers-reduced-motion:no-preference){'));
      // Mantine's inline transition is off only while the overlay is open (not `opacity: 0`)
      assert.ok(
        output.includes(
          'html:root :is(.mantine-Modal-content,.mantine-Drawer-content):not([style*="opacity: 0;"]),html:root :is(.mantine-Popover-dropdown,.mantine-Menu-dropdown,.mantine-Combobox-dropdown):not([style*="opacity: 0;"]){transition:none!important;}',
        ),
      );
      assert.ok(output.includes(`html:root :is(.mantine-Modal-content,.mantine-Drawer-content){animation:${keyframes} ${ms}ms ${easing};}`));
      assert.ok(output.includes(`animation:${keyframes} ${Math.round(ms * 0.75)}ms ${easing};`));
      assert.equal(/forwards|both/.test(output), false);
      assert.ok(braces(output));
    }
    const none = css({ overlayMotion: 'none' });
    assert.match(none, /\.mantine-Modal-overlay,\.mantine-Drawer-overlay\)\{transition:none!important;\}/);
    assert.equal(none.includes('Tooltip'), false);
    assert.equal(none.includes('animation'), false);
    assert.equal(css({ overlayMotion: 'default' }).includes('mantine-Modal'), false);
  });

  test('animation speed scales every Mint duration but the toast countdown', () => {
    for (const speed of ANIMATION_SPEEDS) {
      const factor = ANIMATION_SPEED_FACTORS[speed];
      const output = css({
        animationSpeed: speed,
        pageTransition: 'fade',
        cardEntrance: 'rise',
        hoverEffect: 'lift',
        overlayMotion: 'pop',
        clickEffect: 'shrink',
        toastStyle: 'glassy',
        navHover: 'iconPill',
      });
      const ms = (base: number) => `${Math.round(base * factor)}ms`;
      assert.ok(output.includes(`animation:nebula-page-fade ${ms(200)} ease-out;`), speed);
      assert.ok(output.includes(`animation:nebula-page-card-rise ${ms(320)} `), speed);
      assert.ok(output.includes(`animation-delay:${ms(CARD_STAGGER_MS)};`), speed);
      assert.ok(output.includes(`transition:transform ${ms(190)} ease,box-shadow ${ms(190)} ease;`), speed);
      assert.ok(output.includes(`animation:nebula-overlay-pop ${ms(200)} `), speed);
      assert.ok(output.includes(`html:root .mantine-active{transition:transform ${ms(120)} ease;}`), speed);
      assert.ok(output.includes(`transition:background-color ${ms(120)} ease,color ${ms(120)} ease;`), speed);
      assert.ok(output.includes('animation:nebula-toast-countdown 7500ms linear forwards;'), speed);
      assert.equal(output.includes('--nebula-speed'), speed !== 'normal', speed);
      if (speed !== 'normal') assert.ok(output.includes(`html:root{--nebula-speed:${factor};}`));
    }
    // app.css's own transitions follow the variable
    assert.ok(APP_CSS.includes('calc(120ms * var(--nebula-speed, 1))'));
    assert.ok(APP_CSS.includes('calc(150ms * var(--nebula-speed, 1))'));
  });

  test('reduce motion turns every Mint animation off for everyone', () => {
    const output = css({
      reduceMotion: true,
      animationSpeed: 'slow',
      pageTransition: 'zoom',
      cardEntrance: 'fade',
      hoverEffect: 'lift',
      overlayMotion: 'pop',
      clickEffect: 'shrink',
      toastStyle: 'glassy',
      navHover: 'iconPill',
    });
    assert.equal(output.includes('prefers-reduced-motion'), false);
    assert.equal(output.includes('data-nebula-page-enter'), false);
    assert.equal(output.includes('nebula-overlay'), false);
    assert.equal(output.includes('translateY'), false);
    assert.ok(output.includes('html:root{--nebula-speed:0;}'));
    // the countdown is hidden, the shrink stands still, hovered cards and buttons change at once
    assert.ok(output.includes(`${TOAST}::after{display:none;}`));
    assert.ok(output.includes('html:root .mantine-active{transition:none;}html:root .mantine-active:active:not(fieldset:disabled *){transform:none;}'));
    assert.match(output, /\{transition-duration:0s;\}/);
    // Mantine's overlays and tooltips open and close at once
    assert.ok(output.includes(',html:root .mantine-Tooltip-tooltip{transition:none!important;}'));
    assert.ok(output.includes('.mantine-Modal-content'));
    assert.ok(braces(output));
    // a lone reduceMotion only adds the speed and the overlay rule
    const bare = css({ reduceMotion: true });
    assert.ok(bare.includes('--nebula-speed:0'));
    assert.equal(bare.includes('animation'), false);
  });
});
