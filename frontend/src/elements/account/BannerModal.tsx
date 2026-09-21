import { useRef, useState } from 'react';
import AvatarEditor, { type AvatarEditorRef } from 'react-avatar-editor';
import { axiosInstance, httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/Button.tsx';
import Group from '@/elements/Group.tsx';
import FileInput from '@/elements/input/FileInput.tsx';
import { Modal } from '@/elements/modals/Modal.tsx';
import Stack from '@/elements/Stack.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useExtTranslations } from '../../translations.ts';

export const BANNER_API = '/api/client/extensions/dev.s4way.nebula/banner';

// the backend crops to the same size, doing it here keeps the upload small and lets the user pick the spot
const WIDTH = 1500;
const HEIGHT = 500;

interface Props {
  opened: boolean;
  onClose: () => void;
  /** CSS background of the banner shown now, previewed until a file is picked. */
  preview: string;
  onSaved: (url: string) => void;
}

/** Upload and position a banner, the same way core's avatar card works. */
export default function BannerModal({ opened, onClose, preview, onSaved }: Props) {
  const { t } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const editor = useRef<AvatarEditorRef>(null);

  const close = () => {
    setFile(null);
    onClose();
  };

  const save = () => {
    editor.current?.getImageScaledToCanvas().toBlob(
      (blob) => {
        if (!blob) return;
        setSaving(true);
        axiosInstance
          .put<{ banner: string }>(BANNER_API, blob, { headers: { 'Content-Type': blob.type } })
          .then(({ data }) => {
            onSaved(data.banner);
            close();
          })
          .catch((err) => addToast(httpErrorToHuman(err), 'error'))
          .finally(() => setSaving(false));
      },
      'image/webp',
      0.9,
    );
  };

  return (
    <Modal opened={opened} onClose={close} title={tExt('account.changeBanner', {})} size='xl'>
      <Stack>
        {file ? (
          <AvatarEditor
            key={`${file.name}-${file.lastModified}`}
            ref={editor}
            image={file}
            width={WIDTH}
            height={HEIGHT}
            border={0}
            onLoadFailure={() => {
              addToast(t('pages.account.account.containers.avatar.toast.loadFailed', {}), 'error');
              setFile(null);
            }}
            style={{ width: '100%', height: 'auto', borderRadius: '0.25rem' }}
          />
        ) : (
          <div className='aspect-[3/1] rounded-sm bg-cover bg-center' style={{ backgroundImage: preview }} />
        )}

        <FileInput
          label={tExt('account.bannerFile', {})}
          description={tExt('account.bannerHint', {})}
          accept='image/png,image/jpeg,image/webp,image/gif'
          value={file}
          onChange={setFile}
          disabled={saving}
          clearable
        />

        <Group justify='flex-end'>
          <Button variant='default' onClick={close}>
            {t('common.button.cancel', {})}
          </Button>
          <Button disabled={!file} loading={saving} onClick={save}>
            {t('common.button.save', {})}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
