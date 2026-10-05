import {
  faEllipsisVertical,
  faGamepad,
  faHardDrive,
  faMemory,
  faMicrochip,
  faPlay,
  faRotateRight,
  faSkull,
  faStop,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import {
  ActionIcon,
  bytesToString,
  Card,
  Checkbox,
  ConfirmationModal,
  CopyOnClick,
  formatAllocation,
  Group,
  Menu,
  mbToBytes,
  Text,
  Title,
  useAuth,
  useBulkPowerActions,
  useServerStats,
  useTranslations,
} from '../../lib/core.ts';
import { shownAddress, useRedactAddresses } from '../../lib/redact.ts';
import type { ServerCardStyle } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import type { Server } from './ServerRow.tsx';
import StatusBadge from './StatusBadge.tsx';

const SHADE = 'var(--nebula-card)';

/**
 * The servers grid for each card style. The breakpoints are container queries on the page content, so a
 * phone gets one column of everything; linear cards are rows and compact ones fit the most per line.
 */
export const GRID_CLASS: Record<ServerCardStyle, string> = {
  default: 'gap-4 grid md:grid-cols-2',
  banner: 'gap-4 grid md:grid-cols-2',
  flat: 'gap-4 grid md:grid-cols-2',
  linear: 'gap-2 grid grid-cols-1',
  minimal: 'gap-3 grid sm:grid-cols-2 xl:grid-cols-3',
  compact: 'gap-2 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

/** The egg's icon, else its art (both sanitised URLs, see normalizeTheme), else a gamepad tile. */
function Emblem({ icon, art, className }: { icon?: string; art?: string; className: string }) {
  const src = icon || art;
  return src ? (
    <img src={src} alt='' className={`${className} shrink-0 rounded-md object-cover`} />
  ) : (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-md bg-(--mantine-color-blue-light) text-(--mantine-color-blue-light-color)`}
    >
      <FontAwesomeIcon icon={faGamepad} />
    </span>
  );
}

interface Props {
  server: Server;
  art?: string;
  icon?: string;
  variant: ServerCardStyle;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}

export default function ServerCard({ server, art, icon, variant, selected, onSelect }: Props) {
  const { t } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const { user } = useAuth();
  const stats = useServerStats(server);
  const redact = useRedactAddresses();
  const { handleBulkPowerAction, bulkActionLoading } = useBulkPowerActions();
  const [confirmKill, setConfirmKill] = useState(false);

  const state = stats?.state;
  // a server that stopped on its own needs no kill, so the confirmation closes instead of sending one
  useEffect(() => {
    if (state !== 'stopping') setConfirmKill(false);
  }, [state]);
  const running = state === 'running';
  const memoryLimit = server.limits.memory ? bytesToString(mbToBytes(server.limits.memory)) : t('common.unlimited', {});
  const diskLimit = server.limits.disk ? bytesToString(mbToBytes(server.limits.disk)) : t('common.unlimited', {});
  const allocation = server.allocation ? formatAllocation(server.allocation, server.egg.separatePort) : null;
  // core's "Hide server addresses" masks what is shown; the copy button still copies the real address
  const address = allocation ? shownAddress(allocation, redact) : t('common.server.noAllocation', {});

  const statList: [string, string, IconDefinition][] = [
    [
      tExt('servers.column.memory', {}),
      running ? `${bytesToString(stats?.memoryBytes ?? 0)} / ${memoryLimit}` : memoryLimit,
      faMemory,
    ],
    [tExt('servers.cpu', {}), running ? `${(stats?.cpuAbsolute ?? 0).toFixed(2)}%` : '--', faMicrochip],
    [tExt('servers.disk', {}), `${bytesToString(stats?.diskBytes ?? 0)} / ${diskLimit}`, faHardDrive],
  ];

  // narrower cards wrap a long value such as "1.23 GiB / 16.00 GiB" at its spaces instead of cutting it
  const stat = (label: string, value: string, valueClass = 'truncate max-xl:whitespace-normal') => (
    <div key={label} className='min-w-0'>
      <Text size='xs' c='dimmed'>
        {label}
      </Text>
      <Text size='sm' className={valueClass}>
        {value}
      </Text>
    </div>
  );

  // icons stand in for the labels (kept as their titles, for screen readers) so the line fits a phone; short
  // values such as the CPU load stay whole and the long "used / limit" ones give way
  const statLine = (
    <div className='flex min-w-0 gap-3 whitespace-nowrap text-xs text-(--mantine-color-dimmed)'>
      {statList.map(([name, value, icon]) => (
        <span key={name} className={value.length <= 8 ? 'shrink-0' : 'truncate'}>
          <FontAwesomeIcon icon={icon} title={name} className='mr-1' />
          <span className='text-(--mantine-color-text)'>{value}</span>
        </span>
      ))}
    </div>
  );

  const outline = selected ? 'outline-2! -outline-offset-1! outline-(--mantine-color-blue-filled)!' : '';
  const to = `/server/${server.uuidShort}`;

  // outside the link and above its ::after, like the menu and the copy button, so using it never navigates
  const checkbox = (
    <Checkbox
      checked={selected}
      onChange={(e) => onSelect(e.currentTarget.checked)}
      aria-label={tExt('servers.select', { name: server.name })}
    />
  );

  const badge = (size: 'xs' | 'sm') => <StatusBadge server={server} state={state} size={size} />;

  // the same checks as core's server list (ServerItem): the user's or their role's control permissions, no power
  // while the panel or the node is busy with the server, and each action only where it makes sense
  const permissions = [...server.permissions, ...(user?.role?.serverPermissions ?? [])];
  const can = (permission: string) => permissions.includes('*') || permissions.includes(permission);
  const blocked =
    !!server.status ||
    server.isSuspended ||
    server.isTransferring ||
    server.nodeMaintenanceEnabled ||
    bulkActionLoading !== null;
  const canStart = can('control.start');
  const canRestart = can('control.restart');
  const canStop = can('control.stop');

  const powerMenu = (canStart || canRestart || canStop) && (
    <>
      <Menu>
        <Menu.Target>
          <ActionIcon variant='subtle' color='gray' aria-label={tExt('servers.actions', {})}>
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {canStart && (
            <Menu.Item
              leftSection={<FontAwesomeIcon icon={faPlay} />}
              disabled={blocked || state !== 'offline'}
              onClick={() => handleBulkPowerAction([server.uuid], 'start')}
            >
              {t('common.enum.serverPowerAction.start', {})}
            </Menu.Item>
          )}
          {canRestart && (
            <Menu.Item
              leftSection={<FontAwesomeIcon icon={faRotateRight} />}
              disabled={blocked || !state}
              onClick={() => handleBulkPowerAction([server.uuid], 'restart')}
            >
              {t('common.enum.serverPowerAction.restart', {})}
            </Menu.Item>
          )}
          {canStop && (
            <Menu.Item
              leftSection={<FontAwesomeIcon icon={faStop} />}
              disabled={blocked || !state || state === 'offline'}
              onClick={() => handleBulkPowerAction([server.uuid], 'stop')}
            >
              {t('common.enum.serverPowerAction.stop', {})}
            </Menu.Item>
          )}
          {canStop && state === 'stopping' && (
            <Menu.Item
              color='red'
              leftSection={<FontAwesomeIcon icon={faSkull} />}
              disabled={blocked}
              onClick={() => setConfirmKill(true)}
            >
              {t('common.enum.serverPowerAction.kill', {})}
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
      <ConfirmationModal
        opened={confirmKill}
        onClose={() => setConfirmKill(false)}
        title={t('pages.server.console.power.modal.forceStop.title', {})}
        confirm={t('common.button.continue', {})}
        onConfirmed={() => {
          setConfirmKill(false);
          return handleBulkPowerAction([server.uuid], 'kill');
        }}
      >
        {t('pages.server.console.power.modal.forceStop.content', {}).md()}
      </ConfirmationModal>
    </>
  );

  const actions = (
    <Group gap='xs' wrap='nowrap' className='relative z-1 shrink-0'>
      {badge('sm')}
      {powerMenu}
    </Group>
  );

  const copyAddress = (
    <CopyOnClick content={allocation ?? ''} enabled={!!allocation} className='relative z-1 max-w-full text-left!'>
      <Text size='sm' c='dimmed' truncate>
        {address}
      </Text>
    </CopyOnClick>
  );

  const names = (
    <>
      <Text fw={600} truncate>
        {server.name}
      </Text>
      <Text size='xs' c='dimmed' truncate>
        {server.egg.name}
      </Text>
    </>
  );

  // the link's ::after covers the whole card; the checkbox, the menu and the copy button sit above it
  const link = (className: string, children: React.ReactNode) => (
    <NavLink to={to} className={`min-w-0 after:absolute after:inset-0 ${className}`}>
      {children}
    </NavLink>
  );

  if (variant === 'banner') {
    // the art gets a strip of its own, without a scrim; the name sits under it
    const strip = art
      ? `url("${art}")`
      : `linear-gradient(120deg, color-mix(in srgb, var(--mantine-color-blue-filled) 70%, ${SHADE}), color-mix(in srgb, var(--nebula-highlight) 40%, ${SHADE}))`;
    return (
      <Card p={0} hoverable className={`relative overflow-hidden ${outline}`}>
        <div className='absolute top-3 left-3 z-1'>{checkbox}</div>
        <div
          className='h-24 shrink-0 bg-cover bg-center border-b border-(--mantine-color-default-border)'
          style={{ backgroundImage: strip }}
        />
        <div className='flex items-center justify-between gap-3 px-4 pt-3'>
          {link(
            '',
            <Group gap='sm' wrap='nowrap'>
              <Emblem icon={icon} className='size-9' />
              <div className='min-w-0'>
                <Title order={4} className='truncate!'>
                  {server.name}
                </Title>
                <Text size='xs' c='dimmed' truncate>
                  {server.egg.name}
                </Text>
              </div>
            </Group>,
          )}
          {actions}
        </div>
        <div className='grid grid-cols-3 gap-3 px-4 pt-3'>{statList.map(([name, value]) => stat(name, value))}</div>
        <div className='px-4 pt-2 pb-3'>{copyAddress}</div>
      </Card>
    );
  }

  if (variant === 'flat') {
    return (
      <Card p='md' hoverable withBorder={false} className={`relative ${outline}`}>
        <div className='flex items-center gap-3'>
          <div className='relative z-1 shrink-0'>{checkbox}</div>
          {link(
            'flex-1',
            <Group gap='sm' wrap='nowrap'>
              <Emblem icon={icon} art={art} className='size-10' />
              <div className='min-w-0'>{names}</div>
            </Group>,
          )}
          {actions}
        </div>
        <div className='mt-3 grid grid-cols-3 gap-2'>
          {statList.map(([name, value]) => (
            <div key={name} className='min-w-0 rounded-(--mantine-radius-sm) bg-(--mantine-color-text)/5 px-2.5 py-1.5'>
              <Text size='xs' c='dimmed' truncate>
                {name}
              </Text>
              <Text size='sm' className='truncate max-xl:whitespace-normal'>
                {value}
              </Text>
            </div>
          ))}
        </div>
        <div className='mt-2'>{copyAddress}</div>
      </Card>
    );
  }

  if (variant === 'linear') {
    // one row per server: the art peeks through on the right, behind the stats, like the list view
    const backgroundImage = art
      ? `linear-gradient(90deg, ${SHADE} 55%, color-mix(in srgb, ${SHADE} 85%, transparent) 78%, color-mix(in srgb, ${SHADE} 65%, transparent)), url("${art}")`
      : undefined;
    return (
      <Card p={0} hoverable className={`relative overflow-hidden ${outline}`}>
        <div
          className='flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 bg-cover bg-right'
          style={{ backgroundImage }}
        >
          <div className='relative z-1 shrink-0'>{checkbox}</div>
          {link(
            'flex-1',
            <Group gap='sm' wrap='nowrap'>
              <Emblem icon={icon} className='size-9' />
              <div className='min-w-0'>{names}</div>
            </Group>,
          )}
          {/* fixed widths from here on, so the columns line up from row to row whatever the name and status */}
          <div className='shrink-0 lg:w-28'>{badge('sm')}</div>
          <div className='w-44 shrink-0 max-xl:hidden'>{copyAddress}</div>
          <div className='grid shrink-0 grid-cols-[11rem_6rem_11rem] gap-3 max-lg:hidden'>
            {statList.map(([name, value]) => stat(name, value, 'truncate!'))}
          </div>
          <div className='relative z-1 shrink-0'>{powerMenu}</div>
          {/* narrower pages lose the stat columns, so the stats wrap onto a line of their own under the name */}
          <div className='min-w-0 basis-full pl-8 lg:hidden'>{statLine}</div>
        </div>
      </Card>
    );
  }

  if (variant === 'minimal') {
    return (
      <Card p='md' hoverable className={`relative ${outline}`}>
        <div className='flex items-center gap-3'>
          <div className='relative z-1 shrink-0'>{checkbox}</div>
          {link(
            'flex flex-1 items-center gap-2',
            <>
              <Emblem icon={icon} art={art} className='size-6 text-xs' />
              <Text fw={600} truncate>
                {server.name}
              </Text>
            </>,
          )}
          {actions}
        </div>
        <div className='mt-2'>{statLine}</div>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card p='xs' hoverable className={`relative ${outline}`}>
        <div className='flex items-center gap-2'>
          <div className='relative z-1 shrink-0'>{checkbox}</div>
          <Emblem icon={icon} art={art} className='size-8 text-sm' />
          <div className='flex min-w-0 flex-1 flex-col items-start gap-0.5'>
            {link(
              'max-w-full',
              <Text size='sm' fw={600} truncate>
                {server.name}
              </Text>,
            )}
            {badge('xs')}
          </div>
          <div className='relative z-1 shrink-0'>{powerMenu}</div>
        </div>
      </Card>
    );
  }

  // art is a sanitised URL (see normalizeTheme); the scrim keeps the name readable on any picture
  const backgroundImage = art
    ? `linear-gradient(0deg, ${SHADE}, color-mix(in srgb, ${SHADE} 45%, transparent) 60%, color-mix(in srgb, ${SHADE} 25%, transparent)), url("${art}")`
    : `linear-gradient(120deg, color-mix(in srgb, var(--mantine-color-blue-filled) 26%, ${SHADE}), ${SHADE} 75%)`;

  return (
    <Card p={0} hoverable className={`relative overflow-hidden ${outline}`}>
      <div className='absolute top-3 left-3 z-1'>{checkbox}</div>
      <div className='flex items-end justify-between gap-3 p-4 min-h-32 bg-cover bg-center' style={{ backgroundImage }}>
        <NavLink to={to} className='min-w-0 after:absolute after:inset-0'>
          <Group gap='xs' wrap='nowrap'>
            {icon ? (
              <img src={icon} alt='' className='size-8 rounded-md object-cover shrink-0' />
            ) : (
              <FontAwesomeIcon icon={faGamepad} className='text-(--mantine-color-dimmed)' />
            )}
            <div className='min-w-0'>
              <Title order={4} className='truncate'>
                {server.name}
              </Title>
              <Text size='xs' c='dimmed' truncate>
                {server.egg.name}
              </Text>
            </div>
          </Group>
        </NavLink>

        <Group gap='xs' wrap='nowrap' className='relative z-1'>
          {badge('sm')}
          {powerMenu}
        </Group>
      </div>

      <div className='grid grid-cols-3 gap-3 px-4 py-3 border-t border-(--mantine-color-default-border)'>
        {statList.map(([name, value]) => stat(name, value))}
      </div>

      <div className='px-4 pb-3'>
        <CopyOnClick content={allocation ?? ''} enabled={!!allocation} className='relative z-1'>
          <Text size='sm' c='dimmed' truncate>
            {address}
          </Text>
        </CopyOnClick>
      </div>
    </Card>
  );
}
