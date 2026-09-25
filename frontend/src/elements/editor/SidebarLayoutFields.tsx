import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import {
  DOCK_POSITIONS,
  type DockPosition,
  type NebulaTheme,
  SIDEBAR_LAYOUTS,
  type SidebarLayout,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

// Tile mocks of the page: the sidebar, the bar across the content and a console box, in the draft's colours.
// Flush pieces reach through the tile's padding to its edge, like the flush sidebar and header do.

const SURFACE = 'border-(--mantine-color-default-border) bg-(--nebula-card)';

const SIDEBAR_SHAPE: Record<Exclude<SidebarLayout, 'horizontal'>, string> = {
  default: '-my-2 -ml-2 w-7 border-r p-1 pt-2',
  floating: 'w-7 rounded-[4px] border p-1',
  pill: 'w-7 rounded-[9px] border px-1 py-1.5',
  slim: '-my-2 -ml-2 w-3 items-center border-r px-0.5 pt-2',
};

type MockBar = 'header' | 'floating' | 'pill' | 'slim';

const BAR_SHAPE: Record<MockBar, string> = {
  header: '-mt-2 -mr-2 h-3.5 border-b px-1.5',
  floating: 'h-3.5 rounded-[4px] border px-1',
  pill: 'h-3.5 rounded-full border px-1.5',
  slim: 'h-2.5 rounded-full border px-1.5',
};

/** The dock: the logo and the search field. */
function DockMark({ className }: { className: string }) {
  return (
    <span className={`flex h-1.5 shrink-0 items-center gap-0.5 ${className}`}>
      <span className='size-1.5 shrink-0 rounded-[2px] bg-(--mantine-color-blue-filled)' />
      <span className='h-1 min-w-0 flex-1 rounded-full bg-(--mantine-color-dimmed)/50' />
    </span>
  );
}

function ConsoleBox({ label }: { label: string }) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden rounded-[3px] border p-1 ${SURFACE}`}>
      <span className='text-[6px] font-semibold leading-none text-(--mantine-color-text)'>{label}</span>
      <span className='h-0.5 w-3/4 shrink-0 rounded-full bg-(--nebula-highlight)' />
      <span className='h-0.5 w-1/2 shrink-0 rounded-full bg-(--mantine-color-dimmed)' />
    </div>
  );
}

/** Three menu links, the first one current; dots in the slim rail. */
function MockLinks({ slim }: { slim: boolean }) {
  return (
    <>
      {[0, 1, 2].map((index) => {
        const tone = index === 0 ? 'bg-(--mantine-color-blue-filled)' : 'bg-(--mantine-color-dimmed)';
        return slim ? (
          <span key={index} className={`size-1 shrink-0 rounded-full ${tone}`} />
        ) : (
          <span key={index} className={`h-1 shrink-0 rounded-full ${index === 0 ? 'w-full' : 'w-3/4'} ${tone}`} />
        );
      })}
    </>
  );
}

/** One layout with the dock in one place, drawn like SidebarShell lays them out. */
function LayoutMock({ layout, dock, label }: { layout: SidebarLayout; dock: DockPosition; label: string }) {
  if (layout === 'horizontal') {
    return (
      <div className='flex size-full flex-col gap-1'>
        <div className={`-mx-2 -mt-2 flex h-4 shrink-0 items-center gap-1 border-b px-2 ${SURFACE}`}>
          <DockMark className='w-5' />
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`h-1 w-2.5 shrink-0 rounded-full ${index === 0 ? 'bg-(--mantine-color-blue-filled)' : 'bg-(--mantine-color-dimmed)'}`}
            />
          ))}
          <span className='ml-auto size-1.5 shrink-0 rounded-full bg-(--mantine-color-dimmed)' />
        </div>
        <ConsoleBox label={label} />
      </div>
    );
  }

  const slim = layout === 'slim';
  const bar: MockBar | null =
    dock === 'header'
      ? 'header'
      : dock === 'top'
        ? layout === 'pill'
          ? 'pill'
          : 'floating'
        : layout === 'pill'
          ? 'slim'
          : null;

  return (
    <div className='flex size-full gap-1.5'>
      <div className={`flex shrink-0 flex-col gap-1 ${SURFACE} ${SIDEBAR_SHAPE[layout]}`}>
        {dock === 'sidebar' &&
          (slim ? (
            <span className='size-1.5 shrink-0 rounded-[2px] bg-(--mantine-color-blue-filled)' />
          ) : (
            <DockMark className='w-full' />
          ))}
        <MockLinks slim={slim} />
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        {bar ? (
          <div className={`flex shrink-0 items-center gap-1 ${SURFACE} ${BAR_SHAPE[bar]}`}>
            {dock === 'sidebar' ? (
              <span className='h-0.5 w-5 rounded-full bg-(--mantine-color-dimmed)' />
            ) : (
              <DockMark className='w-8' />
            )}
            {layout === 'pill' && (
              <span className='ml-auto size-1.5 shrink-0 rounded-full bg-(--mantine-color-dimmed)' />
            )}
          </div>
        ) : (
          <span className='h-1 w-1/2 shrink-0 rounded-full bg-(--mantine-color-text)' />
        )}
        <ConsoleBox label={label} />
      </div>
    </div>
  );
}

/** Navigation section: the dashboard layout and where the dock sits. */
export default function SidebarLayoutFields({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const label = t('editor.navLayout.mockConsole', {});
  const horizontal = theme.sidebarLayout === 'horizontal';

  return (
    <Stack gap='md'>
      <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
        {t('editor.navLayout.title', {})}
      </Text>
      <ChoiceCards
        label={t('editor.navLayout.layout', {})}
        description={t('editor.navLayout.layoutDescription', {})}
        value={theme.sidebarLayout}
        columns={3}
        choices={SIDEBAR_LAYOUTS.map((layout) => ({
          value: layout,
          label: t(`editor.navLayout.layouts.${layout}`, {}),
          preview: <LayoutMock layout={layout} dock='sidebar' label={label} />,
        }))}
        onChange={(sidebarLayout) => set({ sidebarLayout })}
      />
      {/* the horizontal layout's top bar always holds the dock, so the choice rests until another layout is picked */}
      <div inert={horizontal} className={horizontal ? 'opacity-50' : undefined}>
        <ChoiceCards
          label={t('editor.navLayout.dock', {})}
          description={
            horizontal ? t('editor.navLayout.dockHorizontal', {}) : t('editor.navLayout.dockDescription', {})
          }
          value={theme.dockPosition}
          columns={3}
          choices={DOCK_POSITIONS.map((dock) => ({
            value: dock,
            label: t(`editor.navLayout.docks.${dock}`, {}),
            preview: <LayoutMock layout={horizontal ? 'default' : theme.sidebarLayout} dock={dock} label={label} />,
          }))}
          onChange={(dockPosition) => set({ dockPosition })}
        />
      </div>
    </Stack>
  );
}
