import {
  faClock,
  faCloudArrowDown,
  faCloudArrowUp,
  faHardDrive,
  faMemory,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import ServerContentContainer from '@/elements/containers/ServerContentContainer.tsx';
import ExtensionSlot from '@/elements/ExtensionSlot.tsx';
import { bytesToString, mbToBytes } from '@/lib/size.ts';
import { formatMilliseconds } from '@/lib/time.ts';
import ServerStats from '@/pages/server/console/stats/ServerStats.tsx';
import Console from '@/pages/server/console/terminal/Console.tsx';
import { useVisualViewportBottomInset } from '@/plugins/useVisualViewport.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';
import HeroCard, { Pill } from '../elements/home/HeroCard.tsx';
import { useNebulaTheme } from '../lib/apply.ts';

const NONE = '--';

/**
 * Core's terminal and charts under the Home banner, which carries the live stats as pills.
 * Laid out like Midnight: banner, full width terminal, then the charts.
 */
export default function ServerConsole() {
  const { t } = useTranslations();
  const theme = useNebulaTheme();
  const { server, stats, state } = useServerStore(
    useShallow((s) => ({ server: s.server, stats: s.stats, state: s.state })),
  );
  const keyboardInset = useVisualViewportBottomInset();

  // network throughput from successive samples, the socket only reports running totals
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

  const eggImages = theme.eggs[server.egg.uuid];
  const offline = state === 'offline' && server.status !== 'installing';
  const unlimited = t('common.unlimited', {});
  const live = (value: string) => (offline ? NONE : value);

  return (
    <ServerContentContainer
      title={t('pages.server.console.title', {})}
      hideTitleComponent
      registry={window.extensionContext.extensionRegistry.pages.server.console.container}
    >
      <div className='mb-4'>
        <HeroCard banner={eggImages?.banner || theme.homeBanner} icon={eggImages?.icon}>
          <Pill icon={faClock} label={t('common.stat.uptime', {})}>
            {live(formatMilliseconds(stats?.uptime || 0))}
          </Pill>
          <Pill icon={faMicrochip} label={t('common.stat.cpuLoad', {})}>
            {live(`${(stats?.cpuAbsolute || 0).toFixed(2)}%`)} /{' '}
            {server.limits.cpu ? `${server.limits.cpu}%` : unlimited}
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

      <div
        className='flex flex-col h-[62vh] min-h-72 mb-4'
        style={
          keyboardInset > 0 ? { height: `max(8rem, min(62vh, calc(100dvh - ${keyboardInset}px - 7rem)))` } : undefined
        }
      >
        <Console />
      </div>

      {/* other extensions' stat cards, core shows them beside the terminal */}
      <div className='grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 empty:hidden'>
        <ExtensionSlot
          components={window.extensionContext.extensionRegistry.pages.server.console.statCards}
          name='console-stat-card'
        />
      </div>

      <ServerStats />
    </ServerContentContainer>
  );
}
