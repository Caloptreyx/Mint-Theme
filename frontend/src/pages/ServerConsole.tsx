import type { ReactNode } from 'react';
import ServerContentContainer from '@/elements/containers/ServerContentContainer.tsx';
import Console from '@/pages/server/console/terminal/Console.tsx';
import { useVisualViewportBottomInset } from '@/plugins/useVisualViewport.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import {
  BannerWidget,
  ChartsWidget,
  type ChartWidget,
  ExtensionCardsWidget,
  InfoWidget,
  isChartWidget,
  type Placement,
  StatsWidget,
} from '../elements/console/ConsoleWidgets.tsx';
import { useNebulaTheme } from '../lib/apply.ts';
import { CONSOLE_SLOTS, type ConsoleWidget } from '../lib/theme.ts';

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
 * Core's terminal with the theme's widgets around it (`consoleLayout`): rows above and below, optional
 * columns beside it that stack under the terminal on narrow pages. The default is the Home banner, the
 * terminal, other extensions' stat cards, then the charts.
 */
export default function ServerConsole() {
  const { t } = useTranslations();
  const { consoleLayout } = useNebulaTheme();
  const keyboardInset = useVisualViewportBottomInset();

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
    }
  };

  const hasBottom = slots.bottom.length > 0;
  // with both columns the terminal would get too narrow at lg, so then they only go beside it from xl
  const both = slots.left.length > 0 && slots.right.length > 0;

  return (
    <ServerContentContainer
      title={t('pages.server.console.title', {})}
      hideTitleComponent
      registry={window.extensionContext.extensionRegistry.pages.server.console.container}
    >
      {slots.top.map((block) => render(block, 'row', 'mb-4'))}

      {/*
        The terminal comes first so it stays mounted when columns come and go, and so the columns stack under
        it on narrow pages; the left column is ordered in front of it once they sit side by side. xterm refits
        on any size change of its box (core's ResizeObserver), so the columns do not break it.
      */}
      <div className={`flex flex-col gap-4 ${both ? 'xl:flex-row' : 'lg:flex-row'} ${hasBottom ? 'mb-4' : ''}`}>
        <div
          className={`flex flex-col h-[62vh] min-h-72 min-w-0 ${both ? 'xl:flex-1' : 'lg:flex-1'}`}
          style={
            keyboardInset > 0 ? { height: `max(8rem, min(62vh, calc(100dvh - ${keyboardInset}px - 7rem)))` } : undefined
          }
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
    </ServerContentContainer>
  );
}
