import type { z } from 'zod';
import { Badge, type serverPowerState, serverStatusInfo, useTranslations } from '../../lib/core.ts';
import type { Server } from './ServerRow.tsx';

/** The status a row or card shows: suspension, then the panel's own status, then the node's power state. */
export default function StatusBadge({
  server,
  state,
  size,
  className,
}: {
  server: Server;
  /** The node's power state from core's live usage, if it reported the server. */
  state: z.infer<typeof serverPowerState> | undefined;
  size: 'xs' | 'sm';
  className?: string;
}) {
  const { t } = useTranslations();

  let label = t('common.enum.serverState.unknown', {});
  let color = 'gray';
  if (server.isSuspended) {
    label = t('common.server.state.suspended', {});
    color = 'red';
  } else if (server.status) {
    label = serverStatusInfo[server.status].label();
    color = serverStatusInfo[server.status].badgeColor;
  } else if (state) {
    label = t(`common.enum.serverState.${state}`, {});
    color = state === 'running' ? 'green' : state === 'offline' ? 'red' : 'yellow';
  }

  return (
    <Badge variant='light' color={color} size={size} className={className}>
      {label}
    </Badge>
  );
}
