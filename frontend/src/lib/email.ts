import type { NebulaTheme } from './theme.ts';
// Email palette derivation and live HTML preview matching backend/src/mail.rs and backend/mails/*.html.
import { contrastRatio, lightBase, luminance, mix, readable } from './color.ts';

export const EMAIL_PREVIEW_PAGE = '__mint_email_preview__';

export const EMAIL_TEMPLATES = [
  'account_created',
  'password_reset',
  'email_verification',
  'two_factor_code',
  'session_created',
  'connection_test',
  'added_to_server',
  'removed_from_server',
  'server_installed',
  'server_restored',
] as const;

export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number];

export interface EmailPalette {
  colorScheme: 'dark' | 'light';
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  shadow: string;
  text: string;
  body: string;
  muted: string;
  accent: string;
  highlight: string;
  accentText: string;
  success: string;
  successBg: string;
  successText: string;
  radius: string;
  buttonRadius: string;
  logo: string;
  footer: string;
}

const DEFAULT_SUCCESS = '#2fbf8f';
const DARK_SHADOW = '0 12px 32px rgba(0, 0, 0, 0.35)';
const LIGHT_SHADOW = '0 8px 30px rgba(15, 23, 42, 0.08)';

/** Matches `auto_accent_text` in `backend/src/mail.rs`. */
function autoAccentText(accent: string): string {
  const white = contrastRatio(accent, '#ffffff');
  if (white >= 3.5) return '#ffffff';
  const dark = contrastRatio(accent, '#0b1314');
  return dark >= white ? '#0b1314' : '#ffffff';
}

/**
 * Resolves the exact set of colours, radii, logo and footer synced to Calagopus's global `mint_email_*`
 * template variables. Mirrors `resolve_vars()` in `backend/src/mail.rs` so the editor preview matches
 * every sent email.
 */
