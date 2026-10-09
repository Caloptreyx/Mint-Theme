import {
  faClock,
  faCloudArrowDown,
  faCloudArrowUp,
  faCloudDownload,
  faCopy,
  faHardDrive,
  faMemory,
  faMicrochip,
  faPowerOff,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNebulaTheme } from '../../lib/apply.ts';
import {
  bytesToString,
  Card,
  ChartBlock,
  ChartLegend,
  type ChartLegendProps,
  CopyOnClick,
  ExtensionSlot,
  formatAllocation,
  formatBytes,
  formatBytesRate,
  formatMilliseconds,
  formatPercent,
  Group,
  mbToBytes,
  StatCard,
  StreamChart,
  type StreamChartProps,
  serverStatusInfo,
  Title,
  TitleCard,
  useServerStore,
  useStreamChart,
  useTranslations,
} from '../../lib/core.ts';
import { shownAddress, useRedactAddresses } from '../../lib/redact.ts';
import type { ChartHeight, ConsoleWidget } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import HeroCard, { Pill } from '../home/HeroCard.tsx';
import PowerButtons from '../home/PowerButtons.tsx';
import ServerState from '../ServerState.tsx';

const NONE = '--';

export type ChartWidget = Extract<ConsoleWidget, 'cpuChart' | 'memoryChart' | 'networkChart'>;

/** Narrows a widget id to a chart, so a slot's consecutive charts can share one grid. */
export function isChartWidget(id: ConsoleWidget): id is ChartWidget {
  return id === 'cpuChart' || id === 'memoryChart' || id === 'networkChart';
}

/** Where a widget sits: the full width rows above and below the terminal, or a side column beside it. */
export type Placement = 'row' | 'side';

export interface WidgetProps {
  placement: Placement;
  className?: string;
}

/** Network throughput from successive samples; the socket only reports running totals. */
function useNetworkRate() {
  const stats = useServerStore((s) => s.stats);
  const sample = useRef<{ rx: number; tx: number; at: number } | null>(null);
  const [rate, setRate] = useState({ rx: 0, tx: 0 });

  useEffect(() => {
    if (!stats) return;
    const now = Date.now();
    const prev = sample.current;
    if (prev && now - prev.at < 500) return;

    sample.current = { rx: stats.network.rxBytes, tx: stats.network.txBytes, at: now };
    if (prev) {
      const seconds = (now - prev.at) / 1000;
      setRate({
        rx: Math.max(0, (stats.network.rxBytes - prev.rx) / seconds),
        tx: Math.max(0, (stats.network.txBytes - prev.tx) / seconds),
      });
    }
  }, [stats]);

  return rate;
}

/** The banner widget in the theme's `consoleBanner` shape. */
export function BannerWidget(props: WidgetProps) {
  const { consoleBanner } = useNebulaTheme();
  if (consoleBanner === 'compact') return <CompactBanner {...props} />;
  if (consoleBanner === 'minimal') return <MinimalBanner {...props} />;
  return <FullBanner {...props} />;
}

