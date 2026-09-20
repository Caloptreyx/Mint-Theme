import Group from '@/elements/Group.tsx';
import Text from '@/elements/Text.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';

function formatUptime(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m ${total % 60}s`;
}

export default function ServerState() {
  const { t } = useTranslations();
  const state = useServerStore((s) => s.state);
  const uptime = useServerStore((s) => s.stats?.uptime ?? 0);

  return (
    <Group gap={8} wrap='nowrap' className='self-center mr-2'>
      <span className={`size-2.5 rounded-full bg-server-status-${state}`} />
      <Text size='sm' fw={500}>
        {t(`common.enum.serverState.${state}`, {})}
      </Text>
      {state === 'running' && uptime > 0 && (
        <Text size='sm' c='dimmed'>
          {formatUptime(uptime)}
        </Text>
      )}
    </Group>
  );
}
