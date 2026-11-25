// Email theme fields, palette derivation parity with backend/src/mail.rs, preview rendering and template checks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { contrastRatio, luminance } from '../frontend/src/lib/color.ts';
import { buildCss } from '../frontend/src/lib/css/index.ts';
import {
  EMAIL_TEMPLATES,
  renderEmailPreviewHtml,
  resolveEmailPalette,
} from '../frontend/src/lib/email.ts';
import { normalizeTheme } from '../frontend/src/lib/normalize.ts';
import { PRESETS } from '../frontend/src/lib/presets.ts';
import { DEFAULT_THEME, EMAIL_THEMES, MAX_EMAIL_FOOTER, USER_THEME_FIELDS } from '../frontend/src/lib/theme.ts';

const MAILS_DIR = path.resolve(import.meta.dirname, '../backend/mails');

describe('email theme fields', () => {
  test('defaults and older themes keep sync on, dark palette, no CSS change, and stay site wide', () => {
    const old = normalizeTheme({});
    assert.equal(old.emailSync, true);
    assert.equal(old.emailTheme, 'dark');
    assert.equal(old.emailBackground, '');
    assert.equal(old.emailSurface, '');
    assert.equal(old.emailText, '');
    assert.equal(old.emailAccent, '');
    assert.equal(old.emailAccentText, '');
    assert.equal(old.emailLogo, '');
    assert.equal(old.emailFooter, '');

    assert.equal(
      buildCss(normalizeTheme({ emailTheme: 'light', emailFooter: 'Acme' })),
      buildCss(DEFAULT_THEME),
    );

    const emailFields = [
      'emailSync',
      'emailTheme',
      'emailBackground',
      'emailSurface',
      'emailText',
      'emailAccent',
      'emailAccentText',
      'emailLogo',
      'emailFooter',
    ] as const;
    for (const field of emailFields) {
      assert.equal(USER_THEME_FIELDS.includes(field), false, `${field} must stay site wide`);
    }
  });

  test('normalizeTheme validates email mode, colours, logo URL and footer text', () => {
    for (const mode of EMAIL_THEMES) {
      assert.equal(normalizeTheme({ emailTheme: mode }).emailTheme, mode);
    }
    assert.equal(normalizeTheme({ emailTheme: 'sepia' }).emailTheme, 'dark');
    assert.equal(normalizeTheme({ emailSync: 'nope' }).emailSync, true);
    assert.equal(normalizeTheme({ emailSync: false }).emailSync, false);

    const colored = normalizeTheme({
      emailBackground: '#ABCDEF',
      emailSurface: 'not-a-color',
      emailAccent: '#2FBF8F',
      emailLogo: 'https://cdn.example.com/logo.png',
    });
    assert.equal(colored.emailBackground, '#abcdef');
    assert.equal(colored.emailSurface, '');
    assert.equal(colored.emailAccent, '#2fbf8f');
    assert.equal(colored.emailLogo, 'https://cdn.example.com/logo.png');

    assert.equal(normalizeTheme({ emailLogo: 'javascript:alert(1)' }).emailLogo, '');
    assert.equal(normalizeTheme({ emailLogo: 'https://e.com/{{x}}.png' }).emailLogo, '');

    const footer = normalizeTheme({ emailFooter: `Hello {{world}}\n${'a'.repeat(MAX_EMAIL_FOOTER + 40)}` }).emailFooter;
    assert.equal(footer.includes('{'), false);
    assert.equal(footer.includes('}'), false);
    assert.equal(footer.includes('\n'), false);
    assert.equal([...footer].length, MAX_EMAIL_FOOTER);
  });
});

