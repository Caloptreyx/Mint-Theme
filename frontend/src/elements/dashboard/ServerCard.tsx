import { faEllipsisVertical, faGamepad, faPlay, faRotateRight, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect } from 'react';
import { NavLink } from 'react-router';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Badge from '@/elements/Badge.tsx';
import Card from '@/elements/Card.tsx';
import CopyOnClick from '@/elements/CopyOnClick.tsx';
import Group from '@/elements/Group.tsx';
import Menu from '@/elements/Menu.tsx';
import Text from '@/elements/Text.tsx';
import Title from '@/elements/Title.tsx';
import { formatAllocation, serverStatusInfo } from '@/lib/server.ts';
import { bytesToString, mbToBytes } from '@/lib/size.ts';
import { useBulkPowerActions } from '@/plugins/server/useBulkPowerActions.ts';
import { useServerStats } from '@/plugins/server/useServerStats.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useExtTranslations } from '../../translations.ts';
import type { RowStatus, Server } from './ServerRow.tsx';

const SHADE = 'var(--nebula-card)';

interface Props {
  server: Server;
  art?: string;
  icon?: string;
  onStatus: (uuid: string, status: RowStatus) => void;
}

export default function ServerCard({ server, art, icon, onStatus }: Props) {
  const { t } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const stats = useServerStats(server);
  const { handleBulkPowerAction, bulkActionLoading } = useBulkPowerActions();

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
  const memoryLimit = server.limits.memory ? bytesToString(mbToBytes(server.limits.memory)) : t('common.unlimited', {});
  const diskLimit = server.limits.disk ? bytesToString(mbToBytes(server.limits.disk)) : t('common.unlimited', {});
  const address = server.allocation
    ? formatAllocation(server.allocation, server.egg.separatePort)
    : t('common.server.noAllocation', {});

  // art is a sanitised URL (see normalizeTheme); the scrim keeps the name readable on any picture
  const backgroundImage = art
    ? `linear-gradient(0deg, ${SHADE}, color-mix(in srgb, ${SHADE} 45%, transparent) 60%, color-mix(in srgb, ${SHADE} 25%, transparent)), url("${art}")`
    : `linear-gradient(120deg, color-mix(in srgb, var(--mantine-color-blue-filled) 26%, ${SHADE}), ${SHADE} 75%)`;

  const stat = (label: string, value: string) => (
    <div className='min-w-0'>
      <Text size='xs' c='dimmed'>
        {label}
      </Text>
      <Text size='sm' truncate>
        {value}
      </Text>
    </div>
  );

  return (
    <Card p={0} hoverable className='overflow-hidden'>
      <div className='flex items-end justify-between gap-3 p-4 min-h-32 bg-cover bg-center' style={{ backgroundImage }}>
        <NavLink to={`/server/${server.uuidShort}`} className='min-w-0'>
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

        <Group gap='xs' wrap='nowrap'>
          <Badge variant='light' color={color} size='sm'>
            {label}
          </Badge>
          <Menu>
            <Menu.Target>
              <ActionIcon variant='subtle' color='gray' aria-label={tExt('servers.actions', {})}>
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<FontAwesomeIcon icon={faPlay} />}
                disabled={!!bulkActionLoading || server.isSuspended}
                onClick={() => handleBulkPowerAction([server.uuid], 'start')}
              >
                {t('common.enum.serverPowerAction.start', {})}
              </Menu.Item>
              <Menu.Item
                leftSection={<FontAwesomeIcon icon={faRotateRight} />}
                disabled={!!bulkActionLoading || server.isSuspended}
                onClick={() => handleBulkPowerAction([server.uuid], 'restart')}
              >
                {t('common.enum.serverPowerAction.restart', {})}
              </Menu.Item>
              <Menu.Item
                leftSection={<FontAwesomeIcon icon={faStop} />}
                disabled={!!bulkActionLoading || server.isSuspended}
                onClick={() => handleBulkPowerAction([server.uuid], 'stop')}
              >
                {t('common.enum.serverPowerAction.stop', {})}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </div>

      <div className='grid grid-cols-3 gap-3 px-4 py-3 border-t border-(--mantine-color-default-border)'>
        {stat(
          tExt('servers.column.memory', {}),
          running ? `${bytesToString(stats?.memoryBytes ?? 0)} / ${memoryLimit}` : memoryLimit,
        )}
        {stat(tExt('servers.cpu', {}), running ? `${(stats?.cpuAbsolute ?? 0).toFixed(2)}%` : '--')}
        {stat(tExt('servers.disk', {}), `${bytesToString(stats?.diskBytes ?? 0)} / ${diskLimit}`)}
      </div>

      <div className='px-4 pb-3'>
        <CopyOnClick content={address} enabled={!!server.allocation}>
          <Text size='sm' c='dimmed' truncate>
            {address}
          </Text>
        </CopyOnClick>
      </div>
    </Card>
  );
}
