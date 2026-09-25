import { faArrowUpRightFromSquare, faBookOpen, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fragment, useState } from 'react';
import { useParams } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { httpErrorToHuman } from '@/api/axios.ts';
import updateDockerImage from '@/api/server/startup/updateDockerImage.ts';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Anchor from '@/elements/Anchor.tsx';
import { ServerCan } from '@/elements/Can.tsx';
import CopyOnClick from '@/elements/CopyOnClick.tsx';
import ServerContentContainer from '@/elements/containers/ServerContentContainer.tsx';
import Group from '@/elements/Group.tsx';
import Select from '@/elements/input/Select.tsx';
import Progress from '@/elements/Progress.tsx';
import Text from '@/elements/Text.tsx';
import TitleCard from '@/elements/TitleCard.tsx';
import { formatAllocation, serverStatusInfo } from '@/lib/server.ts';
import { bytesToString, mbToBytes } from '@/lib/size.ts';
import { formatMilliseconds } from '@/lib/time.ts';
import Console from '@/pages/server/console/terminal/Console.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useServerStore } from '@/stores/server.ts';
import HeroCard from '../elements/home/HeroCard.tsx';
import RenameModal from '../elements/home/RenameModal.tsx';
import { useNebulaTheme } from '../lib/apply.ts';
import type { HomeCardId, HomeColumn } from '../lib/theme.ts';
import { useExtTranslations } from '../translations.ts';

const NONE = '--';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-4 py-2.5 border-b border-(--mantine-color-default-border) last:border-0'>
      <Text size='sm' c='dimmed' className='shrink-0'>
        {label}
      </Text>
      {/* a long host name breaks onto a second line on phones instead of pushing the card wider */}
      <div className='min-w-0 text-right text-sm wrap-anywhere'>{children}</div>
    </div>
  );
}

function UsageRow({ label, value, percent }: { label: string; value: string; percent: number | null }) {
  return (
    <div className='py-2'>
      <Group justify='space-between' mb={6} wrap='nowrap'>
        <Text size='sm' c='dimmed'>
          {label}
        </Text>
        <Text size='sm'>{value}</Text>
      </Group>
      <Progress value={percent ?? 0} size='sm' hourglass={false} withLabel={false} />
    </div>
  );
}

