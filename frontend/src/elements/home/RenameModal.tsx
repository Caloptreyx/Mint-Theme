import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState } from 'react';
import type { z } from 'zod';
import { httpErrorToHuman } from '@/api/axios.ts';
import renameServer from '@/api/server/settings/renameServer.ts';
import Button from '@/elements/Button.tsx';
import Group from '@/elements/Group.tsx';
import TextArea from '@/elements/input/TextArea.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import { Modal } from '@/elements/modals/Modal.tsx';
import Stack from '@/elements/Stack.tsx';
import { serverSettingsRenameSchema } from '@/lib/schemas/server/settings.ts';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';

type Values = z.infer<typeof serverSettingsRenameSchema>;

export default function RenameModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslations();
  const { addToast } = useToast();
  const server = useServerStore((s) => s.server);
  const updateServer = useServerStore((s) => s.updateServer);
  const [loading, setLoading] = useState(false);

  const form = useForm<Values>({
    initialValues: { name: server.name, description: server.description },
    validateInputOnBlur: true,
    validate: zod4Resolver(serverSettingsRenameSchema),
  });

  const doRename = () => {
    setLoading(true);
    renameServer(server.uuid, serverSettingsRenameSchema.parse(form.values))
      .then(() => {
        addToast(t('pages.server.settings.rename.toast.renamed', {}), 'success');
        updateServer(form.values);
        onClose();
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setLoading(false));
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('pages.server.settings.rename.title', {})}>
      <form onSubmit={form.onSubmit(doRename)}>
        <Stack>
          <TextInput withAsterisk label={t('common.form.serverName', {})} {...form.getInputProps('name')} />
          <TextArea label={t('common.form.description', {})} rows={3} {...form.getInputProps('description')} />
          <Group justify='flex-end'>
            <Button variant='default' onClick={onClose}>
              {t('common.button.cancel', {})}
            </Button>
            <Button type='submit' loading={loading} disabled={!form.isValid()}>
              {t('common.button.save', {})}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
