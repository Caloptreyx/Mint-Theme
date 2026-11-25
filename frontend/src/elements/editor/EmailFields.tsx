import { faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ColorInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { getEmailTemplates, setEmailTemplates } from '../../api/emailTemplates.ts';
import {
  ActionIcon,
  Alert,
  Button,
  ConfirmationModal,
  httpErrorToHuman,
  Stack,
  Switch,
  Text,
  TextInput,
  useAdminCan,
  useToast,
} from '../../lib/core.ts';
import { toHexColor } from '../../lib/editorDraft.ts';
import { type EmailTemplatesStatus, resolveEmailPalette, templatesWithoutMint } from '../../lib/email.ts';
import { EMAIL_THEMES, type EmailTheme, MAX_EMAIL_FOOTER, type NebulaTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';
import UrlInput from './UrlInput.tsx';

const HEX = /^#[0-9a-f]{6}$/i;

type EmailColorKey = 'emailBackground' | 'emailSurface' | 'emailText' | 'emailAccent' | 'emailAccentText';

const CUSTOM_COLORS: { key: EmailColorKey; fallbackKey: 'bg' | 'surface' | 'text' | 'accent' | 'accentText' }[] = [
  { key: 'emailBackground', fallbackKey: 'bg' },
  { key: 'emailSurface', fallbackKey: 'surface' },
  { key: 'emailText', fallbackKey: 'text' },
  { key: 'emailAccent', fallbackKey: 'accent' },
  { key: 'emailAccentText', fallbackKey: 'accentText' },
];

interface Props {
  theme: NebulaTheme;
  valid: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

/** Tiny Lagom-style email card mock drawn with the resolved palette of `mode`. */
function EmailMock({ valid, mode }: { valid: NebulaTheme; mode: EmailTheme }) {
  const palette = resolveEmailPalette({ ...valid, emailTheme: mode });
  return (
    <div
      className='flex size-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-sm border border-(--mantine-color-default-border) p-1.5'
      style={{ backgroundColor: palette.bg }}
    >
      <div className='flex w-full max-w-12 items-center justify-between px-0.5'>
        <span className='h-0.5 w-3 rounded-full' style={{ backgroundColor: palette.text }} />
        <span className='h-0.5 w-2 rounded-full opacity-60' style={{ backgroundColor: palette.muted }} />
      </div>
      <div
        className='flex w-full max-w-12 flex-col overflow-hidden rounded-[3px]'
        style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}
      >
        <span
          className='h-[2px] w-full'
          style={{
            backgroundColor: palette.accent,
            backgroundImage: `linear-gradient(90deg, ${palette.accent}, ${palette.highlight})`,
          }}
        />
        <div className='flex flex-col gap-0.5 p-1'>
          <span className='h-1 w-4 rounded-full' style={{ backgroundColor: palette.text }} />
          <span className='h-0.5 w-7 rounded-full opacity-70' style={{ backgroundColor: palette.body }} />
          <span className='mx-auto mt-0.5 h-1.5 w-5 rounded-[2px]' style={{ backgroundColor: palette.accent }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Emails section: the opt-in switch for Mint's templates (applied at once, not part of the draft), the notice for
 * templates not using Mint's layout, then the sync toggle, palette picker, custom colours, logo and footer.
 */
export default function EmailFields({ theme, valid, set }: Props) {
  const { t } = useExtTranslations();
  const { addToast } = useToast();
  const canUpdateTemplates = useAdminCan('email-templates.update');
  const customDefaults = resolveEmailPalette({ ...valid, emailTheme: 'custom' });
  const [status, setStatus] = useState<EmailTemplatesStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let active = true;
    getEmailTemplates()
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {
        if (active) setStatusFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const enabled = status?.enabled ?? false;
  const withoutMint = status ? templatesWithoutMint(status) : [];
  const withoutMintLabels = withoutMint.map((id) => t(`editor.email.templates.${id}`, {}));

  const toggle = (next: boolean) => {
    setToggling(true);
    setEmailTemplates(next)
      .then((updated) => {
        setStatus(updated);
        addToast(t(updated.enabled ? 'editor.email.enabledOn' : 'editor.email.enabledOff', {}), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setToggling(false));
  };

  const doUseMintLayout = () => {
    setResetting(true);
    setEmailTemplates(true, true)
      .then((updated) => {
        setStatus(updated);
        setConfirmReset(false);
        addToast(t('editor.email.overridesResetDone', {}), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setResetting(false));
  };

  return (
    <Stack gap='xl'>
      <Stack gap='xs'>
        <Switch
          label={t('editor.email.enabled', {})}
          description={t('editor.email.enabledDescription', {})}
          checked={enabled}
          disabled={!status || toggling || !canUpdateTemplates}
          onChange={(e) => toggle(e.currentTarget.checked)}
        />
        {statusFailed && (
          <Text size='xs' c='red'>
            {t('editor.email.statusFailed', {})}
          </Text>
        )}
        {status && !canUpdateTemplates && (
          <Text size='xs' c='dimmed'>
            {t('editor.email.enabledNoPermission', {})}
          </Text>
        )}
      </Stack>

      {status && !enabled && (
        <Alert color='blue'>
          <Text size='xs'>{t('editor.email.offNotice', {})}</Text>
        </Alert>
      )}

      {withoutMint.length > 0 && (
        <Alert color='yellow' title={t('editor.email.overridesTitle', {})}>
          <Stack gap='xs' align='flex-start'>
            <Text size='xs'>{t('editor.email.overridesDescription', { templates: withoutMintLabels.join(', ') })}</Text>
            {canUpdateTemplates && (
              <Button
                size='xs'
                variant='light'
                color='yellow'
                loading={resetting}
                onClick={() => setConfirmReset(true)}
              >
                {t('editor.email.overridesReset', {})}
              </Button>
            )}
          </Stack>
        </Alert>
      )}

      <Switch
        label={t('editor.email.sync', {})}
        description={t('editor.email.syncDescription', {})}
        checked={theme.emailSync}
        onChange={(e) => set({ emailSync: e.currentTarget.checked })}
      />

      <div inert={!theme.emailSync} className={`flex flex-col gap-6 ${theme.emailSync ? '' : 'opacity-50'}`}>
        <ChoiceCards
          label={t('editor.email.theme', {})}
          description={t('editor.email.themeDescription', {})}
          columns={3}
          value={theme.emailTheme}
          choices={EMAIL_THEMES.map((mode) => ({
            value: mode,
            label: t(`editor.email.themes.${mode}`, {}),
            preview: <EmailMock valid={valid} mode={mode} />,
          }))}
          onChange={(value) => set({ emailTheme: value })}
        />

        {theme.emailTheme === 'custom' && (
          <Stack gap='xs'>
            <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
              {t('editor.email.customColorsTitle', {})}
            </Text>
            {CUSTOM_COLORS.map(({ key, fallbackKey }) => (
              <ColorInput
                key={key}
                label={t(`editor.email.colors.${key}`, {})}
                description={!theme[key] ? t('editor.derived', {}) : undefined}
                value={theme[key] || customDefaults[fallbackKey]}
                error={theme[key] && !HEX.test(theme[key]) ? t('editor.colorInvalid', {}) : undefined}
                onChange={(value) => set({ [key]: value })}
                onBlur={() => {
                  const hex = toHexColor(theme[key]);
                  if (hex && hex !== theme[key]) set({ [key]: hex });
                }}
                rightSection={
                  theme[key] ? (
                    <ActionIcon
                      variant='subtle'
                      color='gray'
                      aria-label={t('editor.clearColor', {})}
                      onClick={() => set({ [key]: '' })}
                    >
                      <FontAwesomeIcon icon={faRotateLeft} />
                    </ActionIcon>
                  ) : undefined
                }
              />
            ))}
          </Stack>
        )}

        <Stack gap='md'>
          <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
            {t('editor.email.brandingTitle', {})}
          </Text>
          <UrlInput
            label={t('editor.email.logo', {})}
            description={t('editor.email.logoDescription', {})}
            value={theme.emailLogo}
            onChange={(emailLogo) => set({ emailLogo })}
          />
          <TextInput
            label={t('editor.email.footer', {})}
            description={t('editor.email.footerDescription', { max: MAX_EMAIL_FOOTER })}
            maxLength={MAX_EMAIL_FOOTER}
            value={theme.emailFooter}
            onChange={(e) => set({ emailFooter: e.target.value })}
          />
        </Stack>
      </div>

      <Text size='xs' c='dimmed'>
        {t('editor.email.adminHint', {})}
      </Text>

      <ConfirmationModal
        opened={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirmed={doUseMintLayout}
        title={t('editor.email.overridesResetTitle', {})}
        confirm={t('editor.email.overridesReset', {})}
      >
        {t('editor.email.overridesResetConfirm', { templates: withoutMintLabels.join(', ') })}
      </ConfirmationModal>
    </Stack>
  );
}
