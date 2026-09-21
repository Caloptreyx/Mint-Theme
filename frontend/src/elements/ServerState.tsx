import { useShallow } from 'zustand/react/shallow';
import Badge from '@/elements/Badge.tsx';
import { serverStatusInfo } from '@/lib/server.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';

/** The open server's state as a pill, shared by the Home banner and the console bar. */
export default function ServerState() {
  const { t } = useTranslations();
  const { server, state } = useServerStore(useShallow((s) => ({ server: s.server, state: s.state })));

  let label = t(`common.enum.serverState.${state}`, {});
  let color = state === 'running' ? 'green' : state === 'offline' ? 'red' : 'yellow';
  if (server.isSuspended) {
    label = t('common.server.state.suspended', {});
    color = 'red';
  } else if (server.status) {
    label = serverStatusInfo[server.status].label();
    color = serverStatusInfo[server.status].badgeColor;
  }

  return (
    <Badge variant='light' color={color} tt='none' size='lg' radius='sm' className='shrink-0'>
      <span className='flex items-center gap-2'>
        <span className={`size-2 rounded-full bg-server-status-${server.isSuspended ? 'offline' : state}`} />
        {label}
      </span>
    </Badge>
  );
}
