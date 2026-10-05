import { faGamepad } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { NavLink } from 'react-router';
import type { z } from 'zod';
import {
  bytesToString,
  Card,
  Checkbox,
  Code,
  formatMilliseconds,
  mbToBytes,
  Progress,
  type serverSchema,
  Text,
  useServerStats,
} from '../../lib/core.ts';
import { useExtTranslations } from '../../translations.ts';
import StatusBadge from './StatusBadge.tsx';

export type Server = z.infer<typeof serverSchema>;

/**
 * Shared by the header strip and every row so the columns line up. The panel's breakpoints are container
 * queries on the page content (beside the sidebar), not the window. Phones keep the checkbox, the game
 * icon, the name and the status; CPU and RAM come back at `md`, the ID, location and uptime at `lg`
 * (the full table, as it always was there). The tracks here and COLUMN_CLASS below must change together.
 */
export const ROW_GRID =
  'grid grid-cols-[2rem_1.25rem_minmax(0,1fr)_6.5rem] md:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.4fr)_6.5rem_9rem_9rem] lg:grid-cols-[2rem_6rem_minmax(0,1fr)_minmax(0,1.4fr)_6.5rem_minmax(0,1fr)_9rem_9rem_5rem] items-center gap-3 px-4';

export const COLUMNS = ['id', 'game', 'name', 'status', 'location', 'cpu', 'ram', 'uptime'] as const;

/** Hides a column's header cell and its row cells at the same widths. */
export const COLUMN_CLASS: Record<(typeof COLUMNS)[number], string> = {
  id: 'max-lg:hidden!',
  game: '',
  name: '',
  status: '',
  location: 'max-lg:hidden!',
  cpu: 'max-md:hidden!',
  ram: 'max-md:hidden!',
  uptime: 'max-lg:hidden!',
};

const NONE = '—';

interface Props {
  server: Server;
  art?: string;
  icon?: string;
  /** The 'cards' table style: the row becomes a card of its own. */
  card: boolean;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}

export default function ServerRow({ server, art, icon, card, selected, onSelect }: Props) {
  const { t: tExt } = useExtTranslations();
  const stats = useServerStats(server);

  const running = stats?.state === 'running';
  const memoryLimit = mbToBytes(server.limits.memory);
  const percent = (used: number, limit: number) => (limit === 0 ? 0 : Math.min(100, (used / limit) * 100));

  const meter = (value: string, filled: number, className: string) => (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
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

  const cells = (
    <>
      {/* above the name link's ::after, so ticking it never opens the server */}
      <div className='relative z-1'>
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(e.currentTarget.checked)}
          aria-label={tExt('servers.select', { name: server.name })}
        />
      </div>

      <Code className={COLUMN_CLASS.id}>{server.uuidShort}</Code>

      <div className='flex items-center gap-2 min-w-0'>
        {icon ? (
          <img src={icon} alt='' className='size-4 rounded-sm object-cover shrink-0' />
        ) : (
          <FontAwesomeIcon icon={faGamepad} className='text-(--mantine-color-dimmed)' />
        )}
        <Text size='sm' c='dimmed' truncate className='max-md:hidden!'>
          {server.egg.name}
        </Text>
      </div>

      {/* a real link whose ::after covers the row: middle click and the keyboard work like any link */}
      <NavLink
        to={`/server/${server.uuidShort}`}
        className='min-w-0 rounded-sm after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-(--mantine-color-blue-filled)'
      >
        <Text fw={600} truncate>
          {server.name}
        </Text>
      </NavLink>

      <StatusBadge server={server} state={stats?.state} size='sm' className='max-w-full' />

      <Text size='sm' c='dimmed' truncate className={COLUMN_CLASS.location}>
        {server.locationName}
      </Text>

      {meter(
        `${running ? `${(stats?.cpuAbsolute ?? 0).toFixed(0)}%` : NONE} / ${server.limits.cpu ? `${server.limits.cpu}%` : '∞'}`,
        running ? percent(stats?.cpuAbsolute ?? 0, server.limits.cpu) : 0,
        COLUMN_CLASS.cpu,
      )}

      {meter(
        `${running ? bytesToString(stats?.memoryBytes ?? 0) : NONE} / ${memoryLimit ? bytesToString(memoryLimit) : '∞'}`,
        running ? percent(stats?.memoryBytes ?? 0, memoryLimit) : 0,
        COLUMN_CLASS.ram,
      )}

      <Text size='sm' c='dimmed' className={COLUMN_CLASS.uptime}>
        {running && stats?.uptime ? formatMilliseconds(stats.uptime, true, false) : NONE}
      </Text>
    </>
  );

  // a Card keeps the row in step with the theme's blocks (opacity, glass, border); Mantine makes it a flex box
  return card ? (
    <Card
      px='md'
      py='sm'
      hoverable
      style={{ backgroundImage }}
      className={`${ROW_GRID} grid! relative bg-cover bg-right`}
    >
      {cells}
    </Card>
  ) : (
    <div
      style={{ backgroundImage }}
      className={`${ROW_GRID} relative py-3 bg-cover bg-right border-b border-(--mantine-color-default-border) last:border-b-0 transition-colors hover:bg-white/2 light:hover:bg-black/2`}
    >
      {cells}
    </div>
  );
}