export default function ServerHome() {
  const { t } = useExtTranslations();
  const { t: core } = useTranslations();
  const { addToast } = useToast();
  const theme = useNebulaTheme();
  const { id } = useParams<'id'>();
  const [renaming, setRenaming] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  const { server, stats, state, updateServer } = useServerStore(
    useShallow((s) => ({ server: s.server, stats: s.stats, state: s.state, updateServer: s.updateServer })),
  );

  const eggImages = theme.eggs[server.egg.uuid];
  const banner = eggImages?.banner || theme.homeBanner;
  const offline = state === 'offline';
  const articles = theme.articles.filter((a) => a.title);

  const address = server.allocation
    ? formatAllocation(server.allocation, server.egg.separatePort)
    : core('common.server.noAllocation', {});
  const statusLabel = server.isSuspended
    ? core('common.server.state.suspended', {})
    : server.status
      ? serverStatusInfo[server.status].label()
      : core(`common.enum.serverState.${state}`, {});

  const memoryLimit = mbToBytes(server.limits.memory);
  const diskLimit = mbToBytes(server.limits.disk);
  const percent = (used: number | undefined, limit: number) =>
    used === undefined || limit === 0 ? null : Math.min(100, (used / limit) * 100);
  const limitText = (limit: number) => (limit ? bytesToString(limit) : core('common.unlimited', {}));

  const images = Object.entries(server.egg.dockerImages);
  const changeImage = (image: string) => {
    setSavingImage(true);
    updateDockerImage(server.uuid, image)
      .then(() => {
        updateServer({ image });
        addToast(core('pages.server.startup.toast.dockerImageUpdated', {}), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setSavingImage(false));
  };

  const tileBackground = banner
    ? `linear-gradient(0deg, color-mix(in srgb, var(--nebula-card) 85%, transparent), transparent), url("${banner}")`
    : 'linear-gradient(120deg, color-mix(in srgb, var(--mantine-color-blue-filled) 24%, var(--nebula-card)), var(--nebula-card))';

  const cards: Record<HomeCardId, React.ReactNode> = {
    information: (
      <TitleCard title={t('home.information', {})}>
        <Row label={t('home.serverName', {})}>
          <Group gap={6} wrap='nowrap' justify='flex-end'>
            <span className='truncate'>{server.name}</span>
            <ServerCan action='settings.rename'>
              <ActionIcon
                variant='subtle'
                color='gray'
                size='sm'
                aria-label={core('pages.server.settings.rename.title', {})}
                onClick={() => setRenaming(true)}
              >
                <FontAwesomeIcon icon={faPenToSquare} />
              </ActionIcon>
            </ServerCan>
          </Group>
        </Row>
        <Row label={t('home.address', {})}>
          <CopyOnClick content={address} enabled={!!server.allocation}>
            <span>{address}</span>
          </CopyOnClick>
        </Row>
        <Row label={t('home.status', {})}>{statusLabel}</Row>
        <Row label={t('home.uptime', {})}>{stats?.uptime ? formatMilliseconds(stats.uptime, true, false) : NONE}</Row>
        <Row label={t('home.location', {})}>
          <Group gap={6} wrap='nowrap' justify='flex-end'>
            {server.locationFlag && (
              <img src={`/flags/${server.locationFlag}.svg`} alt='' className='size-4 rounded-full' />
            )}
            <span className='truncate'>{server.locationName}</span>
          </Group>
        </Row>
        <Row label={t('home.node', {})}>{server.nodeName}</Row>
        <Row label={t('home.memory', {})}>{limitText(memoryLimit)}</Row>
      </TitleCard>
    ),

    installed: (
      <TitleCard title={t('home.installed', {})}>
        <div
          className='flex items-end min-h-32 rounded-md p-4 bg-cover bg-center'
          style={{ backgroundImage: tileBackground }}
        >
          <Group gap='xs'>
            {eggImages?.icon && <img src={eggImages.icon} alt='' className='size-8 rounded-md object-cover' />}
            <Text fw={700}>{server.egg.name}</Text>
          </Group>
        </div>

        {images.length > 1 && (
          <ServerCan action='startup.docker-image'>
            <Select
              mt='md'
              label={t('home.image', {})}
              data={images.map(([label, value]) => ({ value, label }))}
              value={server.image}
              disabled={savingImage}
              onChange={(value) => value && changeImage(value)}
            />
          </ServerCan>
        )}
      </TitleCard>
    ),

    articles:
      articles.length > 0 ? (
        <TitleCard title={t('home.gettingStarted', {})}>
          <div className='flex flex-col'>
            {articles.map((a) => (
              <a
                key={a.title}
                href={a.url || undefined}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-(--mantine-color-default-hover)'
              >
                <FontAwesomeIcon icon={faBookOpen} fixedWidth className='text-(--mantine-color-dimmed)' />
                <div className='min-w-0 flex-1'>
                  <Text size='sm' fw={600}>
                    {a.title}
                  </Text>
                  {a.description && (
                    <Text size='xs' c='dimmed'>
                      {a.description}
                    </Text>
                  )}
                </div>
                {a.url && (
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    size='sm'
                    className='text-(--mantine-color-dimmed)'
                  />
                )}
              </a>
            ))}
          </div>
        </TitleCard>
      ) : null,

    console: (
      <TitleCard
        title={t('home.console', {})}
        rightSection={
          <Anchor href={`/server/${id}/console`} size='sm'>
            {t('home.fullLog', {})}
          </Anchor>
        }
      >
        <div className='flex flex-col h-80'>
          <Console />
        </div>
      </TitleCard>
    ),

    usage: (
      <TitleCard title={t('home.usage', {})}>
        <UsageRow
          label={t('home.cpu', {})}
          value={offline ? NONE : `${(stats?.cpuAbsolute ?? 0).toFixed(2)}%`}
          percent={offline ? null : percent(stats?.cpuAbsolute, server.limits.cpu)}
        />
        <UsageRow
          label={t('home.ram', {})}
          value={`${offline ? NONE : bytesToString(stats?.memoryBytes ?? 0)} / ${limitText(memoryLimit)}`}
          percent={offline ? null : percent(stats?.memoryBytes, memoryLimit)}
        />
        <UsageRow
          label={t('home.storage', {})}
          value={`${bytesToString(stats?.diskBytes ?? 0)} / ${limitText(diskLimit)}`}
          percent={percent(stats?.diskBytes, diskLimit)}
        />
      </TitleCard>
    ),

    network: (
      <TitleCard title={t('home.network', {})}>
        <Row label={t('home.address', {})}>
          <CopyOnClick content={address} enabled={!!server.allocation}>
            <span>{address}</span>
          </CopyOnClick>
        </Row>
        <Row label={t('home.node', {})}>{server.nodeName}</Row>
        <Row label={t('home.inbound', {})}>{offline ? NONE : bytesToString(stats?.network.rxBytes ?? 0)}</Row>
        <Row label={t('home.outbound', {})}>{offline ? NONE : bytesToString(stats?.network.txBytes ?? 0)}</Row>
        <Row label={t('home.sftp', {})}>
          <CopyOnClick content={`${server.sftpHost}:${server.sftpPort}`}>
            <span>{`${server.sftpHost}:${server.sftpPort}`}</span>
          </CopyOnClick>
        </Row>
      </TitleCard>
    ),
  };

  const column = (side: HomeColumn) =>
    theme.layout
      .filter((card) => card.enabled && card.column === side)
      .map((card) => <Fragment key={card.id}>{cards[card.id]}</Fragment>);

  return (
    <ServerContentContainer title={t('home.title', {})} hideTitleComponent>
      <div className='flex flex-col gap-4'>
        <HeroCard banner={banner} icon={eggImages?.icon} />

        <div className='grid xl:grid-cols-5 gap-4 items-start'>
          <div className='xl:col-span-2 flex flex-col gap-4 min-w-0'>{column('left')}</div>
          <div className='xl:col-span-3 flex flex-col gap-4 min-w-0'>{column('right')}</div>
        </div>
      </div>

      <RenameModal opened={renaming} onClose={() => setRenaming(false)} />
    </ServerContentContainer>
  );
}
