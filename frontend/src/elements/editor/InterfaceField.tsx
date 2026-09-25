import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { CSSProperties } from 'react';
import Switch from '@/elements/input/Switch.tsx';
import Stack from '@/elements/Stack.tsx';
import {
  type NebulaTheme,
  PAGE_ANIMATIONS,
  PAGE_TRANSITIONS,
  type PageTransition,
  TOAST_STYLES,
} from '../../lib/theme.ts';
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

/** A page beside the sidebar; hovering plays the transition on the page, three times slower so it reads this small. */
function TransitionMock({ transition }: { transition: PageTransition }) {
  const animation = transition === 'none' ? null : PAGE_ANIMATIONS[transition];

  return (
    <div className='group/page flex size-full gap-1'>
      <span className='w-4 shrink-0 rounded-sm bg-(--nebula-card)' />
      <div
        className={`flex flex-1 flex-col gap-1 ${animation ? 'motion-safe:group-hover/page:animate-(--nebula-mock)' : ''}`}
        style={
          animation
            ? ({ '--nebula-mock': `${animation.keyframes} ${animation.ms * 3}ms ${animation.easing}` } as CSSProperties)
            : undefined
        }
      >
        <span className='h-1.5 w-1/2 rounded-full bg-(--mantine-color-text)' />
        <span className='flex-1 rounded-sm bg-(--nebula-card)' />
        <span className='flex-1 rounded-sm bg-(--nebula-card)' />
      </div>
    </div>
  );
}

/** Toasts, page transitions and page titles. */
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
      <ChoiceCards
        label={t('editor.interface.pageTransition', {})}
        description={t('editor.interface.pageTransitionDescription', {})}
        value={theme.pageTransition}
        choices={PAGE_TRANSITIONS.map((transition) => ({
          value: transition,
          label: t(`editor.interface.transitions.${transition}`, {}),
          preview: <TransitionMock transition={transition} />,
        }))}
        onChange={(pageTransition) => set({ pageTransition })}
      />
      <Switch
        label={t('editor.interface.pageTitles', {})}
        description={t('editor.interface.pageTitlesDescription', {})}
        checked={theme.pageTitles}
        onChange={(e) => set({ pageTitles: e.currentTarget.checked })}
      />
    </Stack>
  );
}
