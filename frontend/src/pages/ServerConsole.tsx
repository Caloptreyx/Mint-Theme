import { type CSSProperties, type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import {
  BannerWidget,
  ChartsWidget,
  type ChartWidget,
  ConsoleChartsProvider,
  ExtensionCardsWidget,
  InfoWidget,
  isChartWidget,
  type Placement,
  StatsWidget,
} from '../elements/console/ConsoleWidgets.tsx';
import { CommandsWidget, ConnectWidget, GaugesWidget } from '../elements/console/ExtraWidgets.tsx';
import { useNebulaTheme } from '../lib/apply.ts';
import { Console, ServerContentContainer, useTranslations, useVisualViewportBottomInset } from '../lib/core.ts';
import { CONSOLE_SLOTS, type ConsoleWidget, type TerminalFrame, type TerminalHeight } from '../lib/theme.ts';

/** A slot's widgets with consecutive charts merged into one run, which shares a grid like core's charts. */
type Block = { key: string; widget: Exclude<ConsoleWidget, ChartWidget> } | { key: string; charts: ChartWidget[] };

function toBlocks(widgets: ConsoleWidget[]): Block[] {
  const blocks: Block[] = [];
  for (const widget of widgets) {
    const last = blocks.at(-1);
    if (!isChartWidget(widget)) blocks.push({ key: widget, widget });
    else if (last && 'charts' in last) last.charts.push(widget);
    else blocks.push({ key: widget, charts: [widget] });
  }
  return blocks;
}

/**
 * `terminalFrame` restyles core's terminal card, the box's only element child (its drawers and modals portal out).
 * Layered `!` utilities on the box: core's card pins its padding with `p-2!`, which nothing unlayered beats.
 */
const FRAME_CLASS: Record<TerminalFrame, string> = {
  card: '',
  flush:
    '[&>.mantine-Card-root]:bg-transparent! [&>.mantine-Card-root]:border-0! [&>.mantine-Card-root]:p-0! [&>.mantine-Card-root]:shadow-none! [&>.mantine-Card-root]:backdrop-blur-none!',
  glass: '[&>.mantine-Card-root]:bg-(--nebula-card)/55! [&>.mantine-Card-root]:backdrop-blur-md!',
};

/** The terminal box's height; 'fill' takes the measured `--nebula-terminal-fill` from lg up, phones keep 62vh. */
const HEIGHT_CLASS: Record<TerminalHeight, string> = {
  auto: 'h-[62vh] min-h-72',
  fill: 'h-[62vh] min-h-72 lg:h-(--nebula-terminal-fill)',
  tall: 'h-[72vh] lg:h-[85vh] min-h-96',
};

// the page's own bottom margin under the content (core's container keeps `mb-4` below it)
const FILL_GAP = 16;
const FILL_MIN = 288;

/**
 * 'fill': the room from the terminal's top to the bottom of the window with the page scrolled to the top, so the
 * terminal ends at the window's edge whatever sits above it. The scroll is added back from the window and every
 * ancestor (core's inset layout scrolls its content column, the normal one the window). Remeasured whenever the
 * server page or the window changes size.
 */
function useFillHeight(box: RefObject<HTMLDivElement | null>, enabled: boolean): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = box.current;
    if (!enabled || !node) {
      setHeight(null);
      return;
    }

    const measure = () => {
      let top = node.getBoundingClientRect().top + window.scrollY;
      for (let el = node.parentElement; el; el = el.parentElement) top += el.scrollTop;
      setHeight(Math.max(FILL_MIN, Math.floor(document.documentElement.clientHeight - top - FILL_GAP)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node.closest('#server-root') ?? document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [box, enabled]);

  return height;
}

/**
 * Core's terminal with the theme's widgets around it (`consoleLayout`): rows above and below, optional
 * columns beside it that stack under the terminal on narrow pages. The default is the Home banner, the
 * terminal, other extensions' stat cards, then the charts.
 */
export default function ServerConsole() {
  const { t } = useTranslations();
  const { consoleLayout, terminalFrame, terminalHeight } = useNebulaTheme();
  const keyboardInset = useVisualViewportBottomInset();
  const terminalBox = useRef<HTMLDivElement>(null);
  const fillHeight = useFillHeight(terminalBox, terminalHeight === 'fill');

  const slots = {
    top: toBlocks(consoleLayout.top),
    left: toBlocks(consoleLayout.left),
    right: toBlocks(consoleLayout.right),
    bottom: toBlocks(consoleLayout.bottom),
  };
  // core's stat block slot sits with its charts: the last chart run on the page, else the extension cards
  const blocksHost =
    CONSOLE_SLOTS.flatMap((slot) => slots[slot]).findLast((block) => 'charts' in block)?.key ?? 'extensionCards';

  const render = (block: Block, placement: Placement, className?: string): ReactNode => {
    const withBlocks = block.key === blocksHost;
    if ('charts' in block) {
      return (
        <ChartsWidget
          key={block.key}
          charts={block.charts}
          withBlocks={withBlocks}
          placement={placement}
          className={className}
        />
      );
    }

    switch (block.widget) {
      case 'banner':
        return <BannerWidget key={block.key} placement={placement} className={className} />;
      case 'stats':
        return <StatsWidget key={block.key} placement={placement} className={className} />;
      case 'info':
        return <InfoWidget key={block.key} placement={placement} className={className} />;
      case 'extensionCards':
        return (
          <ExtensionCardsWidget key={block.key} placement={placement} className={className} withBlocks={withBlocks} />
        );
      case 'gauges':
        return <GaugesWidget key={block.key} placement={placement} className={className} />;
      case 'commands':
        return <CommandsWidget key={block.key} placement={placement} className={className} />;
      case 'connect':
        return <ConnectWidget key={block.key} placement={placement} className={className} />;
    }
  };

  const hasBottom = slots.bottom.length > 0;
  // with both columns the terminal would get too narrow at lg, so then they only go beside it from xl
  const both = slots.left.length > 0 && slots.right.length > 0;

  const boxStyle: CSSProperties & { '--nebula-terminal-fill'?: string } = {};
  if (fillHeight !== null) boxStyle['--nebula-terminal-fill'] = `${fillHeight}px`;
  if (keyboardInset > 0) boxStyle.height = `max(8rem, min(62vh, calc(100dvh - ${keyboardInset}px - 7rem)))`;

  return (
    <ServerContentContainer
      title={t('pages.server.console.title', {})}
      hideTitleComponent
      registry={window.extensionContext.extensionRegistry.pages.server.console.container}
    >
      {/* the chart data lives above the slots, so a chart moved to another slot keeps its history */}
      <ConsoleChartsProvider>
        {slots.top.map((block) => render(block, 'row', 'mb-4'))}

        {/*
          The terminal comes first so it stays mounted when columns come and go, and so the columns stack under
          it on narrow pages; the left column is ordered in front of it once they sit side by side. xterm refits
          on any size change of its box (core's ResizeObserver), so the columns and the heights do not break it.
        */}
        <div className={`flex flex-col gap-4 ${both ? 'xl:flex-row' : 'lg:flex-row'} ${hasBottom ? 'mb-4' : ''}`}>
          <div
            ref={terminalBox}
            className={`flex flex-col ${HEIGHT_CLASS[terminalHeight]} min-w-0 ${both ? 'xl:flex-1' : 'lg:flex-1'} ${
              FRAME_CLASS[terminalFrame]
            }`}
            style={Object.keys(boxStyle).length > 0 ? boxStyle : undefined}
          >
            <Console />
          </div>
          {(['left', 'right'] as const).map(
            (side) =>
              slots[side].length > 0 && (
                <div
                  key={side}
                  className={`flex flex-col gap-4 min-w-0 shrink-0 ${both ? 'xl:w-80 2xl:w-96' : 'lg:w-80 2xl:w-96'} ${
                    side === 'right' ? '' : both ? 'xl:order-first' : 'lg:order-first'
                  }`}
                >
                  {slots[side].map((block) => render(block, 'side'))}
                </div>
              ),
          )}
        </div>

        {slots.bottom.map((block, index) => render(block, 'row', index < slots.bottom.length - 1 ? 'mb-4' : undefined))}
      </ConsoleChartsProvider>
    </ServerContentContainer>
  );
}
