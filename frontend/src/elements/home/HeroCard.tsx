import { faCopy, faGamepad, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ReactNode } from 'react';
import Badge from '@/elements/Badge.tsx';
import Card from '@/elements/Card.tsx';
import CopyOnClick from '@/elements/CopyOnClick.tsx';
import Group from '@/elements/Group.tsx';
import Title from '@/elements/Title.tsx';
import { formatAllocation } from '@/lib/server.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';
import ServerState from '../ServerState.tsx';
import PowerButtons from './PowerButtons.tsx';

const SHADE = 'var(--nebula-card)';

/** A banner pill; stat pills pass `icon` and `label`, the label is the icon's hover title. */
export function Pill({
  icon,
  label,
  left,
  right,
  children,
}: {
  icon?: IconDefinition;
  label?: string;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Badge
      variant='light'
      color='gray'
      tt='none'
      size='lg'
      radius='sm'
      className='tabular-nums bg-(--nebula-card)/70! backdrop-blur-sm'
      leftSection={icon ? <FontAwesomeIcon icon={icon} title={label} className='text-(--nebula-highlight)' /> : left}
      rightSection={right}
    >
      {children}
    </Badge>
  );
}

export default function HeroCard({ banner, icon, children }: { banner: string; icon?: string; children?: ReactNode }) {
  const { t } = useTranslations();
  const server = useServerStore((s) => s.server);

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
            <ServerState />
            <Pill
              left={
                icon ? (
                  <img src={icon} alt='' className='size-4 rounded-sm object-cover' />
                ) : (
                  <FontAwesomeIcon icon={faGamepad} />
                )
              }
            >
              {server.egg.name}
            </Pill>
            <CopyOnClick content={address} enabled={!!server.allocation}>
              <Pill right={server.allocation && <FontAwesomeIcon icon={faCopy} />}>{address}</Pill>
            </CopyOnClick>
          </Group>
          {children && (
            <div className='grid grid-cols-2 gap-2 mt-2 max-sm:*:w-full! max-sm:*:justify-start! sm:flex sm:flex-wrap'>
              {children}
            </div>
          )}
        </div>

        <PowerButtons />
      </div>
    </Card>
  );
}