export function resolveEmailPalette(theme: NebulaTheme): EmailPalette {
  const success = theme.success || DEFAULT_SUCCESS;
  const baseAccent = theme.buttonColor || theme.accent;
  const baseAccentText = theme.buttonText || theme.textOnAccent || autoAccentText(baseAccent);

  let colorScheme: 'dark' | 'light';
  let bg: string;
  let surface: string;
  let surfaceRaised: string;
  let border: string;
  let shadow: string;
  let text: string;
  let body: string;
  let muted: string;
  let accent: string;
  let highlight: string;
  let accentText: string;

  if (theme.emailTheme === 'light') {
    const light = lightBase(theme);
    colorScheme = 'light';
    bg = light.background;
    surface = light.surface;
    text = light.text;
    surfaceRaised = mix(text, surface, 0.025);
    border = mix(text, surface, 0.12);
    shadow = LIGHT_SHADOW;
    body = mix(text, surface, 0.78);
    muted = mix(text, surface, 0.55);
    accent = baseAccent;
    highlight = theme.highlight;
    accentText = baseAccentText;
  } else if (theme.emailTheme === 'custom') {
    bg = theme.emailBackground || theme.background;
    surface = theme.emailSurface || theme.surface;
    text = theme.emailText || theme.text;
    accent = theme.emailAccent || baseAccent;
    highlight = theme.emailAccent ? mix(theme.emailAccent, '#ffffff', 0.68) : theme.highlight;
    accentText = theme.emailAccentText || autoAccentText(accent);
    const isLight = luminance(bg) >= 0.35;
    colorScheme = isLight ? 'light' : 'dark';
    surfaceRaised = mix(text, surface, isLight ? 0.025 : 0.05);
    border = mix(text, isLight ? surface : bg, isLight ? 0.12 : 0.14);
    shadow = isLight ? LIGHT_SHADOW : DARK_SHADOW;
    body = mix(text, surface, isLight ? 0.78 : 0.84);
    muted = mix(text, isLight ? surface : bg, isLight ? 0.55 : 0.58);
  } else {
    colorScheme = 'dark';
    bg = theme.background;
    surface = theme.surface;
    text = theme.text;
    surfaceRaised = mix(text, surface, 0.05);
    border = theme.line || mix(text, bg, 0.14);
    shadow = DARK_SHADOW;
    body = mix(text, surface, 0.84);
    muted = theme.textMuted || mix(text, bg, 0.58);
    accent = baseAccent;
    highlight = theme.highlight;
    accentText = baseAccentText;
  }

  const successBg = mix(success, surface, 0.14);
  const successText = readable(success, text, successBg, 4.5);

  return {
    colorScheme,
    bg,
    surface,
    surfaceRaised,
    border,
    shadow,
    text,
    body,
    muted,
    accent,
    highlight,
    accentText,
    success,
    successBg,
    successText,
    radius: `${theme.radius}px`,
    buttonRadius: `${theme.elementRadius}px`,
    logo: theme.emailLogo,
    footer: theme.emailFooter.trim(),
  };
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');

interface SampleCopy {
  subject: string;
  greeting: string;
  intro: string;
  instruction?: string;
  button?: string;
  code?: string;
  session?: { ipLabel: string; ip: string; deviceLabel: string; device: string };
  success?: string;
  note?: string;
  footer?: string;
}

function sampleCopy(template: EmailTemplateId, appName: string): SampleCopy {
  const safeApp = `<strong>${escapeHtml(appName)}</strong>`;
  const user = '<strong>alex</strong>';
  const server = '<strong>Survival SMP</strong>';

  switch (template) {
    case 'account_created':
      return {
        subject: 'Account Created',
        greeting: 'Hello,',
        intro: `You are receiving this email because an account was created for you on ${safeApp}.`,
        instruction: 'Please click the button below to securely set your password and access your account:',
        button: 'Set Your Password',
        note: '<strong>Note:</strong> For security reasons, this link will expire in <strong>20 minutes</strong>.',
        footer: 'If you did not request this account, you can safely ignore this email.',
      };
    case 'password_reset':
      return {
        subject: 'Password Reset',
        greeting: `Hello ${user},`,
        intro: `We received a request to reset the password for your account on ${safeApp}.`,
        instruction: 'If you made this request, please click the button below to choose a new password:',
        button: 'Reset Password',
        note: '<strong>Note:</strong> This link will expire in <strong>20 minutes</strong>.',
        footer:
          'If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.',
      };
    case 'email_verification':
      return {
        subject: 'Verify Your Email',
        greeting: `Hello ${user},`,
        intro: `Please confirm that <strong>alex@example.com</strong> belongs to you to finish setting up your account on ${safeApp}.`,
        button: 'Verify Email',
        note: '<strong>Note:</strong> This link will expire in <strong>24 hours</strong>.',
        footer:
          'If you did not create this account or request this change, please ignore this email. Nothing will be changed.',
      };
    case 'two_factor_code':
      return {
        subject: 'Your Login Code',
        greeting: `Hello ${user},`,
        intro: `Use the code below to finish signing in to ${safeApp}.`,
        code: '482916',
        note: '<strong>Note:</strong> This code will expire in <strong>10 minutes</strong> and can only be used once.',
        footer:
          'If you did not try to sign in, someone else may know your password. We recommend changing it as soon as possible.',
      };
    case 'session_created':
      return {
        subject: 'New Session Created',
        greeting: `Hello ${user},`,
        intro: `Your account was just signed in to on ${safeApp}.`,
        session: {
          ipLabel: 'IP Address',
          ip: '203.0.113.42',
          deviceLabel: 'Device',
          device: 'Firefox 136 on Linux',
        },
        button: 'Review Sessions',
        note: '<strong>Note:</strong> If this was you, no action is needed. You can revoke any session you do not recognize from your account settings.',
        footer:
          'If you did not sign in, someone else may know your password. We recommend changing it as soon as possible.',
      };
    case 'connection_test':
      return {
        subject: 'Connection Test',
        greeting: 'Hello,',
        intro: `You are receiving this email because an administrator on ${safeApp} requested a test message to verify the system's outbound mail settings.`,
        success: '🎉 Success! The email connection works.',
        footer: 'This is an automated test message from your application. No further action is required.',
      };
    case 'added_to_server':
      return {
        subject: 'Added to Server',
        greeting: 'Hello,',
        intro: `You are receiving this email because you have been added as a subuser on ${server}.`,
        instruction: 'Click the button below to access the server:',
        button: 'Access Server',
      };
    case 'removed_from_server':
      return {
        subject: 'Removed from Server',
        greeting: 'Hello,',
        intro: `You are receiving this email because you have been removed as a subuser from ${server}.`,
        footer:
          "There is no action required on your side. If you believe this was a mistake, please contact the server's administrator for more information.",
      };
    case 'server_installed':
      return {
        subject: 'Server Installed',
        greeting: 'Hello,',
        intro: `You are receiving this email because your server, ${server}, has finished its installation.`,
        instruction: 'Click the button below to access the server:',
        button: 'Access Server',
      };
    case 'server_restored':
      return {
        subject: 'Server Restored',
        greeting: 'Hello,',
        intro: `You are receiving this email because your server, ${server}, has finished its restoration from a backup.`,
        instruction: 'Click the button below to access the server:',
        button: 'Access Server',
      };
  }
}

/**
 * Renders a standalone HTML document previewing `template` with the live draft's resolved email palette.
 * Mirrors the Lagom-inspired layout and inline styles of `backend/mails/*.html`.
 */
export function renderEmailPreviewHtml(
  template: EmailTemplateId,
  theme: NebulaTheme,
  appName: string,
  appUrl = 'https://panel.example.com',
): string {
  const p = resolveEmailPalette(theme);
  const name = appName.trim() || 'Calagopus';
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(appUrl || 'https://panel.example.com');
  const copy = sampleCopy(template, name);
  const safeSubject = escapeHtml(copy.subject);
  const hasNote = Boolean(copy.note);

  const logoBlock = p.logo
    ? `<img src="${escapeHtml(p.logo)}" alt="${safeName}" width="28" height="28" style="display: inline-block; width: 28px; height: 28px; object-fit: contain; vertical-align: middle; margin-right: 10px; border-radius: ${p.buttonRadius};" />`
    : '';

  const sessionBlock = copy.session
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px; background-color: ${p.surfaceRaised}; border: 1px solid ${p.border}; border-radius: ${p.buttonRadius};">
        <tr>
          <td style="padding: 14px 20px; font-size: 14px; font-weight: 600; color: ${p.text}; border-bottom: 1px solid ${p.border};">${safeName} &mdash; ${safeSubject}</td>
        </tr>
        <tr>
          <td style="padding: 18px 20px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: ${p.muted};">
              ${escapeHtml(copy.session.ipLabel)}:
              <strong style="color: ${p.text}; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">${escapeHtml(copy.session.ip)}</strong>
            </p>
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: ${p.muted}; word-break: break-word;">
              ${escapeHtml(copy.session.deviceLabel)}:
              <strong style="color: ${p.text};">${escapeHtml(copy.session.device)}</strong>
            </p>
          </td>
        </tr>
      </table>`
    : '';

  const codeBlock = copy.code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background-color: ${p.surfaceRaised}; border: 1px solid ${p.border}; border-radius: ${p.buttonRadius};">
        <tr>
          <td style="padding: 13px 20px; font-size: 13px; font-weight: 600; color: ${p.muted}; border-bottom: 1px solid ${p.border};">${safeSubject}</td>
        </tr>
        <tr>
          <td align="center" style="padding: 24px 20px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: ${p.text};">${escapeHtml(copy.code)}</td>
        </tr>
      </table>`
    : '';

  const buttonBlock = copy.button
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hasNote ? ' style="margin-bottom: 24px;"' : ''}>
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background-color: ${p.accent}; border-radius: ${p.buttonRadius};">
                  <a href="#preview" style="display: inline-block; padding: 14px 32px; color: ${p.accentText}; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: ${p.buttonRadius};">${escapeHtml(copy.button)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : '';

  const successBlock = copy.success
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${p.surfaceRaised}; border: 1px solid ${p.border}; border-radius: ${p.buttonRadius}; overflow: hidden;">
        <tr>
          <td style="padding: 14px 20px; font-size: 14px; font-weight: 600; color: ${p.text}; border-bottom: 1px solid ${p.border};">${safeName} &mdash; ${safeSubject}</td>
        </tr>
        <tr>
          <td style="padding: 18px 20px; background-color: ${p.successBg};">
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${p.successText};">${escapeHtml(copy.success)}</p>
          </td>
        </tr>
      </table>`
    : '';

  const noteBlock = copy.note
    ? `<p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${p.muted}; text-align: center;">${copy.note}</p>`
    : '';

  const bottomLines = [
    copy.footer
      ? `<p style="margin: 0${p.footer ? ' 0 6px 0' : ''}; font-size: 12px; line-height: 1.6; color: ${p.muted};">${copy.footer}</p>`
      : '',
    p.footer
      ? `<p style="margin: 0; font-size: 12px; line-height: 1.6; color: ${p.muted};">${escapeHtml(p.footer)}</p>`
      : '',
  ].filter(Boolean);

  const bottomFooterRow = bottomLines.length
    ? `<tr>
        <td colspan="2" style="padding: 18px 4px 0 4px; border-top: 1px solid ${p.border};">
          ${bottomLines.join('')}
        </td>
      </tr>`
    : '';

  const introMargin =
    copy.instruction || copy.session || copy.code || copy.success ? '24px' : copy.button ? '28px' : '0';
  const cardBottomPadding = hasNote ? '36px' : '40px';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="${p.colorScheme}" />
    <meta name="supported-color-schemes" content="${p.colorScheme}" />
    <title>${safeName} - ${safeSubject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${p.bg}; color: ${p.body}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${p.bg}; min-height: 100vh;">
      <tr>
        <td align="center" valign="top" style="padding: 40px 16px 48px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
            <tr>
              <td align="left" valign="middle" style="padding: 0 4px 20px 4px;">
                <a href="${safeUrl}" style="text-decoration: none; color: ${p.text};">
                  ${logoBlock}
                  <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.025em; color: ${p.text}; vertical-align: middle;">${safeName}</span>
                </a>
              </td>
              <td align="right" valign="middle" style="padding: 0 4px 20px 4px;">
                <span style="font-size: 13px; font-weight: 500; color: ${p.muted};">${safeSubject}</span>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: ${p.surface}; border: 1px solid ${p.border}; border-radius: ${p.radius}; box-shadow: ${p.shadow}; overflow: hidden;">
            <tr>
              <td style="height: 4px; background-color: ${p.accent}; background-image: linear-gradient(90deg, ${p.accent}, ${p.highlight}); font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding: 40px 44px ${cardBottomPadding} 44px;">
                <h1 style="margin: 0 0 18px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.3; color: ${p.text};">${copy.greeting}</h1>
                <p style="margin: 0 0 ${introMargin} 0; font-size: 15px; line-height: 1.65; color: ${p.body};">${copy.intro}</p>
                ${copy.instruction ? `<p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.65; color: ${p.body}; text-align: center;">${copy.instruction}</p>` : ''}
                ${sessionBlock}
                ${codeBlock}
                ${buttonBlock}
                ${successBlock}
                ${noteBlock}
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
            <tr>
              <td align="left" valign="middle" style="padding: 26px 4px 18px 4px;">
                <a href="${safeUrl}" style="font-size: 15px; font-weight: 600; color: ${p.accent}; text-decoration: none;">${safeName}</a>
              </td>
              <td align="right" valign="middle" style="padding: 26px 4px 18px 4px;">
                <a href="${safeUrl}" style="font-size: 12px; color: ${p.muted}; text-decoration: none;">${safeUrl}</a>
              </td>
            </tr>
            ${bottomFooterRow}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
