import type { NebulaTheme } from '../theme.ts';
import type { Motion } from './motion.ts';
// The press feedback on buttons and the glassy toast.
import { luminance } from '../color.ts';

/** A 24px stroke icon as a data URI; `ink` is a bare hex so the `#` can be escaped. */
const glyph = (ink: string, path: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23${ink}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='${path}'/%3E%3C/svg%3E")`;

export function interfaceCss(t: NebulaTheme, motion: Motion): string[] {
  const css: string[] = [];
  // Mantine puts `mantine-active` on enabled buttons and action icons and nudges them 1px down on press ('drop')
  const PRESSED = 'html:root .mantine-active:active:not(fieldset:disabled *)';
  if (t.clickEffect === 'none') css.push(`${PRESSED}{transform:none;}`);
  if (t.clickEffect === 'shrink') {
    css.push(
      `html:root .mantine-active{transition:transform ${motion.ms(120)}ms ease;}${PRESSED}{transform:scale(0.96);}`,
      motion.still(`html:root .mantine-active{transition:none;}${PRESSED}{transform:none;}`),
    );
  }
  if (t.clickEffect === 'outline') {
    css.push(`${PRESSED}{transform:none;outline:2px solid var(--mantine-color-blue-filled);outline-offset:2px;}`);
  }

  // core's toast stack (providers/ToastProvider.tsx); `data-nebula-tone` is the toast's Mantine colour,
  // added by the Notification props interceptor in index.ts: green success, red error, yellow warning, teal info
  if (t.toastStyle === 'glassy') {
    const TOAST = 'html:root .fixed.z-999 .mantine-Notification-root';
    const tones: [string, string, string][] = [
      ['green', 'M5 12.5l4.5 4.5L19 7.5', t.success || '#40c057'],
      ['red', 'M7 7l10 10M17 7L7 17', t.danger || '#fa5252'],
      ['yellow', 'M12 6v8M12 18.5h.01', t.warning || '#fab005'],
    ];
    const blur = 'blur(14px) saturate(160%)';
    css.push(
      `${TOAST}{background-color:color-mix(in srgb,var(--notification-color) 14%,color-mix(in srgb,var(--mantine-color-body) 68%,transparent));border:1px solid color-mix(in srgb,var(--notification-color) 38%,transparent);box-shadow:0 12px 32px -14px color-mix(in srgb,var(--notification-color) 55%,transparent);-webkit-backdrop-filter:${blur};backdrop-filter:${blur};padding-inline-start:54px;min-height:56px;}`,
      // Mantine's colour bar becomes the icon tile
      `${TOAST}::before{display:block;top:50%;bottom:auto;width:30px;height:30px;margin-top:-15px;inset-inline-start:12px;border-radius:var(--mantine-radius-sm);background:${glyph('ffffff', 'M12 11v6.5M12 6.5h.01')} center/16px no-repeat,var(--notification-color);}`,
      // the glyph turns dark on light tiles (a yellow warning), the same cut as the text on the accent
      ...tones.map(
        ([tone, path, colour]) =>
          `${TOAST}[data-nebula-tone="${tone}"]::before{background-image:${glyph(luminance(colour) > 0.45 ? '111111' : 'ffffff', path)};}`,
      ),
      // counts down core's 7.5s `toastTimeout`; progress toasts stay until they finish, so they get none
      `${TOAST}:not(:has(.mantine-Progress-root))::after{content:'';position:absolute;inset-inline:0;bottom:0;height:3px;background:var(--notification-color);transform-origin:0 50%;animation:nebula-toast-countdown 7500ms linear forwards;}`,
      motion.still(`${TOAST}::after{display:none;}`),
    );
  }

  return css;
}
