import { faFileArrowUp, faFloppyDisk, faPen, faTrash, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { createPreset, deletePreset, getPresets, updatePreset } from '../../api/library.ts';
import { setChoicesFromLibrary } from '../../lib/apply.ts';
import {
  ActionIcon,
  Button,
  Card,
  ConfirmationModal,
  Group,
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
import { useCanSaveTheme } from '../../lib/permissions.ts';
import { type NebulaTheme, normalizeTheme, PRESETS, pickUserTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
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
  users,
  disabled,
  blocked,
  onApply,
  onUsers,
  children,
}: {
  name: string;
  theme: Partial<NebulaTheme>;
  users: boolean;
  disabled: boolean;
  /** Why the user may not change presets, or null. */
  blocked: string | null;
  onApply: () => void;
  onUsers: (users: boolean) => void;
  children?: React.ReactNode;
}) {
  const { t } = useExtTranslations();

  return (
    <Card hoverable p='sm'>
      <UnstyledButton
        aria-label={t('library.apply', { name })}
        onClick={onApply}
        className='flex items-center justify-between gap-2 w-full text-left'
      >
        <Text fw={600} truncate>
          {name}
        </Text>
        <Swatches theme={theme} />
      </UnstyledButton>
      <Group justify='space-between' wrap='nowrap' mt='xs' gap='xs'>
        <Tooltip label={blocked} disabled={!blocked}>
          <Switch
            size='xs'
            label={t('library.users', {})}
            checked={users}
            disabled={disabled || !!blocked}
            onChange={(e) => onUsers(e.currentTarget.checked)}
          />
        </Tooltip>
        {children && (
          <Group gap={2} wrap='nowrap'>
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

  return (
    <Stack gap='md'>
      {blocked && (
        <Text size='xs' c='dimmed'>
          {blocked}
        </Text>
      )}
      <Tooltip label={blocked} disabled={!blocked} innerClassName='w-full'>
        <Button
          variant='light'
          fullWidth
          leftSection={<FontAwesomeIcon icon={faFloppyDisk} />}
          disabled={!library || full || !!blocked}
          onClick={() => setCreating(true)}
        >
          {t('library.saveAsPreset', {})}
        </Button>
      </Tooltip>
      {full && (
        <Text size='xs' c='dimmed'>
          {t('library.limit', { max: MAX_CUSTOM_PRESETS })}
        </Text>
      )}

      {library && (
        <Stack gap='xs'>
          <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
            {t('library.custom', {})}
          </Text>
          {library.custom.length === 0 && (
            <Text size='sm' c='dimmed'>
              {t('library.empty', {})}
            </Text>
          )}
          {library.custom.map((preset) => (
            <PresetCard
              key={preset.id}
              name={preset.name}
              theme={preset.theme}
              users={preset.users}
              disabled={busy}
              blocked={blocked}
              onApply={() => set(pickUserTheme(preset.theme))}
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
          ))}
        </Stack>
      )}

      <Stack gap='xs'>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t('library.builtin', {})}
        </Text>
        {PRESETS.map((preset) => {
          const id = builtinId(preset.name);
          return (
            <PresetCard
              key={id}
              name={preset.name}
              theme={preset.theme}
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

      <Text size='xs' c='dimmed'>
        {t('library.saveAsPresetDescription', {})}
      </Text>

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
