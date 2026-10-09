import { faCopy, faExternalLink, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button as MantineButton, RingProgress } from '@mantine/core';
import { useShallow } from 'zustand/react/shallow';
import { useNebulaTheme } from '../../lib/apply.ts';
import {
  Button,
  bytesToString,
  Card,
  CopyOnClick,
  formatAllocation,
  mbToBytes,
  ServerCan,
  SocketRequest,
  TitleCard,
  Tooltip,
  useAuth,
  useServerStore,
  useTranslations,
} from '../../lib/core.ts';
import { shownAddress, useRedactAddresses } from '../../lib/redact.ts';
import { useExtTranslations } from '../../translations.ts';
import { Row, type WidgetProps } from './ConsoleWidgets.tsx';

const NONE = '--';

/** One ring: filled to the share of its limit (empty without one), amber from 70% and red from 90%. */
function Gauge(props: { label: string; value: string; used: number | null; limit: number; limitLabel: string }) {
  const { label, value, used, limit, limitLabel } = props;
  const { t } = useTranslations();
  const percent = used !== null && limit > 0 ? Math.min(100, (used / limit) * 100) : null;
  const color = percent === null ? 'gray' : percent >= 90 ? 'red' : percent >= 70 ? 'yellow' : 'blue';

  return (
    <div className='flex min-w-0 flex-col items-center gap-1 text-center'>
      <RingProgress
        size={84}
        thickness={8}
        roundCaps
        sections={percent ? [{ value: percent, color }] : []}
        label={
          <span className='block text-center text-sm font-semibold tabular-nums'>
            {percent === null ? NONE : `${Math.round(percent)}%`}
          </span>
        }
      />
      <span className='text-xs font-medium'>{label}</span>
      <span className='max-w-full truncate text-xs text-(--mantine-color-dimmed) tabular-nums'>
        {value} / {limit > 0 ? limitLabel : t('common.unlimited', {})}
      </span>
    </div>
  );
}

/** Ring meters for CPU, memory and disk against the server's limits, from core's live stats. */
export function GaugesWidget({ className }: WidgetProps) {
  const { t } = useTranslations();
  const { server, stats, state } = useServerStore(
    useShallow((s) => ({ server: s.server, stats: s.stats, state: s.state })),
  );
  const offline = state === 'offline' && server.status !== 'installing';

  return (
    <Card className={className}>
      <div className='grid grid-cols-3 gap-2'>
        <Gauge
          label={t('common.stat.cpuLoad', {})}
          value={offline ? NONE : `${(stats?.cpuAbsolute || 0).toFixed(1)}%`}
          used={offline ? null : stats?.cpuAbsolute || 0}
          limit={server.limits.cpu}
          limitLabel={`${server.limits.cpu}%`}
        />
        <Gauge
          label={t('common.stat.memoryLoad', {})}
          value={offline ? NONE : bytesToString(stats?.memoryBytes || 0)}
          used={offline ? null : stats?.memoryBytes || 0}
          limit={mbToBytes(server.limits.memory)}
          limitLabel={bytesToString(mbToBytes(server.limits.memory))}
        />
        <Gauge
          label={t('common.stat.diskUsage', {})}
          value={bytesToString(stats?.diskBytes || 0)}
          used={stats?.diskBytes || 0}
          limit={mbToBytes(server.limits.disk)}
          limitLabel={bytesToString(mbToBytes(server.limits.disk))}
        />
      </div>
    </Card>
  );
}

/**
 * The theme's quick commands as buttons, sent over the server's websocket like core's console input, for the
 * users core gives that input (`control.console`) and only while it would be enabled.
 */
export function CommandsWidget({ placement, className }: WidgetProps) {
  const { t } = useExtTranslations();
  const { consoleCommands } = useNebulaTheme();
  const { socketInstance, socketConnected, state } = useServerStore(
    useShallow((s) => ({ socketInstance: s.socketInstance, socketConnected: s.socketConnected, state: s.state })),
  );
  if (consoleCommands.length === 0) return null;
  const disabled = !socketConnected || state === 'offline';

  return (
    <ServerCan action='control.console'>
      <Card className={className} p='sm'>
        <span className='mb-2 block text-xs font-semibold uppercase tracking-wider text-(--mantine-color-dimmed)'>
          {t('console.commands', {})}
        </span>
        <div className={placement === 'row' ? 'flex flex-wrap gap-2' : 'grid gap-2'}>
          {consoleCommands.map(({ label, command }, index) => (
            // the operator's list, only changed in the theme editor; labels may repeat
            <Tooltip key={index} label={command}>
              <Button
                variant='light'
                size='xs'
                disabled={disabled}
                leftSection={<FontAwesomeIcon icon={faTerminal} />}
                onClick={() => socketInstance?.send(SocketRequest.SEND_COMMAND, command)}
              >
                {label}
              </Button>
            </Tooltip>
          ))}
        </div>
      </Card>
    </ServerCan>
  );
}

/** The allocation and the SFTP details with copy buttons and an `sftp://` link; addresses masked like the other cards. */
export function ConnectWidget({ className }: WidgetProps) {
  const { t } = useExtTranslations();
  const { t: core } = useTranslations();
  const server = useServerStore((s) => s.server);
  const { user } = useAuth();
  const redact = useRedactAddresses();

  const address = server.allocation
    ? formatAllocation(server.allocation, server.egg.separatePort)
    : core('common.server.noAllocation', {});
  const username = `${user?.username ?? ''}.${server.uuidShort}`;
  const copy = <FontAwesomeIcon icon={faCopy} className='ml-1.5 text-xs text-(--mantine-color-dimmed)' />;

  return (
    <div className={className}>
      <TitleCard title={t('console.connect', {})}>
        <Row label={t('home.address', {})}>
          <CopyOnClick content={address} enabled={!!server.allocation}>
            {server.allocation ? shownAddress(address, redact) : address}
            {server.allocation && copy}
          </CopyOnClick>
        </Row>
        <Row label={core('common.form.host', {})}>
          <CopyOnClick content={server.sftpHost}>
            {shownAddress(server.sftpHost, redact)}
            {copy}
          </CopyOnClick>
        </Row>
        <Row label={core('common.form.port', {})}>
          <CopyOnClick content={String(server.sftpPort)}>
            <span className='tabular-nums'>{server.sftpPort}</span>
            {copy}
          </CopyOnClick>
        </Row>
        <Row label={core('common.form.username', {})}>
          <CopyOnClick content={username}>
            {username}
            {copy}
          </CopyOnClick>
        </Row>
        <MantineButton
          component='a'
          href={`sftp://${username}@${server.sftpHost}:${server.sftpPort}`}
          variant='light'
          fullWidth
          mt='sm'
          leftSection={<FontAwesomeIcon icon={faExternalLink} />}
        >
          {core('pages.server.files.modal.sftpDetails.launch', {})}
        </MantineButton>
      </TitleCard>
    </div>
  );
}
