import { faPlay, faRotateRight, faSkull, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Button,
  ConfirmationModal,
  ExtensionSlot,
  Group,
  ServerCan,
  SocketRequest,
  useServerStore,
  useTranslations,
} from '../../lib/core.ts';

/** `size` shrinks the buttons for the console's slim banners; Home and the full banner use Mantine's default. */
export default function PowerButtons({ size }: { size?: 'xs' | 'compact-sm' }) {
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

  // as core's ServerPowerControls: a server that stopped on its own needs no kill
  useEffect(() => {
    if (state === 'offline') setConfirmKill(false);
  }, [state]);

  return (
    <Group gap='xs' className='max-sm:w-full max-sm:*:grow'>
      {/* other extensions' power buttons, in the slots core's ServerPowerControls renders them in */}
      <ExtensionSlot
        components={
          window.extensionContext.extensionRegistry.pages.server.console.powerButtonComponents.prependedComponents
        }
        name='console-powerbutton-prepended'
      />
      <ServerCan action='control.start'>
        <Button
          size={size}
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
          size={size}
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
          size={size}
          color='red'
          leftSection={<FontAwesomeIcon icon={stopping ? faSkull : faStop} />}
          disabled={blocked || state === 'offline'}
          onClick={() => (stopping ? setConfirmKill(true) : send('stop'))}
        >
          {stopping ? t('common.enum.serverPowerAction.kill', {}) : t('common.enum.serverPowerAction.stop', {})}
        </Button>
      </ServerCan>

      <ExtensionSlot
        components={
          window.extensionContext.extensionRegistry.pages.server.console.powerButtonComponents.appendedComponents
        }
        name='console-powerButton-appended'
      />

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
