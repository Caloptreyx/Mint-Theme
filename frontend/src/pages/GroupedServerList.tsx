import { faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { startTransition, useEffect, useState } from 'react';
import type { z } from 'zod';
import ServerCard from '../elements/dashboard/ServerCard.tsx';
import ServerGroupCard, { type ServerGroupData } from '../elements/dashboard/ServerGroupCard.tsx';
import ServersHeader from '../elements/dashboard/ServersHeader.tsx';
import { useNebulaTheme } from '../lib/apply.ts';
import {
  BulkActionBar,
  Button,
  Card,
  DndBoard,
  DndSortableList,
  getServerGroups,
  httpErrorToHuman,
  SERVER_GROUPS_CONTAINER_ID,
  ServerGroupCreateModal,
  SortableItem,
  Spinner,
  type serverPowerAction,
  Text,
  Title,
  updateServerGroupsOrder,
  useBulkPowerActions,
  useServerGroupsDnd,
  useToast,
  useTranslations,
  useUserStore,
} from '../lib/core.ts';
import { useExtTranslations } from '../translations.ts';

/**
 * The grouped servers page (core's DashboardHomeGrouped) in Mint's look: the servers pages' shared header, and each
 * group's servers as Mint's cards. Loading, ordering and the drag and drop between groups are core's
 * (`useServerGroupsDnd`, the user store's groups), so groups made or arranged here and in core are the same.
 */
export default function GroupedServerList() {
  const { t, tItem } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const theme = useNebulaTheme();
  const { addToast } = useToast();
  const serverGroups = useUserStore((state) => state.serverGroups);
  const setServerGroups = useUserStore((state) => state.setServerGroups);
  const { handleBulkPowerAction, bulkActionLoading } = useBulkPowerActions();

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    setFailed(false);
    getServerGroups()
      .then(setServerGroups)
      .catch((err) => {
        setFailed(true);
        addToast(httpErrorToHuman(err), 'error');
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const groups = [...serverGroups].sort((a, b) => a.order - b.order);

  const onGroupsReorder = async (reordered: ServerGroupData[]) => {
    const previous = serverGroups;
    startTransition(() => setServerGroups(reordered.map((group, order) => ({ ...group, order }))));
    await updateServerGroupsOrder(reordered.map((group) => group.uuid)).catch((err) => {
      addToast(httpErrorToHuman(err), 'error');
      setServerGroups(previous);
    });
  };

  const {
    collisionDetection,
    describeItem,
    activeServerGroup,
    activeServer,
    activeServerDndId,
    activeServerSourceUuid,
    blockedTarget,
    placement,
    pendingMove,
    ...dndHandlers
  } = useServerGroupsDnd({ onGroupsReorder });

  // a server can sit in several groups; ticking it in one ticks it everywhere, like core
  const onSelect = (uuids: string[], checked: boolean) =>
    setSelected((current) =>
      checked ? [...new Set([...current, ...uuids])] : current.filter((uuid) => !uuids.includes(uuid)),
    );

  const onBulkAction = async (action: z.infer<typeof serverPowerAction>) => {
    await handleBulkPowerAction(selected, action);
    setSelected([]);
  };

  const createButton = (
    <Button onClick={() => setCreating(true)} leftSection={<FontAwesomeIcon icon={faPlus} />}>
      {t('pages.account.home.tabs.groupedServers.page.button.createGroup', {})}
    </Button>
  );

  return (
    <>
      <ServerGroupCreateModal opened={creating} onClose={() => setCreating(false)} />
      <ServersHeader>{serverGroups.length > 0 && createButton}</ServersHeader>

      {loading ? (
        <Spinner.Centered />
      ) : failed ? (
        <Card className='items-center gap-3 py-10 text-center'>
          <Text c='dimmed'>{tExt('servers.groups.loadFailed', {})}</Text>
          <Button variant='light' onClick={load}>
            {tExt('servers.groups.retry', {})}
          </Button>
        </Card>
      ) : groups.length === 0 ? (
        <Card className='items-center gap-3 py-10 text-center'>
          <FontAwesomeIcon icon={faLayerGroup} className='text-3xl text-(--mantine-color-dimmed)' />
          <Title order={4}>{tExt('servers.groups.empty', {})}</Title>
          <Text size='sm' c='dimmed' className='max-w-md'>
            {tExt('servers.groups.emptyDescription', {})}
          </Text>
          {createButton}
        </Card>
      ) : (
        <DndBoard
          collisionDetection={collisionDetection}
          describeItem={describeItem}
          {...dndHandlers}
          renderOverlay={() =>
            activeServerGroup ? (
              <Card p='sm' className='cursor-grabbing shadow-xl'>
                <Text fw={600} size='sm' truncate>
                  {activeServerGroup.name}
                </Text>
                <Text size='xs' c='dimmed'>
                  {tItem('server', activeServerGroup.serverOrder.length)}
                </Text>
              </Card>
            ) : activeServer ? (
              <div className='cursor-grabbing shadow-xl'>
                <ServerCard
                  server={activeServer}
                  art={theme.eggs[activeServer.egg.uuid]?.banner || theme.homeBanner}
                  icon={theme.eggs[activeServer.egg.uuid]?.icon}
                  variant={theme.serverCardStyle}
                  selected={selected.includes(activeServer.uuid)}
                  onSelect={() => undefined}
                />
              </div>
            ) : null
          }
        >
          <DndSortableList id={SERVER_GROUPS_CONTAINER_ID} items={groups.map((group) => group.uuid)}>
            <div className='flex flex-col gap-4'>
              {groups.map((group) => {
                const here = placement?.groupUuid === group.uuid;
                const blocked = blockedTarget?.groupUuid === group.uuid;
                return (
                  <SortableItem
                    key={group.uuid}
                    id={group.uuid}
                    renderItem={({ dragHandleProps }) => (
                      <ServerGroupCard
                        serverGroup={group}
                        dragHandleProps={dragHandleProps}
                        selected={selected}
                        onSelect={onSelect}
                        isDropTarget={blocked || here}
                        dropBlockedReason={blocked ? blockedTarget.reason : null}
                        adoptedServer={here ? activeServer : null}
                        adoptedDndId={here ? activeServerDndId : null}
                        adoptedIndex={here ? placement.index : null}
                        hiddenDndId={placement && activeServerSourceUuid === group.uuid ? activeServerDndId : null}
                        pendingServer={pendingMove?.groupUuid === group.uuid ? pendingMove.server : null}
                      />
                    )}
                  />
                );
              })}
            </div>
          </DndSortableList>
        </DndBoard>
      )}

      <BulkActionBar
        selectedCount={selected.length}
        onClear={() => setSelected([])}
        onAction={onBulkAction}
        loading={bulkActionLoading}
      />
    </>
  );
}