describe('resolveEmailPalette', () => {
  test('matches Rust GLOBAL_DEFAULTS for DEFAULT_THEME', () => {
    const p = resolveEmailPalette(DEFAULT_THEME);
    assert.deepEqual(p, {
      colorScheme: 'dark',
      bg: '#16122a',
      surface: '#110b21',
      surfaceRaised: '#1c162b',
      border: '#332f46',
      shadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
      text: '#e6e4f0',
      body: '#c4c1cf',
      muted: '#8f8c9d',
      accent: '#1e88c7',
      highlight: '#8fe3c8',
      accentText: '#ffffff',
      success: '#2fbf8f',
      successBg: '#152430',
      successText: '#2fbf8f',
      radius: '10px',
      buttonRadius: '6px',
      logo: '',
      footer: '',
    });
  });

  test('light mode and custom mode resolve readable palettes', () => {
    const mint = PRESETS.find((preset) => preset.name === 'Mint')!;
    const light = resolveEmailPalette(normalizeTheme({ ...mint.theme, emailTheme: 'light' }));
    assert.equal(light.colorScheme, 'light');
    assert.ok(luminance(light.bg) > 0.8);
    assert.ok(luminance(light.surface) > 0.9);
    assert.ok(contrastRatio(light.text, light.surface) >= 7);
    assert.ok(contrastRatio(light.successText, light.successBg) >= 4.5);

    const custom = resolveEmailPalette(
      normalizeTheme({
        emailTheme: 'custom',
        emailBackground: '#f4f5f7',
        emailSurface: '#ffffff',
        emailText: '#111827',
        emailAccent: '#2fbf8f',
        emailAccentText: '#0b1314',
      }),
    );
    assert.equal(custom.colorScheme, 'light');
    assert.equal(custom.bg, '#f4f5f7');
    assert.equal(custom.surface, '#ffffff');
    assert.equal(custom.text, '#111827');
    assert.equal(custom.accent, '#2fbf8f');
    assert.equal(custom.accentText, '#0b1314');
  });
});

describe('renderEmailPreviewHtml and backend/mails/*.html', () => {
  test('every core template renders cleanly in preview and escapes untrusted text', () => {
    const theme = normalizeTheme({
      emailLogo: 'https://cdn.example.com/logo.png',
      emailFooter: 'Need help? <script>alert(1)</script>',
    });

    for (const id of EMAIL_TEMPLATES) {
      const html = renderEmailPreviewHtml(id, theme, 'Acme <Panel>', 'https://panel.example.com');
      assert.ok(html.startsWith('<!doctype html>'), id);
      assert.ok(html.includes('Acme &lt;Panel&gt;'), id);
      assert.ok(html.includes('https://cdn.example.com/logo.png'), id);
      assert.ok(html.includes('Need help? &lt;script&gt;alert(1)&lt;/script&gt;'), id);
      assert.equal(html.includes('<script>'), false, id);
    }
  });

  test('all 10 backend HTML templates exist and use valid Mint global variables', () => {
    const allowedGlobals = new Set([
      'mint_email_color_scheme',
      'mint_email_bg',
      'mint_email_surface',
      'mint_email_surface_raised',
      'mint_email_border',
      'mint_email_shadow',
      'mint_email_text',
      'mint_email_body',
      'mint_email_muted',
      'mint_email_accent',
      'mint_email_highlight',
      'mint_email_accent_text',
      'mint_email_success',
      'mint_email_success_bg',
      'mint_email_success_text',
      'mint_email_radius',
      'mint_email_button_radius',
      'mint_email_logo',
      'mint_email_footer',
    ]);

    for (const id of EMAIL_TEMPLATES) {
      const html = fs.readFileSync(path.join(MAILS_DIR, `${id}.html`), 'utf8');
      assert.ok(html.includes('{{ language }}'), `${id} missing language`);
      assert.ok(html.includes('{{ subject }}'), `${id} missing subject`);
      assert.ok(html.includes('{{ settings.app.name }}'), `${id} missing app name`);
      assert.ok(html.includes('{{ vars.greeting }}'), `${id} missing greeting`);
      assert.ok(html.includes('{{ vars.intro }}'), `${id} missing intro`);
      assert.equal(html.includes('{{ server.name }}'), false, `${id} must not reference server.name directly`);

      for (const match of html.matchAll(/vars\.(mint_email_[a-z0-9_]+)/g)) {
        assert.ok(allowedGlobals.has(match[1]), `${id} references unknown global ${match[1]}`);
      }
      // balanced MiniJinja delimiters
      assert.equal(
        (html.match(/\{\{/g) ?? []).length,
        (html.match(/\}\}/g) ?? []).length,
        `${id} unbalanced {{ }}`,
      );
      assert.equal(
        (html.match(/\{%/g) ?? []).length,
        (html.match(/%\}/g) ?? []).length,
        `${id} unbalanced {% %}`,
      );
    }
  });
});
