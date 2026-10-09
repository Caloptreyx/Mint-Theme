import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Stack, Switch } from '../../lib/core.ts';
import { type NebulaTheme, TOAST_STYLES } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

/** Core's toast (a card with Mantine's colour bar) or the glassy one: tinted glass, an icon tile, a countdown bar. */
function ToastMock({ glassy }: { glassy: boolean }) {
  const lines = (
    <div className='flex flex-1 flex-col gap-1'>
      <span className='h-1 w-3/4 rounded-full bg-(--mantine-color-text)' />
      <span className='h-1 w-1/2 rounded-full bg-(--mantine-color-dimmed)' />
    </div>
  );

  return glassy ? (
    <div className='relative flex w-full items-center gap-2 overflow-hidden rounded-(--mantine-radius-md) border border-(--mantine-color-green-filled)/40 bg-(--mantine-color-green-filled)/15 p-2'>
      <span className='flex size-5 shrink-0 items-center justify-center rounded-(--mantine-radius-sm) bg-(--mantine-color-green-filled) text-[10px] text-white'>
        <FontAwesomeIcon icon={faCheck} />
      </span>
      {lines}
      <span className='absolute bottom-0 left-0 h-0.5 w-2/3 bg-(--mantine-color-green-filled)' />
    </div>
  ) : (
    <div className='relative flex w-full items-center overflow-hidden rounded-(--mantine-radius-md) bg-(--nebula-card) py-2 pr-2 pl-4 shadow-md'>
      <span className='absolute top-1.5 bottom-1.5 left-1 w-1 rounded-full bg-(--mantine-color-green-filled)' />
      {lines}
    </div>
  );
}

/** Toasts, page titles and the phone file editor. */
export default function InterfaceField({ theme, set }: Props) {
  const { t } = useExtTranslations();

  return (
    <Stack gap='lg'>
      <ChoiceCards
        label={t('editor.interface.toastStyle', {})}
        description={t('editor.interface.toastStyleDescription', {})}
        value={theme.toastStyle}
        choices={TOAST_STYLES.map((style) => ({
          value: style,
          label: t(`editor.interface.toasts.${style}`, {}),
          preview: <ToastMock glassy={style === 'glassy'} />,
        }))}
        onChange={(toastStyle) => set({ toastStyle })}
      />
      <Switch
        label={t('editor.interface.pageTitles', {})}
        description={t('editor.interface.pageTitlesDescription', {})}
        checked={theme.pageTitles}
        onChange={(e) => set({ pageTitles: e.currentTarget.checked })}
      />
      <Switch
        label={t('editor.interface.mobileEditor', {})}
        description={t('editor.interface.mobileEditorDescription', {})}
        checked={theme.mobileEditor}
        onChange={(e) => set({ mobileEditor: e.currentTarget.checked })}
      />
    </Stack>
  );
}
