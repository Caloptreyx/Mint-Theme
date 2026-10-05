import { Stack, Text, useGlobalStore } from '../../lib/core.ts';
import { type NebulaTheme, SAFE_URL } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import UrlInput from './UrlInput.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

/** `favicon`, with a browser tab mock showing it (or the panel's own icon while it is empty) beside the panel's name. */
export default function FaviconField({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const app = useGlobalStore((state) => state.settings.app);
  const icon = SAFE_URL.test(theme.favicon) ? theme.favicon : app.icon;

  return (
    <Stack gap='xs'>
      <UrlInput
        label={t('editor.favicon.label', {})}
        description={t('editor.favicon.description', {})}
        value={theme.favicon}
        onChange={(favicon) => set({ favicon })}
      />
      <div aria-label={t('editor.favicon.preview', {})} className='flex items-end gap-3'>
        <div className='flex max-w-56 min-w-0 items-center gap-2 rounded-t-md border border-b-0 border-(--mantine-color-default-border) bg-(--mantine-color-default) px-3 py-1.5'>
          <img src={icon} alt='' className='size-4 shrink-0 object-contain' />
          <Text size='xs' truncate>
            {app.name}
          </Text>
        </div>
        <img
          src={icon}
          alt=''
          className='size-8 rounded-md border border-(--mantine-color-default-border) object-contain'
        />
      </div>
    </Stack>
  );
}