/** The Home banner with the live stats as pills and the power buttons. */
function FullBanner({ className }: WidgetProps) {
  const { t } = useTranslations();
  const theme = useNebulaTheme();
  const { server, stats, state } = useServerStore(
    useShallow((s) => ({ server: s.server, stats: s.stats, state: s.state })),
  );
  const offline = state === 'offline' && server.status !== 'installing';
  const rate = useNetworkRate();

  const eggImages = theme.eggs[server.egg.uuid];
  const unlimited = t('common.unlimited', {});
  const live = (value: string) => (offline ? NONE : value);

  return (
    <div className={className}>
      <HeroCard banner={eggImages?.banner || theme.homeBanner} icon={eggImages?.icon}>
        <Pill icon={faClock} label={t('common.stat.uptime', {})}>
          {live(formatMilliseconds(stats?.uptime || 0))}
        </Pill>
        <Pill icon={faMicrochip} label={t('common.stat.cpuLoad', {})}>
          {live(`${(stats?.cpuAbsolute || 0).toFixed(2)}%`)} / {server.limits.cpu ? `${server.limits.cpu}%` : unlimited}
        </Pill>
        <Pill icon={faMemory} label={t('common.stat.memoryLoad', {})}>
          {live(bytesToString(stats?.memoryBytes || 0))} /{' '}
          {server.limits.memory ? bytesToString(mbToBytes(server.limits.memory)) : unlimited}
        </Pill>
        <Pill icon={faHardDrive} label={t('common.stat.diskUsage', {})}>
          {bytesToString(stats?.diskBytes || 0)} /{' '}
          {server.limits.disk ? bytesToString(mbToBytes(server.limits.disk)) : unlimited}
        </Pill>
        <Pill icon={faCloudArrowDown} label={t('pages.server.console.details.networkIn', {})}>
          {live(`${bytesToString(Math.round(rate.rx))}/s`)}
        </Pill>
        <Pill icon={faCloudArrowUp} label={t('pages.server.console.details.networkOut', {})}>
          {live(`${bytesToString(Math.round(rate.tx))}/s`)}
        </Pill>
      </HeroCard>
    </div>
  );
}

/** The allocation, masked like the other cards and copied raw. */
function useAddress() {
  const { t } = useTranslations();
  const server = useServerStore((s) => s.server);
  const redact = useRedactAddresses();
  const address = server.allocation
    ? formatAllocation(server.allocation, server.egg.separatePort)
    : t('common.server.noAllocation', {});
  return { address, shown: server.allocation ? shownAddress(address, redact) : address, copyable: !!server.allocation };
}

/** One row: the name, the state pill and the address, with smaller power buttons on the right. */
function CompactBanner({ className }: WidgetProps) {
  const server = useServerStore((s) => s.server);
  const { address, shown, copyable } = useAddress();

  return (
    <Card className={className} p='md'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2 min-w-0'>
          <Title order={3} className='wrap-break-word min-w-0'>
            {server.name}
          </Title>
          <ServerState />
          <CopyOnClick content={address} enabled={copyable} className='max-w-full'>
            <Pill right={copyable && <FontAwesomeIcon icon={faCopy} />}>{shown}</Pill>
          </CopyOnClick>
        </div>
        <PowerButtons size='xs' />
      </div>
    </Card>
  );
}

/** A slim status line: the state as a dot, the name and the address, then compact power buttons. */
function MinimalBanner({ className }: WidgetProps) {
  const { t } = useTranslations();
  const { server, state } = useServerStore(useShallow((s) => ({ server: s.server, state: s.state })));
  const { address, shown, copyable } = useAddress();
  const status = server.isSuspended
    ? t('common.server.state.suspended', {})
    : server.status
      ? serverStatusInfo[server.status].label()
      : t(`common.enum.serverState.${state}`, {});

  return (
    <Card className={className} px='md' py='xs'>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
        <div className='flex items-center gap-2.5 min-w-0 text-sm'>
          <span
            role='img'
            aria-label={status}
            title={status}
            className={`size-2.5 shrink-0 rounded-full bg-server-status-${server.isSuspended ? 'offline' : state}`}
          />
          <span className='font-semibold truncate'>{server.name}</span>
          <CopyOnClick content={address} enabled={copyable} className='min-w-0 text-left!'>
            <span className='block truncate text-(--mantine-color-dimmed) tabular-nums'>{shown}</span>
          </CopyOnClick>
        </div>
        <PowerButtons size='compact-sm' />
      </div>
    </Card>
  );
}

