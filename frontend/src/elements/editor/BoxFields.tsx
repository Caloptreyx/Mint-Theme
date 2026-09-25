import { faMicrochip } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import { BOX_STYLES, type BoxStyle, type NebulaTheme, STAT_STYLES, type StatStyle } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

// the title row of core's TitleCard as each style paints it (buildCss); 'default' is core's own band and line
const BOX_HEAD: Record<BoxStyle, string> = {
  default:
    'border-b border-(--mantine-color-default-border) bg-(--mantine-color-default) light:bg-(--mantine-color-gray-0)',
  line: 'border-b border-(--mantine-color-default-border)',
  fill: 'bg-(--mantine-color-blue-light) text-(--mantine-color-blue-light-color)',
  pill: 'pt-1',
};

/** A titled card holding a labelled input and a small button. */
function BoxMock({ style, title, label, button }: { style: BoxStyle; title: string; label: string; button: string }) {
  return (
    <div className='flex size-full flex-col overflow-hidden rounded-(--mantine-radius-md) border border-(--mantine-color-default-border) bg-(--nebula-card)'>
      <div className={`flex h-4 shrink-0 items-center px-2 ${BOX_HEAD[style]}`}>
        <span
          className={`text-[8px] font-semibold leading-none ${
            style === 'pill'
              ? 'rounded-full bg-(--mantine-color-blue-light) px-1.5 py-0.5 text-(--mantine-color-blue-light-color)'
              : ''
          }`}
        >
          {title}
        </span>
      </div>
      <div className='flex flex-1 items-end gap-1.5 px-2 pb-1.5'>
        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <span className='truncate text-[7px] leading-none text-(--mantine-color-dimmed)'>{label}</span>
          <span className='h-2.5 rounded-[3px] border border-(--mantine-color-default-border)' />
        </div>
        <span className='rounded-[3px] bg-(--mantine-color-blue-filled) px-1.5 py-0.5 text-[7px] leading-none text-(--mantine-primary-color-contrast)'>
          {button}
        </span>
      </div>
    </div>
  );
}

/** Core's stat tile: a filled icon square beside the label and value, or the bare glyph by the label. */
function StatMock({ style, label }: { style: StatStyle; label: string }) {
  const reversed = style === 'reversed' || style === 'minimalReversed';
  const minimal = style === 'minimal' || style === 'minimalReversed';

  return (
    <div
      className={`flex w-full items-center gap-2 rounded-(--mantine-radius-md) border border-(--mantine-color-default-border) bg-(--nebula-card) p-2 ${
        reversed ? 'flex-row-reverse' : ''
      }`}
    >
      {minimal ? (
        <FontAwesomeIcon
          icon={faMicrochip}
          className='self-start mt-px text-[10px] text-(--mantine-color-blue-filled)'
        />
      ) : (
        <span className='flex size-7 shrink-0 items-center justify-center rounded-(--mantine-radius-md) bg-(--mantine-color-blue-filled) text-xs text-(--mantine-color-white)'>
          <FontAwesomeIcon icon={faMicrochip} />
        </span>
      )}
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-[8px] font-bold leading-tight text-(--mantine-color-dimmed)'>{label}</span>
        <span className='text-xs font-bold leading-tight'>42%</span>
      </div>
    </div>
  );
}

/** Components section: the title row of titled cards and core's stat tiles. */
export default function BoxFields({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const title = t('editor.boxes.mockTitle', {});
  const label = t('editor.boxes.mockLabel', {});
  const button = t('editor.boxes.mockButton', {});
  const stat = t('editor.boxes.mockStat', {});

  return (
    <Stack gap='xl'>
      <Stack gap='md'>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t('editor.boxes.title', {})}
        </Text>
        <ChoiceCards
          label={t('editor.boxes.boxStyle', {})}
          description={t('editor.boxes.boxStyleDescription', {})}
          value={theme.boxStyle}
          choices={BOX_STYLES.map((style) => ({
            value: style,
            label: t(`editor.boxes.styles.${style}`, {}),
            preview: <BoxMock style={style} title={title} label={label} button={button} />,
          }))}
          onChange={(boxStyle) => set({ boxStyle })}
        />
      </Stack>
      <Stack gap='md'>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t('editor.boxes.statsTitle', {})}
        </Text>
        <ChoiceCards
          label={t('editor.boxes.statStyle', {})}
          description={t('editor.boxes.statStyleDescription', {})}
          value={theme.statStyle}
          choices={STAT_STYLES.map((style) => ({
            value: style,
            label: t(`editor.boxes.stats.${style}`, {}),
            preview: <StatMock style={style} label={stat} />,
          }))}
          onChange={(statStyle) => set({ statStyle })}
        />
      </Stack>
    </Stack>
  );
}
