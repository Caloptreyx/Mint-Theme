import { faCopy, faGamepad } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useShallow } from 'zustand/react/shallow';
import Badge from '@/elements/Badge.tsx';
import Card from '@/elements/Card.tsx';
import CopyOnClick from '@/elements/CopyOnClick.tsx';
import Group from '@/elements/Group.tsx';
import Title from '@/elements/Title.tsx';
import { formatAllocation, serverStatusInfo } from '@/lib/server.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';
import PowerButtons from './PowerButtons.tsx';

const SHADE = 'var(--nebula-card)';

export default function HeroCard({ banner, icon }: { banner: string; icon?: string }) {
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

  const address = server.allocation
    ? formatAllocation(server.allocation, server.egg.separatePort)
    : t('common.server.noAllocation', {});

  // banner is a sanitised URL (see normalizeTheme), the scrim keeps the text readable on any picture
  const backgroundImage = banner
    ? `linear-gradient(90deg, ${SHADE} 5%, color-mix(in srgb, ${SHADE} 45%, transparent) 55%, color-mix(in srgb, ${SHADE} 25%, transparent)), url("${banner}")`
    : `linear-gradient(120deg, color-mix(in srgb, var(--mantine-color-blue-filled) 24%, ${SHADE}), ${SHADE} 70%)`;

  return (
    <Card p={0}>
      <div
        className='flex flex-wrap items-start justify-between gap-4 p-6 min-h-44 bg-cover bg-center'
        style={{ backgroundImage }}
      >
        <div className='min-w-0'>
          <Title order={1}>{server.name}</Title>
          <Group gap='xs' mt='sm'>
            <Badge variant='light' color={color} tt='none' size='lg' radius='sm'>
              <span className='flex items-center gap-2'>
                <span className={`size-2 rounded-full bg-server-status-${server.isSuspended ? 'offline' : state}`} />
                {label}
              </span>
            </Badge>
            <Badge
              variant='light'
              color='gray'
              tt='none'
              size='lg'
              radius='sm'
              leftSection={
                icon ? (
                  <img src={icon} alt='' className='size-4 rounded-sm object-cover' />
                ) : (
                  <FontAwesomeIcon icon={faGamepad} />
                )
              }
            >
              {server.egg.name}
            </Badge>
            <CopyOnClick content={address} enabled={!!server.allocation}>
              <Badge
                variant='light'
                color='gray'
                tt='none'
                size='lg'
                radius='sm'
                rightSection={server.allocation && <FontAwesomeIcon icon={faCopy} />}
              >
                {address}
              </Badge>
            </CopyOnClick>
          </Group>
        </div>

        <PowerButtons />
      </div>
    </Card>
  );
}