/** Core's stat cards for uptime, CPU, memory, disk and network; a grid in a row, a stack beside the terminal. */
export function StatsWidget({ placement, className }: WidgetProps) {
  const { t } = useTranslations();
  const { server, stats, state } = useServerStore(
    useShallow((s) => ({ server: s.server, stats: s.stats, state: s.state })),
  );
  const offline = state === 'offline' && server.status !== 'installing';
  const rate = useNetworkRate();

  const unlimited = t('common.unlimited', {});
  const offlineLabel = t('common.enum.serverState.offline', {});
  const memoryLimit = mbToBytes(server.limits.memory);
  const diskLimit = mbToBytes(server.limits.disk);
  const grid = placement === 'row' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-4';

  return (
    <div className={`${grid} ${className ?? ''}`}>
      <StatCard
        icon={faClock}
        label={t('common.stat.uptime', {})}
        value={offline ? offlineLabel : formatMilliseconds(stats?.uptime || 0)}
      />
      <StatCard
        icon={faMicrochip}
        label={t('common.stat.cpuLoad', {})}
        value={offline ? offlineLabel : `${(stats?.cpuAbsolute || 0).toFixed(2)}%`}
        limit={server.limits.cpu ? `${server.limits.cpu}%` : unlimited}
        progress={offline ? null : stats?.cpuAbsolute}
        total={server.limits.cpu}
      />
      <StatCard
        icon={faMemory}
        label={t('common.stat.memoryLoad', {})}
        value={offline ? offlineLabel : bytesToString(stats?.memoryBytes || 0)}
        limit={memoryLimit ? bytesToString(memoryLimit) : unlimited}
        progress={offline ? null : stats?.memoryBytes}
        total={memoryLimit}
      />
      <StatCard
        icon={faHardDrive}
        label={t('common.stat.diskUsage', {})}
        value={bytesToString(stats?.diskBytes || 0)}
        limit={diskLimit ? bytesToString(diskLimit) : unlimited}
        progress={stats?.diskBytes}
        total={diskLimit}
      />
      <StatCard
        icon={faCloudArrowDown}
        label={t('pages.server.console.details.networkIn', {})}
        value={offline ? offlineLabel : `${bytesToString(Math.round(rate.rx))}/s`}
      />
      <StatCard
        icon={faCloudArrowUp}
        label={t('pages.server.console.details.networkOut', {})}
        value={offline ? offlineLabel : `${bytesToString(Math.round(rate.tx))}/s`}
      />
    </div>
  );
}

/** A label and value line of a titled card, as on the Home information card. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-4 py-2.5 border-b border-(--mantine-color-default-border) last:border-0'>
      <span className='shrink-0 text-sm text-(--mantine-color-dimmed)'>{label}</span>
      <div className='min-w-0 text-sm text-right truncate'>{children}</div>
    </div>
  );
}

/** The Home page's server information card, without the rename button. */
export function InfoWidget({ className }: WidgetProps) {
  const { t } = useExtTranslations();
  const { t: core } = useTranslations();
  const { server, stats, state } = useServerStore(
    useShallow((s) => ({ server: s.server, stats: s.stats, state: s.state })),
  );
  const redact = useRedactAddresses();

  const address = server.allocation
    ? formatAllocation(server.allocation, server.egg.separatePort)
    : core('common.server.noAllocation', {});
  const statusLabel = server.isSuspended
    ? core('common.server.state.suspended', {})
    : server.status
      ? serverStatusInfo[server.status].label()
      : core(`common.enum.serverState.${state}`, {});
  const sftp = `${server.sftpHost}:${server.sftpPort}`;

  return (
    <div className={className}>
      <TitleCard title={t('home.information', {})}>
        <Row label={t('home.serverName', {})}>{server.name}</Row>
        <Row label={t('home.address', {})}>
          <CopyOnClick content={address} enabled={!!server.allocation}>
            <span>{server.allocation ? shownAddress(address, redact) : address}</span>
          </CopyOnClick>
        </Row>
        <Row label={t('home.status', {})}>{statusLabel}</Row>
        <Row label={t('home.uptime', {})}>{stats?.uptime ? formatMilliseconds(stats.uptime, true, false) : NONE}</Row>
        <Row label={t('home.location', {})}>
          <Group gap={6} wrap='nowrap' justify='flex-end'>
            {server.locationFlag && (
              <img src={`/flags/${server.locationFlag}.svg`} alt='' className='size-4 rounded-full' />
            )}
            <span className='truncate'>{server.locationName}</span>
          </Group>
        </Row>
        <Row label={t('home.node', {})}>{server.nodeName}</Row>
        <Row label={t('home.sftp', {})}>
          <CopyOnClick content={sftp}>
            <span>{shownAddress(sftp, redact)}</span>
          </CopyOnClick>
        </Row>
      </TitleCard>
    </div>
  );
}

