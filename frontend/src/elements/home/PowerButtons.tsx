import { faPlay, faRotateRight, faSkull, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Button from '@/elements/Button.tsx';
import { ServerCan } from '@/elements/Can.tsx';
import Group from '@/elements/Group.tsx';
import ConfirmationModal from '@/elements/modals/ConfirmationModal.tsx';
import { SocketRequest } from '@/plugins/useWebsocketEvent.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';

export default function PowerButtons() {
  const { t } = useTranslations();
  const [confirmKill, setConfirmKill] = useState(false);
  const { server, state, socketInstance, socketConnected } = useServerStore(
    useShallow((s) => ({
      server: s.server,
      state: s.state,
      socketInstance: s.socketInstance,
      socketConnected: s.socketConnected,
    })),
  );

  const blocked = !socketConnected || !!server.status || server.isSuspended || server.isTransferring;
  const send = (action: 'start' | 'stop' | 'restart' | 'kill') => socketInstance?.send(SocketRequest.SET_STATE, action);
  const stopping = state === 'stopping';

  return (
    <Group gap='xs' className='max-sm:w-full max-sm:*:grow'>
      <ServerCan action='control.start'>
        <Button
          color='green'
          leftSection={<FontAwesomeIcon icon={faPlay} />}
          disabled={blocked || state !== 'offline'}
          loading={state === 'starting'}
          onClick={() => send('start')}
        >
          {t('common.enum.serverPowerAction.start', {})}
        </Button>
      </ServerCan>
      <ServerCan action='control.restart'>
        <Button
          color='gray'
          leftSection={<FontAwesomeIcon icon={faRotateRight} />}
          disabled={blocked}
          onClick={() => send('restart')}
        >
          {t('common.enum.serverPowerAction.restart', {})}
        </Button>
      </ServerCan>
      <ServerCan action='control.stop'>
        <Button
          color='red'
          leftSection={<FontAwesomeIcon icon={stopping ? faSkull : faStop} />}
          disabled={blocked || state === 'offline'}
          onClick={() => (stopping ? setConfirmKill(true) : send('stop'))}
        >
          {stopping ? t('common.enum.serverPowerAction.kill', {}) : t('common.enum.serverPowerAction.stop', {})}
        </Button>
      </ServerCan>

      <ConfirmationModal
        opened={confirmKill}
        onClose={() => setConfirmKill(false)}
        title={t('pages.server.console.power.modal.forceStop.title', {})}
        confirm={t('common.button.continue', {})}
        onConfirmed={() => {
          send('kill');
          setConfirmKill(false);
        }}
      >
        {t('pages.server.console.power.modal.forceStop.content', {}).md()}
      </ConfirmationModal>
    </Group>
  );
}
