import { faGamepad } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import Badge from '@/elements/Badge.tsx';
import Code from '@/elements/Code.tsx';
import Checkbox from '@/elements/input/Checkbox.tsx';
import Progress from '@/elements/Progress.tsx';
import Text from '@/elements/Text.tsx';
import type { serverSchema } from '@/lib/schemas/server/server.ts';
import { serverStatusInfo } from '@/lib/server.ts';
import { bytesToString, mbToBytes } from '@/lib/size.ts';
import { formatMilliseconds } from '@/lib/time.ts';
import { useServerStats } from '@/plugins/server/useServerStats.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useExtTranslations } from '../../translations.ts';

export type Server = z.infer<typeof serverSchema>;
/** What the status column ended up showing, so the page can filter on it. */
export type RowStatus = 'running' | 'offline' | 'suspended' | 'other';

/** Shared by the header strip and every row so the columns line up. */
export const ROW_GRID =
  'grid grid-cols-1 lg:grid-cols-[2rem_6rem_minmax(0,1fr)_minmax(0,1.4fr)_6.5rem_minmax(0,1fr)_9rem_9rem_5rem] items-center gap-3 px-4';

const NONE = '—';

interface Props {
  server: Server;
  art?: string;
  icon?: string;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onStatus: (uuid: string, status: RowStatus) => void;
}

export default function ServerRow({ server, art, icon, selected, onSelect, onStatus }: Props) {
  const { t } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const navigate = useNavigate();
  const stats = useServerStats(server);

  const state = stats?.state;
  let status: RowStatus = 'other';
  let label = t('common.enum.serverState.unknown', {});
  let color = 'gray';

  if (server.isSuspended) {
    status = 'suspended';
    label = t('common.server.state.suspended', {});
    color = 'red';
  } else if (server.status) {
    label = serverStatusInfo[server.status].label();
    color = serverStatusInfo[server.status].badgeColor;
  } else if (state) {
    status = state === 'running' ? 'running' : state === 'offline' ? 'offline' : 'other';
    label = t(`common.enum.serverState.${state}`, {});
    color = state === 'running' ? 'green' : state === 'offline' ? 'red' : 'yellow';
  }

  useEffect(() => onStatus(server.uuid, status), [server.uuid, status, onStatus]);

  const running = state === 'running';
  const memoryLimit = mbToBytes(server.limits.memory);
  const percent = (used: number, limit: number) => (limit === 0 ? 0 : Math.min(100, (used / limit) * 100));

  const meter = (value: string, filled: number) => (
    <div className='flex items-center gap-2 min-w-0'>
      <Progress value={filled} size='xs' hourglass={false} withLabel={false} className='w-14 shrink-0' />
      <Text size='sm' c='dimmed' truncate>
        {value}
      </Text>
    </div>
  );

  // art is a sanitised URL (see normalizeTheme); it only peeks through on the right so the columns stay readable
  const backgroundImage = art
    ? `linear-gradient(90deg, var(--nebula-card) 62%, color-mix(in srgb, var(--nebula-card) 90%, transparent) 82%, color-mix(in srgb, var(--nebula-card) 80%, transparent)), url("${art}")`
    : undefined;

  return (
    <div
      role='link'
      tabIndex={0}
      aria-label={server.name}
      className={`${ROW_GRID} py-3 bg-cover bg-right border-b border-(--mantine-color-default-border) last:border-b-0 cursor-pointer transition-colors hover:bg-white/2 light:hover:bg-black/2`}
      style={{ backgroundImage }}
      onClick={(e) => {
        // stopping propagation on the checkbox would also swallow React's change event
        if ((e.target as HTMLElement).closest('[data-row-select]')) return;
        navigate(`/server/${server.uuidShort}`);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/server/${server.uuidShort}`);
        }
      }}
    >
      <div data-row-select>
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(e.currentTarget.checked)}
          aria-label={tExt('servers.select', { name: server.name })}
        />
      </div>

      <Code>{server.uuidShort}</Code>

      <div className='flex items-center gap-2 min-w-0'>
        {icon ? (
          <img src={icon} alt='' className='size-4 rounded-sm object-cover shrink-0' />
        ) : (
          <FontAwesomeIcon icon={faGamepad} className='text-(--mantine-color-dimmed)' />
        )}
        <Text size='sm' c='dimmed' truncate>
          {server.egg.name}
        </Text>
      </div>

      <Text fw={600} truncate>
        {server.name}
      </Text>

      <Badge variant='light' color={color} size='sm'>
        {label}
      </Badge>

      <Text size='sm' c='dimmed' truncate>
        {server.locationName}
      </Text>

      {meter(
        `${running ? `${(stats?.cpuAbsolute ?? 0).toFixed(0)}%` : NONE} / ${server.limits.cpu ? `${server.limits.cpu}%` : '∞'}`,
        running ? percent(stats?.cpuAbsolute ?? 0, server.limits.cpu) : 0,
      )}

      {meter(
        `${running ? bytesToString(stats?.memoryBytes ?? 0) : NONE} / ${memoryLimit ? bytesToString(memoryLimit) : '∞'}`,
        running ? percent(stats?.memoryBytes ?? 0, memoryLimit) : 0,
      )}

      <Text size='sm' c='dimmed'>
        {running && stats?.uptime ? formatMilliseconds(stats.uptime, true, false) : NONE}
      </Text>
    </div>
  );
}