/** Core's console stat block slot; it follows the charts, or the extension cards when no chart is shown. */
function StatBlocks() {
  return (
    <ExtensionSlot
      components={window.extensionContext.extensionRegistry.pages.server.console.statBlocks}
      name='console-stat-block'
    />
  );
}

/** What a chart widget draws from one of core's `useStreamChart` hooks. */
interface StreamChartData {
  props: StreamChartProps;
  legend: ChartLegendProps;
  value: string | null;
}

interface ConsoleCharts {
  cpu: StreamChartData;
  memory: StreamChartData;
  network: StreamChartData;
  offline: boolean;
}

const ConsoleChartsContext = createContext<ConsoleCharts | null>(null);

/**
 * The data behind the chart widgets, fed exactly like core's `ServerStats` (which only exports all three at once).
 * It wraps the page instead of living in `ChartsWidget`, so a chart moved to another slot (a remount) comes back
 * with the history it already drew, and the feed runs once however the charts are split. The page unmounts when
 * the server changes, which starts the history over like core's.
 */
export function ConsoleChartsProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const server = useServerStore((state) => state.server);
  const stats = useServerStore((state) => state.stats);

  const networkPrevious = useRef<{ tx: number; rx: number; uptime: number; timestamp: number } | null>(null);
  const wasOffline = useRef(false);

  const cpu = useStreamChart({
    series: useMemo(() => [t('common.stat.cpuLoad', {})], [t]),
    format: formatPercent,
    min: 10,
  });
  const memory = useStreamChart({
    series: useMemo(() => [t('common.stat.memoryLoad', {})], [t]),
    format: formatBytes,
    scale: 'binary',
    min: mbToBytes(64),
  });
  const network = useStreamChart({
    series: useMemo(() => [t('common.stat.outbound', {}), t('common.stat.inbound', {})], [t]),
    format: formatBytesRate,
    scale: 'binary',
  });

  const offline = !stats?.state || (stats.state === 'offline' && server.status !== 'installing');

  useEffect(() => {
    if (offline) {
      networkPrevious.current = null;
      if (!wasOffline.current) {
        wasOffline.current = true;
        cpu.push(0);
        memory.push(0);
        network.push([0, 0]);
      }
      return;
    }

    wasOffline.current = false;
    cpu.push(stats.cpuAbsolute);
    memory.push(stats.memoryBytes);
    const now = performance.now();
    const previous = networkPrevious.current;
    const elapsedSeconds = previous ? (now - previous.timestamp) / 1000 : 0;
    const canCalculateRate =
      previous &&
      elapsedSeconds > 0 &&
      stats.uptime >= previous.uptime &&
      stats.network.txBytes >= previous.tx &&
      stats.network.rxBytes >= previous.rx;

    network.push(
      canCalculateRate
        ? [
            (stats.network.txBytes - previous.tx) / elapsedSeconds,
            (stats.network.rxBytes - previous.rx) / elapsedSeconds,
          ]
        : [0, 0],
    );

    networkPrevious.current = {
      tx: stats.network.txBytes,
      rx: stats.network.rxBytes,
      uptime: stats.uptime,
      timestamp: now,
    };
  }, [stats, offline, cpu.push, memory.push, network.push]);

  return (
    <ConsoleChartsContext.Provider value={{ cpu, memory, network, offline }}>{children}</ConsoleChartsContext.Provider>
  );
}

