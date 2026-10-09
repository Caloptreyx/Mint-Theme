import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Slider } from '@mantine/core';
import { ActionIcon, Button, Group, Stack, Switch, Text, TextInput } from '../../lib/core.ts';
import {
  CHART_ARRANGEMENTS,
  CHART_HEIGHTS,
  CHART_STYLES,
  type ChartArrangement,
  type ChartHeight,
  type ChartStyle,
  CONSOLE_BANNERS,
  type ConsoleBanner,
  type ConsoleLayout,
  DEFAULT_CONSOLE_LAYOUT,
  MAX_COMMAND_LABEL,
  MAX_COMMAND_LENGTH,
  MAX_CONSOLE_COMMANDS,
  type NebulaTheme,
  TERMINAL_CURSORS,
  TERMINAL_FRAMES,
  TERMINAL_HEIGHTS,
  TERMINAL_LINE_HEIGHT,
  type TerminalCursor,
  type TerminalFrame,
  type TerminalHeight,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

// skeleton pieces drawn with the panel's live variables, so the tiles follow the draft
const BLOCK = 'rounded-[2px] border border-(--mantine-color-default-border) bg-(--nebula-card)';
const TERMINAL = 'rounded-[2px] border border-(--mantine-color-blue-filled) bg-(--mantine-color-blue-light)';
const NAME = 'h-1 rounded-full bg-(--mantine-color-text)';
const DIM = 'h-0.5 rounded-full bg-(--mantine-color-dimmed)';
const BUTTONS = (
  <span className='flex shrink-0 gap-0.5'>
    <span className='h-1.5 w-2 rounded-[1px] bg-(--mantine-color-green-filled)' />
    <span className='h-1.5 w-2 rounded-[1px] bg-(--mantine-color-gray-filled)' />
    <span className='h-1.5 w-2 rounded-[1px] bg-(--mantine-color-red-filled)' />
  </span>
);

/** Starting points for the console page; nothing about them is stored, a tile is selected while the draft matches. */
const CONSOLE_PRESETS = ['classic', 'sidebar', 'focus', 'dashboard'] as const;
type ConsolePreset = (typeof CONSOLE_PRESETS)[number];

const PRESET_PATCHES: Record<ConsolePreset, Partial<NebulaTheme> & { consoleLayout: ConsoleLayout }> = {
  classic: { consoleLayout: DEFAULT_CONSOLE_LAYOUT },
  sidebar: {
    consoleLayout: {
      top: ['banner'],
      left: ['info', 'stats'],
      right: ['cpuChart', 'memoryChart', 'networkChart'],
      bottom: ['extensionCards'],
    },
  },
  focus: {
    consoleLayout: { top: ['banner'], left: [], right: [], bottom: [] },
    consoleBanner: 'compact',
    terminalHeight: 'fill',
  },
  dashboard: {
    consoleLayout: {
      top: ['banner', 'stats'],
      left: [],
      right: ['cpuChart', 'memoryChart', 'networkChart'],
      bottom: ['info', 'extensionCards'],
    },
  },
};

/** The page's slots as blocks around the terminal, one bar per widget above and below. */
function LayoutMock({ layout }: { layout: ConsoleLayout }) {
  const bars = (count: number) =>
    Array.from({ length: Math.min(count, 2) }, (_, index) => (
      <span key={index} className={`${BLOCK} h-1.5 shrink-0`} />
    ));

  return (
    <div className='flex size-full flex-col gap-0.5'>
      {bars(layout.top.length)}
      <div className='flex min-h-0 flex-1 gap-0.5'>
        {layout.left.length > 0 && <span className={`${BLOCK} w-1/4`} />}
        <span className={`${TERMINAL} flex-1`} />
        {layout.right.length > 0 && <span className={`${BLOCK} w-1/4`} />}
      </div>
      {bars(layout.bottom.length)}
    </div>
  );
}

const TERMINAL_LINES = (
  <>
    <span className={`${DIM} w-3/4`} />
    <span className={`${DIM} w-1/2`} />
    <span className={`${DIM} w-2/3`} />
  </>
);

/** Core's card, no frame, or glass over the page's accent. */
function FrameMock({ frame }: { frame: TerminalFrame }) {
  if (frame === 'flush') return <div className='flex size-full flex-col justify-center gap-1'>{TERMINAL_LINES}</div>;
  if (frame === 'glass') {
    return (
      <div className='relative size-full overflow-hidden rounded-[2px] bg-linear-to-br from-(--mantine-color-blue-filled)/60 to-transparent'>
        <div className='absolute inset-1 flex flex-col justify-center gap-1 rounded-[2px] border border-white/15 bg-(--nebula-card)/55 p-1.5 backdrop-blur-sm'>
          {TERMINAL_LINES}
        </div>
      </div>
    );
  }
  return <div className={`${BLOCK} flex size-full flex-col justify-center gap-1 p-1.5`}>{TERMINAL_LINES}</div>;
}

/** A page with the terminal box at its height; 'fill' reaches the bottom edge. */
function HeightMock({ height }: { height: TerminalHeight }) {
  const size = height === 'fill' ? 'flex-1' : height === 'tall' ? 'h-3/4' : 'h-1/2';
  return (
    <div className='flex size-full flex-col gap-0.5 rounded-[2px] border border-dashed border-(--mantine-color-default-border) p-0.5'>
      <span className={`${BLOCK} h-1.5 shrink-0`} />
      <span className={`${TERMINAL} ${size}`} />
    </div>
  );
}

/** A prompt line ending in the cursor's shape. */
function CursorMock({ cursor }: { cursor: TerminalCursor }) {
  const shape =
    cursor === 'block'
      ? 'h-2.5 w-1.5 bg-(--mantine-color-text)'
      : cursor === 'bar'
        ? 'h-2.5 w-0.5 bg-(--mantine-color-text)'
        : cursor === 'underline'
          ? 'h-0.5 w-1.5 self-end bg-(--mantine-color-text)'
          : 'w-1.5';
  return (
    <div className='flex h-2.5 items-center gap-1 font-mono text-[10px] leading-none'>
      <span className='text-(--mantine-color-dimmed)'>$</span>
      <span className={`${DIM} w-6`} />
      <span className={`flex shrink-0 ${shape}`} />
    </div>
  );
}

/** The Home banner, one row, or a slim status line. */
function BannerMock({ banner }: { banner: ConsoleBanner }) {
  if (banner === 'minimal') {
    return (
      <div className={`${BLOCK} flex w-full items-center gap-1 px-1 py-0.5`}>
        <span className='size-1 shrink-0 rounded-full bg-(--mantine-color-green-filled)' />
        <span className={`${NAME} w-1/4`} />
        <span className={`${DIM} w-1/5`} />
        <span className='ml-auto'>{BUTTONS}</span>
      </div>
    );
  }
  if (banner === 'compact') {
    return (
      <div className={`${BLOCK} flex w-full items-center gap-1 p-1.5`}>
        <span className={`${NAME} w-1/4`} />
        <span className='h-1.5 w-3 shrink-0 rounded-full bg-(--mantine-color-green-light)' />
        <span className='ml-auto'>{BUTTONS}</span>
      </div>
    );
  }
  return (
    <div
      className={`${BLOCK} flex size-full justify-between gap-1 bg-linear-to-br from-(--mantine-color-blue-filled)/30 to-transparent p-1.5`}
    >
      <div className='flex flex-1 flex-col gap-1'>
        <span className={`${NAME} w-1/2`} />
        <span className={`${DIM} w-2/3`} />
        <span className={`${DIM} w-1/2`} />
      </div>
      {BUTTONS}
    </div>
  );
}

const CHART_PATH = 'M0 18 L10 12 L20 14 L30 6 L40 9 L50 3 L60 7';

/** Core's filled area, or the bare line. */
function ChartStyleMock({ style }: { style: ChartStyle }) {
  return (
    <svg viewBox='0 0 60 20' className='h-8 w-full' preserveAspectRatio='none' aria-hidden='true'>
      {style === 'area' && (
        <path d={`${CHART_PATH} L60 20 L0 20 Z`} className='fill-(--mantine-color-blue-filled)/25' />
      )}
      <path d={CHART_PATH} fill='none' strokeWidth='1.5' className='stroke-(--mantine-color-blue-filled)' />
    </svg>
  );
}

/** A chart card with its plot at the height. */
function ChartHeightMock({ height }: { height: ChartHeight }) {
  const size = height === 'small' ? 'h-3' : height === 'large' ? 'h-8' : 'h-5';
  return (
    <div className={`${BLOCK} flex w-2/3 flex-col gap-0.5 p-1`}>
      <span className={`${DIM} w-1/3`} />
      <span className={`${size} rounded-[1px] bg-(--mantine-color-blue-filled)/25`} />
    </div>
  );
}

/** Three charts side by side, or one under the other. */
function ArrangementMock({ arrangement }: { arrangement: ChartArrangement }) {
  return (
    <div className={`flex size-full gap-0.5 ${arrangement === 'stacked' ? 'flex-col' : ''}`}>
      {[0, 1, 2].map((index) => (
        <span key={index} className={`${BLOCK} flex-1`} />
      ))}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
      {children}
    </Text>
  );
}

/** Console section, above the slots: tiles that lay a preset's layout (and its banner and height) over the draft. */
export function ConsolePresets({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const matches = (preset: ConsolePreset) =>
    Object.entries(PRESET_PATCHES[preset]).every(
      ([key, value]) => JSON.stringify(theme[key as keyof NebulaTheme]) === JSON.stringify(value),
    );

  return (
    <ChoiceCards
      label={t('editor.consoleLayout.presets', {})}
      description={t('editor.consoleLayout.presetsDescription', {})}
      value={CONSOLE_PRESETS.find(matches) ?? null}
      choices={CONSOLE_PRESETS.map((preset) => ({
        value: preset,
        label: t(`editor.consoleLayout.presetNames.${preset}`, {}),
        preview: <LayoutMock layout={PRESET_PATCHES[preset].consoleLayout} />,
      }))}
      onChange={(preset) => set(PRESET_PATCHES[preset])}
    />
  );
}

/** Console section, below the slots: the terminal, the banner, the charts and the quick commands. */
export default function ConsoleFields({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const commands = theme.consoleCommands;
  const setCommand = (index: number, patch: Partial<NebulaTheme['consoleCommands'][number]>) =>
    set({ consoleCommands: commands.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)) });

  return (
    <Stack gap='xl'>
      <Stack gap='md'>
        <Heading>{t('editor.console.terminalTitle', {})}</Heading>
        <ChoiceCards
          label={t('editor.console.frame', {})}
          description={t('editor.console.frameDescription', {})}
          value={theme.terminalFrame}
          columns={3}
          choices={TERMINAL_FRAMES.map((frame) => ({
            value: frame,
            label: t(`editor.console.frames.${frame}`, {}),
            preview: <FrameMock frame={frame} />,
          }))}
          onChange={(terminalFrame) => set({ terminalFrame })}
        />
        <ChoiceCards
          label={t('editor.console.height', {})}
          description={t('editor.console.heightDescription', {})}
          value={theme.terminalHeight}
          columns={3}
          choices={TERMINAL_HEIGHTS.map((height) => ({
            value: height,
            label: t(`editor.console.heights.${height}`, {}),
            preview: <HeightMock height={height} />,
          }))}
          onChange={(terminalHeight) => set({ terminalHeight })}
        />
        <ChoiceCards
          label={t('editor.console.cursor', {})}
          description={t('editor.console.cursorDescription', {})}
          value={theme.terminalCursor}
          choices={TERMINAL_CURSORS.map((cursor) => ({
            value: cursor,
            label: t(`editor.console.cursors.${cursor}`, {}),
            preview: <CursorMock cursor={cursor} />,
          }))}
          onChange={(terminalCursor) => set({ terminalCursor })}
        />
        <Switch
          label={t('editor.console.cursorBlink', {})}
          description={t('editor.console.cursorBlinkDescription', {})}
          checked={theme.terminalCursorBlink}
          disabled={theme.terminalCursor === 'none'}
          onChange={(e) => set({ terminalCursorBlink: e.currentTarget.checked })}
        />
        <div>
          <Group justify='space-between' mb={6}>
            <Text size='sm' fw={500}>
              {t('editor.console.lineHeight', {})}
            </Text>
            <Text size='xs' c='dimmed'>
              {theme.terminalLineHeight.toFixed(2)}
            </Text>
          </Group>
          <Slider
            min={TERMINAL_LINE_HEIGHT.min}
            max={TERMINAL_LINE_HEIGHT.max}
            step={0.05}
            thumbLabel={t('editor.console.lineHeight', {})}
            label={(value) => value.toFixed(2)}
            value={theme.terminalLineHeight}
            onChange={(terminalLineHeight) => set({ terminalLineHeight })}
          />
        </div>
      </Stack>

      <Stack gap='md'>
        <Heading>{t('editor.console.bannerTitle', {})}</Heading>
        <ChoiceCards
          label={t('editor.console.banner', {})}
          description={t('editor.console.bannerDescription', {})}
          value={theme.consoleBanner}
          columns={3}
          choices={CONSOLE_BANNERS.map((banner) => ({
            value: banner,
            label: t(`editor.console.banners.${banner}`, {}),
            preview: <BannerMock banner={banner} />,
          }))}
          onChange={(consoleBanner) => set({ consoleBanner })}
        />
      </Stack>

      <Stack gap='md'>
        <Heading>{t('editor.console.chartsTitle', {})}</Heading>
        <ChoiceCards
          label={t('editor.console.chartStyle', {})}
          value={theme.chartStyle}
          choices={CHART_STYLES.map((style) => ({
            value: style,
            label: t(`editor.console.chartStyles.${style}`, {}),
            preview: <ChartStyleMock style={style} />,
          }))}
          onChange={(chartStyle) => set({ chartStyle })}
        />
        <ChoiceCards
          label={t('editor.console.chartHeight', {})}
          value={theme.chartHeight}
          columns={3}
          choices={CHART_HEIGHTS.map((height) => ({
            value: height,
            label: t(`editor.console.chartHeights.${height}`, {}),
            preview: <ChartHeightMock height={height} />,
          }))}
          onChange={(chartHeight) => set({ chartHeight })}
        />
        <ChoiceCards
          label={t('editor.console.chartArrangement', {})}
          description={t('editor.console.chartArrangementDescription', {})}
          value={theme.chartArrangement}
          choices={CHART_ARRANGEMENTS.map((arrangement) => ({
            value: arrangement,
            label: t(`editor.console.chartArrangements.${arrangement}`, {}),
            preview: <ArrangementMock arrangement={arrangement} />,
          }))}
          onChange={(chartArrangement) => set({ chartArrangement })}
        />
      </Stack>

      <Stack gap='md'>
        <div>
          <Heading>{t('editor.console.commandsTitle', {})}</Heading>
          <Text size='xs' c='dimmed' mt={4}>
            {t('editor.console.commandsDescription', { max: MAX_CONSOLE_COMMANDS })}
          </Text>
        </div>
        {commands.map((entry, index) => (
          // rows have no id of their own; they are only added at the end and removed by their button
          <Group key={index} gap='xs' wrap='nowrap' align='flex-end'>
            <TextInput
              className='w-2/5'
              label={t('editor.console.commandLabel', {})}
              maxLength={MAX_COMMAND_LABEL}
              value={entry.label}
              onChange={(e) => setCommand(index, { label: e.target.value })}
            />
            <TextInput
              className='flex-1'
              classNames={{ input: 'font-mono' }}
              label={t('editor.console.command', {})}
              maxLength={MAX_COMMAND_LENGTH}
              value={entry.command}
              onChange={(e) => setCommand(index, { command: e.target.value })}
            />
            <ActionIcon
              size='lg'
              color='red'
              variant='subtle'
              aria-label={t('editor.console.removeCommand', {})}
              onClick={() => set({ consoleCommands: commands.filter((_, i) => i !== index) })}
            >
              <FontAwesomeIcon icon={faTrash} />
            </ActionIcon>
          </Group>
        ))}
        {commands.length < MAX_CONSOLE_COMMANDS && (
          <Button
            variant='default'
            className='self-start'
            leftSection={<FontAwesomeIcon icon={faPlus} />}
            onClick={() => set({ consoleCommands: [...commands, { label: '', command: '' }] })}
          >
            {t('editor.console.addCommand', {})}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
