import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import {
  type NebulaTheme,
  SERVER_CARD_STYLES,
  type ServerCardStyle,
  TABLE_STYLES,
  type TableStyle,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

// skeleton pieces drawn with the panel's live variables, so the tiles follow the draft
const CARD = 'overflow-hidden rounded-sm border border-(--mantine-color-default-border) bg-(--nebula-card)';
const NAME = 'h-1 rounded-full bg-(--mantine-color-text)';
const DIM = 'h-0.5 rounded-full bg-(--mantine-color-dimmed)';
const STATUS = <span className='h-1.5 w-3 shrink-0 rounded-full bg-(--mantine-color-green-filled)' />;
const EMBLEM = <span className='size-2.5 shrink-0 rounded-[2px] bg-(--mantine-color-blue-filled)' />;
const STATS = (
  <>
    <span className={`${DIM} flex-1`} />
    <span className={`${DIM} flex-1`} />
    <span className={`${DIM} flex-1`} />
  </>
);

/** A skeleton of the servers grid in one card style, the way ServerCard lays it out. */
function CardMock({ style }: { style: ServerCardStyle }) {
  if (style === 'banner') {
    return (
      <div className={`${CARD} flex size-full flex-col`}>
        <div className='h-4 shrink-0 bg-linear-to-r from-(--mantine-color-blue-filled) to-(--nebula-highlight)' />
        <div className='flex items-center gap-1 px-1.5 pt-1.5'>
          {EMBLEM}
          <span className={`${NAME} flex-1`} />
          {STATUS}
        </div>
        <div className='mt-auto flex gap-1 px-1.5 pb-1.5'>{STATS}</div>
      </div>
    );
  }

  if (style === 'flat') {
    return (
      <div className='flex size-full flex-col gap-1.5 rounded-sm bg-(--nebula-card) p-1.5'>
        <div className='flex items-center gap-1'>
          <span className='size-3 shrink-0 rounded-[3px] bg-(--mantine-color-blue-filled)' />
          <span className={`${NAME} flex-1`} />
          {STATUS}
        </div>
        <div className='flex flex-1 gap-1'>
          <span className='flex-1 rounded-[2px] bg-(--mantine-color-text)/10' />
          <span className='flex-1 rounded-[2px] bg-(--mantine-color-text)/10' />
          <span className='flex-1 rounded-[2px] bg-(--mantine-color-text)/10' />
        </div>
      </div>
    );
  }

  if (style === 'linear') {
    return (
      <div className='flex size-full flex-col gap-1'>
        {[0, 1, 2].map((row) => (
          <div key={row} className={`${CARD} flex flex-1 items-center gap-1 px-1`}>
            <span className='size-1.5 shrink-0 rounded-[2px] bg-(--mantine-color-blue-filled)' />
            <span className={`${NAME} w-1/3`} />
            <span className={`${DIM} ml-auto w-1/4`} />
            {STATUS}
          </div>
        ))}
      </div>
    );
  }

  if (style === 'minimal') {
    return (
      <div className='grid size-full grid-cols-2 gap-1'>
        {[0, 1].map((card) => (
          <div key={card} className={`${CARD} flex flex-col justify-center gap-1.5 px-1.5`}>
            <div className='flex items-center gap-1'>
              <span className={`${NAME} flex-1`} />
              {STATUS}
            </div>
            <span className={`${DIM} w-4/5`} />
          </div>
        ))}
      </div>
    );
  }

  if (style === 'compact') {
    return (
      <div className='grid size-full grid-cols-3 gap-1'>
        {[0, 1, 2, 3, 4, 5].map((tile) => (
          <div key={tile} className={`${CARD} flex items-center gap-0.5 px-1`}>
            <span className='size-1.5 shrink-0 rounded-full bg-(--mantine-color-green-filled)' />
            <span className={`${NAME} flex-1`} />
          </div>
        ))}
      </div>
    );
  }

  // the art header with the name and status over it, then the stats under a line
  return (
    <div className={`${CARD} flex size-full flex-col`}>
      <div className='flex flex-1 items-end justify-between gap-1 bg-linear-to-br from-(--mantine-color-blue-filled)/40 to-transparent px-1.5 pb-1'>
        <span className={`${NAME} w-1/2`} />
        {STATUS}
      </div>
      <div className='flex gap-1 border-t border-(--mantine-color-default-border) p-1.5'>{STATS}</div>
    </div>
  );
}

/** Core's table as it is (one bordered block with dividers), or every row a card of its own. */
function TableMock({ style }: { style: TableStyle }) {
  const cards = style === 'cards';
  const cells = (
    <>
      <span className={`${NAME} w-1/3`} />
      <span className={`${DIM} w-1/5`} />
      <span className={`${DIM} ml-auto w-1.5`} />
    </>
  );

  return (
    <div
      className={`flex size-full flex-col ${
        cards
          ? 'gap-1'
          : 'overflow-hidden rounded-sm border border-(--mantine-color-default-border) bg-(--mantine-color-default)'
      }`}
    >
      <div className='flex gap-2 px-1.5 py-0.5'>
        <span className={`${DIM} w-1/4`} />
        <span className={`${DIM} w-1/6`} />
      </div>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className={`flex flex-1 items-center gap-2 px-1.5 ${
            cards ? CARD : 'border-t border-(--mantine-color-default-border)'
          }`}
        >
          {cells}
        </div>
      ))}
    </div>
  );
}

/** Components section: the servers grid's cards and the table style. */
export default function ServerCardFields({ theme, set }: Props) {
  const { t } = useExtTranslations();

  return (
    <Stack gap='xl'>
      <Stack gap='md'>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t('editor.serverCards.title', {})}
        </Text>
        <ChoiceCards
          label={t('editor.serverCards.cardStyle', {})}
          description={t('editor.serverCards.cardStyleDescription', {})}
          value={theme.serverCardStyle}
          columns={3}
          choices={SERVER_CARD_STYLES.map((style) => ({
            value: style,
            label: t(`editor.serverCards.styles.${style}`, {}),
            preview: <CardMock style={style} />,
          }))}
          onChange={(serverCardStyle) => set({ serverCardStyle })}
        />
      </Stack>
      <Stack gap='md'>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t('editor.serverCards.tablesTitle', {})}
        </Text>
        <ChoiceCards
          label={t('editor.serverCards.tableStyle', {})}
          description={t('editor.serverCards.tableStyleDescription', {})}
          value={theme.tableStyle}
          choices={TABLE_STYLES.map((style) => ({
            value: style,
            label: t(`editor.serverCards.tables.${style}`, {}),
            preview: <TableMock style={style} />,
          }))}
          onChange={(tableStyle) => set({ tableStyle })}
        />
      </Stack>
    </Stack>
  );
}