// ChartBlock's plot is its last div (`min-h-60`, 15rem); the arbitrary variant outranks it inside the layer
const CHART_HEIGHT_CLASS: Record<ChartHeight, string | undefined> = {
  small: '[&>div:last-child]:min-h-40',
  medium: undefined,
  large: '[&>div:last-child]:min-h-80',
};
/**
 * A run of core's live charts; three in a row use core's own grid, so the default page is unchanged. `chartStyle`,
 * `chartHeight` and `chartArrangement` are classes on these elements only, so core's charts elsewhere keep theirs.
 */
export function ChartsWidget({
  charts,
  withBlocks,
  placement,
  className,
}: WidgetProps & { charts: ChartWidget[]; withBlocks: boolean }) {
  const { t } = useTranslations();
  const { chartStyle, chartHeight, chartArrangement } = useNebulaTheme();
  const data = useContext(ConsoleChartsContext);
  if (!data) throw new Error('ChartsWidget renders inside ConsoleChartsProvider');
  const { cpu, memory, network, offline } = data;

  const overlayIcon = <FontAwesomeIcon icon={faPowerOff} className='text-2xl' />;
  const overlayLabel = offline ? t('pages.server.console.stats.offline', {}) : undefined;
  const blockClass = CHART_HEIGHT_CLASS[chartHeight];

  const blocks: Record<ChartWidget, ReactNode> = {
    cpuChart: (
      <ChartBlock
        key='cpuChart'
        className={blockClass}
        icon={<FontAwesomeIcon icon={faMicrochip} />}
        title={t('common.stat.cpuLoad', {})}
        value={cpu.value}
        overlayIcon={overlayIcon}
        overlayLabel={overlayLabel}
      >
        <StreamChart {...cpu.props} />
      </ChartBlock>
    ),
    memoryChart: (
      <ChartBlock
        key='memoryChart'
        className={blockClass}
        icon={<FontAwesomeIcon icon={faMemory} />}
        title={t('common.stat.memoryLoad', {})}
        value={memory.value}
        overlayIcon={overlayIcon}
        overlayLabel={overlayLabel}
      >
        <StreamChart {...memory.props} />
      </ChartBlock>
    ),
    networkChart: (
      <ChartBlock
        key='networkChart'
        className={blockClass}
        icon={<FontAwesomeIcon icon={faCloudDownload} />}
        title={t('common.stat.network', {})}
        legend={<ChartLegend {...network.legend} />}
        overlayIcon={overlayIcon}
        overlayLabel={overlayLabel}
      >
        <StreamChart {...network.props} />
      </ChartBlock>
    ),
  };

  const grid =
    placement === 'side' || charts.length === 1 || chartArrangement === 'stacked'
      ? 'grid grid-cols-1 gap-4'
      : charts.length === 2
        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
        : 'grid grid-cols-1 md:grid-cols-3 gap-4';
  // recharts draws the filled area as `.recharts-area-area` with a gradient fill attribute; 'line' leaves the stroke
  const style = chartStyle === 'line' ? '[&_.recharts-area-area]:fill-none' : '';

  return (
    <div className={[grid, style, className].filter(Boolean).join(' ')}>
      {charts.map((chart) => blocks[chart])}
      {withBlocks && <StatBlocks />}
    </div>
  );
}

/** Core's console stat card slot, where other extensions add their cards; hidden while empty. */
export function ExtensionCardsWidget({ placement, className, withBlocks }: WidgetProps & { withBlocks: boolean }) {
  const grid = placement === 'row' ? 'grid sm:grid-cols-2 xl:grid-cols-4 gap-4' : 'grid gap-4';

  return (
    <div className={`${grid} ${className ?? ''} empty:hidden`}>
      <ExtensionSlot
        components={window.extensionContext.extensionRegistry.pages.server.console.statCards}
        name='console-stat-card'
      />
      {withBlocks && <StatBlocks />}
    </div>
  );
}
