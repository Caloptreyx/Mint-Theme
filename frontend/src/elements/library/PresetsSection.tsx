import {
  faFileArrowUp,
  faFloppyDisk,
  faPen,
  faShareNodes,
  faTrash,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { createPreset, deletePreset, getPresets, updatePreset } from '../../api/library.ts';
import { setChoicesFromLibrary } from '../../lib/apply.ts';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  ConfirmationModal,
  Group,
  handleRawCopyToClipboard,
  httpErrorToHuman,
  Modal,
  ModalFooter,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
  useToast,
} from '../../lib/core.ts';
import {
  builtinId,
  type CustomPreset,
  MAX_CUSTOM_PRESETS,
  PRESET_NAME_MAX,
  type PresetLibrary,
  presetNameProblem,
} from '../../lib/library.ts';
import { normalizeTheme } from '../../lib/normalize.ts';
import { useCanSaveTheme } from '../../lib/permissions.ts';
import { isFullStylePreset, PRESETS, presetMatchesTheme } from '../../lib/presets.ts';
import { type NebulaTheme, pickUserTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import { useShareCode } from './ShareCodeModal.tsx';
import Swatches from './Swatches.tsx';

function NameModal({
  opened,
  title,
  initial,
  onClose,
  onSubmit,
}: {
  opened: boolean;
  title: string;
  initial: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const { t } = useExtTranslations();
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) setName(initial);
  }, [opened, initial]);

  const problem = presetNameProblem(name);
  const submit = () => {
    if (problem) return;
    setSaving(true);
    onSubmit(name.trim())
      .then(onClose)
      .catch(() => {
        // the caller already showed the error; the modal stays open to fix the name
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <TextInput
        label={t('library.name', {})}
        value={name}
        maxLength={PRESET_NAME_MAX}
        data-autofocus
        error={name && problem ? t(`library.nameProblem.${problem}`, { max: PRESET_NAME_MAX }) : undefined}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <ModalFooter>
        <Button disabled={!!problem} loading={saving} onClick={submit}>
          {t('library.save', {})}
        </Button>
        <Button variant='default' onClick={onClose}>
          {t('library.cancel', {})}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** A preset card's icon action; `blocked` (why the user may not use it) disables it and becomes its tooltip. */
function PresetAction({
  label,
  icon,
  color = 'gray',
  blocked,
  onClick,
}: {
  label: string;
  icon: IconDefinition;
  color?: string;
  blocked: string | null;
  onClick: () => void;
}) {
  return (
    // core's Tooltip wraps its child in a span, which keeps the tooltip on a disabled button
    <Tooltip label={blocked ?? label}>
      <ActionIcon variant='subtle' color={color} size='sm' aria-label={label} disabled={!!blocked} onClick={onClick}>
        <FontAwesomeIcon icon={icon} />
      </ActionIcon>
    </Tooltip>
  );
}

function PresetCard({
  name,
  theme,
  active,
  kind,
  shareable = false,
  users,
  disabled,
  blocked,
  onApply,
  onUsers,
  children,
}: {
  name: string;
  theme: Partial<NebulaTheme>;
  active: boolean;
  /** Built-in presets show whether they only touch colours or also replace layout, typography and motion. */
  kind?: 'colours' | 'full';
  /** Built-ins stay uncluttered; custom presets keep the share code shortcut. */
  shareable?: boolean;
  users: boolean;
  disabled: boolean;
  /** Why the user may not change presets, or null. */
  blocked: string | null;
  onApply: () => void;
  onUsers: (users: boolean) => void;
  children?: React.ReactNode;
}) {
  const { t } = useExtTranslations();
  const { addToast } = useToast();
  const shareCode = useShareCode(shareable ? theme : {});

  return (
    <Card
      p='xs'
      className={
        active
          ? 'border-(--mantine-primary-color-filled)! ring-1 ring-(--mantine-primary-color-filled)/40 bg-(--mantine-primary-color-light)/15!'
          : undefined
      }
    >
      <UnstyledButton
        aria-label={t('library.apply', { name })}
        aria-pressed={active}
        onClick={onApply}
        className='group flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-1.5 py-1 -mx-1.5 -mt-1 text-left transition-colors hover:bg-(--mantine-color-default-hover) focus-visible:ring-2 focus-visible:ring-(--mantine-primary-color-filled)'
      >
        <div className='min-w-0 flex-1'>
          <Group gap={6} wrap='nowrap'>
            <Text size='sm' fw={600} truncate>
              {name}
            </Text>
            {active ? (
              <Badge size='xs' variant='light' className='shrink-0'>
                {t('library.active', {})}
              </Badge>
            ) : (
              <Badge
                size='xs'
                variant='default'
                className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'
              >
                {t('library.applyAction', {})}
              </Badge>
            )}
          </Group>
          {kind && (
            <Text
              size='xs'
              c={kind === 'full' ? undefined : 'dimmed'}
              className={
                kind === 'full'
                  ? 'text-(--mantine-primary-color-light-color) leading-tight mt-0.5'
                  : 'leading-tight mt-0.5'
              }
            >
              {kind === 'full' ? t('library.kindFull', {}) : t('library.kindColours', {})}
            </Text>
          )}
        </div>
        <Swatches theme={theme} />
      </UnstyledButton>
      <Group
        justify='space-between'
        wrap='nowrap'
        mt={6}
        pt={6}
        gap='xs'
        className='border-t border-(--mantine-color-default-border)'
      >
        <Tooltip label={blocked} disabled={!blocked}>
          <Switch
            size='xs'
            label={t('library.users', {})}
            checked={users}
            disabled={disabled || !!blocked}
            onChange={(e) => onUsers(e.currentTarget.checked)}
          />
        </Tooltip>
        {(shareable || children) && (
          <Group gap={2} wrap='nowrap'>
            {shareable && (
              <PresetAction
                label={t('share.copyCode', {})}
                icon={faShareNodes}
                blocked={null}
                onClick={() => shareCode && handleRawCopyToClipboard(shareCode, addToast)}
              />
            )}
            {children}
          </Group>
        )}
      </Group>
    </Card>
  );
}

/**
 * The editor's Presets section: the admin's own presets (full themes kept server side, applied as a look
 * over the draft) above the built-in colour sets, each with the toggle that offers it to users.
 */
export default function PresetsSection({
  theme,
  set,
}: {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}) {
  const { t } = useExtTranslations();
  const { addToast } = useToast();
  const [library, setLibrary] = useState<PresetLibrary | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<CustomPreset | null>(null);
  const [deleting, setDeleting] = useState<CustomPreset | null>(null);
  const [overwriting, setOverwriting] = useState<CustomPreset | null>(null);
  // without settings.update or mint-theme.update presets are browse and apply only
  const blocked = useCanSaveTheme() ? null : t('editor.noPermission', {});

  useEffect(() => {
    getPresets()
      .then(setLibrary)
      .catch((err) => addToast(httpErrorToHuman(err), 'error'));
  }, []);

  /** Every change answers with the stored library; a failure is shown and rethrown for the modals. */
  const run = (request: Promise<PresetLibrary>) => {
    setBusy(true);
    return request
      .then((lib) => {
        setLibrary(lib);
        // users' theme choices follow the library at once, not on the next page load
        setChoicesFromLibrary(lib);
      })
      .catch((err) => {
        addToast(httpErrorToHuman(err), 'error');
        throw err;
      })
      .finally(() => setBusy(false));
  };

  const full = (library?.custom.length ?? 0) >= MAX_CUSTOM_PRESETS;
  const offeredCount = (library?.builtin.length ?? 0) + (library?.custom.filter((preset) => preset.users).length ?? 0);

  return (
    <Stack gap='sm'>
      {blocked && (
        <Text size='xs' c='dimmed'>
          {blocked}
        </Text>
      )}

      {library && (
        <Stack gap={6}>
          <Group justify='space-between' wrap='nowrap' gap='xs'>
            <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
              {t('library.custom', {})}
            </Text>
            {library.custom.length > 0 && (
              <Tooltip label={blocked} disabled={!blocked}>
                <Button
                  size='xs'
                  variant='light'
                  leftSection={<FontAwesomeIcon icon={faFloppyDisk} />}
                  disabled={full || !!blocked}
                  onClick={() => setCreating(true)}
                >
                  {t('library.saveAsPreset', {})}
                </Button>
              </Tooltip>
            )}
          </Group>
          {library.custom.length === 0 ? (
            <Card p='xs'>
              <Stack gap='xs'>
                <Text size='xs' c='dimmed'>
                  {t('library.empty', {})} {t('library.saveAsPresetDescription', {})}
                </Text>
                <Tooltip label={blocked} disabled={!blocked} innerClassName='w-full'>
                  <Button
                    size='xs'
                    variant='light'
                    fullWidth
                    leftSection={<FontAwesomeIcon icon={faFloppyDisk} />}
                    disabled={full || !!blocked}
                    onClick={() => setCreating(true)}
                  >
                    {t('library.saveAsPreset', {})}
                  </Button>
                </Tooltip>
              </Stack>
            </Card>
          ) : (
            <>
              {full && (
                <Text size='xs' c='dimmed'>
                  {t('library.limit', { max: MAX_CUSTOM_PRESETS })}
                </Text>
              )}
              {library.custom.map((preset) => {
                const look = pickUserTheme(preset.theme);
                return (
                  <PresetCard
                    key={preset.id}
                    name={preset.name}
                    theme={preset.theme}
                    active={presetMatchesTheme(look, theme)}
                    shareable
                    users={preset.users}
                    disabled={busy}
                    blocked={blocked}
                    onApply={() => set(look)}
                    onUsers={(users) =>
                      run(updatePreset(preset.id, { users })).catch(() => {
                        // run() already showed the error
                      })
                    }
                  >
                    <PresetAction
                      label={t('library.rename', {})}
                      icon={faPen}
                      blocked={blocked}
                      onClick={() => setRenaming(preset)}
                    />
                    <PresetAction
                      label={t('library.overwrite', {})}
                      icon={faFileArrowUp}
                      blocked={blocked}
                      onClick={() => setOverwriting(preset)}
                    />
                    <PresetAction
                      label={t('library.delete', {})}
                      icon={faTrash}
                      color='red'
                      blocked={blocked}
                      onClick={() => setDeleting(preset)}
                    />
                  </PresetCard>
                );
              })}
            </>
          )}
        </Stack>
      )}

      <Stack gap={6}>
        <Group justify='space-between' wrap='nowrap' gap='xs'>
          <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
            {t('library.builtin', {})}
          </Text>
          {library && (
            <Badge size='xs' variant='light' color={offeredCount > 0 ? undefined : 'gray'}>
              {t('library.offeredCount', { count: offeredCount })}
            </Badge>
          )}
        </Group>
        <Text size='xs' c='dimmed'>
          {t('library.saveBehaviorHint', {})}
        </Text>
        {PRESETS.map((preset) => {
          const id = builtinId(preset.name);
          return (
            <PresetCard
              key={id}
              name={preset.name}
              theme={preset.theme}
              active={presetMatchesTheme(preset.theme, theme)}
              kind={isFullStylePreset(preset.theme) ? 'full' : 'colours'}
              users={library?.builtin.includes(id) ?? false}
              disabled={!library || busy}
              blocked={blocked}
              onApply={() => set(preset.theme)}
              onUsers={(users) =>
                run(updatePreset(id, { users })).catch(() => {
                  // run() already showed the error
                })
              }
            />
          );
        })}
      </Stack>

      <NameModal
        opened={creating}
        title={t('library.saveAsPreset', {})}
        initial=''
        onClose={() => setCreating(false)}
        onSubmit={(name) =>
          run(createPreset(name, normalizeTheme(theme))).then(() => addToast(t('library.created', {}), 'success'))
        }
      />
      <NameModal
        opened={!!renaming}
        title={t('library.renameTitle', {})}
        initial={renaming?.name ?? ''}
        onClose={() => setRenaming(null)}
        onSubmit={(name) => (renaming ? run(updatePreset(renaming.id, { name })) : Promise.resolve())}
      />
      <ConfirmationModal
        opened={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('library.deleteTitle', {})}
        confirm={t('library.delete', {})}
        onConfirmed={() => {
          if (!deleting) return;
          run(deletePreset(deleting.id))
            .then(() => setDeleting(null))
            .catch(() => {
              // run() already showed the error; the modal stays open
            });
        }}
      >
        {t('library.deleteConfirm', { name: deleting?.name ?? '' })}
      </ConfirmationModal>
      <ConfirmationModal
        opened={!!overwriting}
        onClose={() => setOverwriting(null)}
        title={t('library.overwriteTitle', {})}
        confirm={t('library.overwrite', {})}
        onConfirmed={() => {
          if (!overwriting) return;
          run(updatePreset(overwriting.id, { theme: normalizeTheme(theme) }))
            .then(() => {
              setOverwriting(null);
              addToast(t('library.overwritten', {}), 'success');
            })
            .catch(() => {
              // run() already showed the error; the modal stays open
            });
        }}
      >
        {t('library.overwriteConfirm', { name: overwriting?.name ?? '' })}
      </ConfirmationModal>
    </Stack>
  );
}
