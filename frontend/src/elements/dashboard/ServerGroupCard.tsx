import { rectSortingStrategy } from '@dnd-kit/sortable';
import {
  faChevronRight,
  faCircleExclamation,
  faEllipsisVertical,
  faGripVertical,
  faMinus,
  faPen,
  faPlay,
  faPlus,
  faRotateRight,
  faSearch,
  faStop,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type ComponentProps, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { useNebulaTheme } from '../../lib/apply.ts';
import {
  ActionIcon,
  Badge,
  BlockedOverlay,
  Card,
  Checkbox,
  Collapse,
  ConfirmationModal,
  DndSortableList,
  deleteServerGroup,
  GroupAddServerModal,
  getEmptyPaginationSet,
  getServerGroupServers,
  httpErrorToHuman,
  MAX_SERVERS_PER_GROUP,
  Menu,
  queryKeys,
  ScrollingText,
  type ServerGroupDropBlockReason,
  ServerGroupEditModal,
  SortableItem,
  Spinner,
  serverDndId,
  type serverPowerAction,
  TablePagination,
  Text,
  TextInput,
  Tooltip,
  updateServerGroup,
  useBulkPowerActions,
  type userServerGroupSchema,
  useSearchablePaginatedTable,
  useToast,
  useTranslations,
  useUserSettingMapEntry,
  useUserStore,
} from '../../lib/core.ts';
import { useExtTranslations } from '../../translations.ts';
import ServerCard, { GRID_CLASS } from './ServerCard.tsx';
import type { Server } from './ServerRow.tsx';

export type ServerGroupData = z.infer<typeof userServerGroupSchema>;

/** Core's own setting, so a group stays open or closed whichever page shows it. */
const EXPANDED_KEY = 'dashboard::server_groups_expanded';
const expandedSchema = z.boolean();

export interface DropState {
  isDropTarget?: boolean;
  dropBlockedReason?: ServerGroupDropBlockReason | null;
  adoptedServer?: Server | null;
  adoptedDndId?: string | null;
  adoptedIndex?: number | null;
  hiddenDndId?: string | null;
  pendingServer?: Server | null;
}

interface Props extends DropState {
  serverGroup: ServerGroupData;
  dragHandleProps?: ComponentProps<'div'>;
  selected: string[];
  onSelect: (uuids: string[], checked: boolean) => void;
}

/**
 * One of the user's server groups (core's ServerGroupItem) drawn with Mint's server cards in the servers grid of
 * the theme's card style. Data, modals, power actions and the drag and drop state are core's: the cards sit in a
 * sortable list with core's ids (`serverDndId`), so core's `useServerGroupsDnd` moves them between groups.
 */
export default function ServerGroupCard({
  serverGroup,
  dragHandleProps,
  selected,
  onSelect,
  isDropTarget = false,
  dropBlockedReason = null,
  adoptedServer = null,
  adoptedDndId = null,
  adoptedIndex = null,
  hiddenDndId = null,
  pendingServer = null,
}: Props) {
  const { t, tItem } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const theme = useNebulaTheme();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const updateStoredGroup = useUserStore((state) => state.updateServerGroup);
  const removeStoredGroup = useUserStore((state) => state.removeServerGroup);
  const { handleBulkPowerAction, bulkActionLoading } = useBulkPowerActions();

  const [expanded, setExpanded] = useUserSettingMapEntry(EXPANDED_KEY, serverGroup.uuid, expandedSchema, true);
  const [servers, setServers] = useState(getEmptyPaginationSet<Server>());
  const [modal, setModal] = useState<'edit' | 'delete' | 'add' | 'remove' | null>(null);
  const [removing, setRemoving] = useState<Server | null>(null);

  const { loading, search, debouncedSearch, setSearch, setPage, refetch } = useSearchablePaginatedTable({
    queryKey: [...queryKeys.user.servers.all(), serverGroup.uuid],
    fetcher: (page, query) => getServerGroupServers(serverGroup.uuid, page, query),
    setStoreData: setServers,
    modifyParams: false,
  });

  // the group's own order; a server dropped in from another group shows at once, before the refetch has it
  const ordered = useMemo(() => {
    const positions = new Map(serverGroup.serverOrder.map((uuid, index) => [uuid, index]));
    const data =
      pendingServer && !servers.data.some((server) => server.uuid === pendingServer.uuid)
        ? [...servers.data, pendingServer]
        : servers.data;
    return data
      .filter((server) => positions.has(server.uuid))
      .sort((a, b) => (positions.get(a.uuid) ?? 0) - (positions.get(b.uuid) ?? 0));
  }, [servers.data, serverGroup.serverOrder, pendingServer]);

  // while a server is dragged over this group it takes a slot here and leaves its own group's list
  const items = useMemo(() => {
    const list = ordered
      .map((server) => ({ server, dndId: serverDndId(serverGroup.uuid, server.uuid) }))
      .filter((item) => item.dndId !== hiddenDndId);
    if (!adoptedServer || !adoptedDndId) return list;
    const at = Math.min(Math.max(adoptedIndex ?? list.length, 0), list.length);
    return [...list.slice(0, at), { server: adoptedServer, dndId: adoptedDndId }, ...list.slice(at)];
  }, [ordered, serverGroup.uuid, hiddenDndId, adoptedServer, adoptedDndId, adoptedIndex]);

  const ids = ordered.map((server) => server.uuid);
  const picked = ids.filter((uuid) => selected.includes(uuid)).length;

  const groupPower = (action: z.infer<typeof serverPowerAction>) => {
    // as core: servers the panel or the node is busy with are left out
    const blocked = new Set(
      servers.data
        .filter(
          (server) => !!server.status || server.isSuspended || server.isTransferring || server.nodeMaintenanceEnabled,
        )
        .map((server) => server.uuid),
    );
    return handleBulkPowerAction(
      serverGroup.serverOrder.filter((uuid) => !blocked.has(uuid)),
      action,
    );
  };

  const doDelete = async () => {
    await deleteServerGroup(serverGroup.uuid)
      .then(() => {
        setModal(null);
        removeStoredGroup(serverGroup);
        addToast(t('pages.account.home.tabs.groupedServers.page.modal.deleteServerGroup.toast.deleted', {}), 'success');
      })
      .catch((err) => {
        addToast(httpErrorToHuman(err), 'error');
      });
  };

  const doRemove = async () => {
    if (!removing) return;
    const previous = servers;
    const serverOrder = serverGroup.serverOrder.filter((uuid) => uuid !== removing.uuid);
    updateStoredGroup(serverGroup.uuid, { serverOrder });
    setServers((current) => ({
      ...current,
      total: Math.max(0, current.total - 1),
      data: current.data.filter((server) => server.uuid !== removing.uuid),
    }));
    await updateServerGroup(serverGroup.uuid, { serverOrder })
      .then(() => {
        setModal(null);
        refetch();
        addToast(
          t('pages.account.home.tabs.groupedServers.page.modal.removeServerFromGroup.toast.removed', {}),
          'success',
        );
      })
      .catch((err) => {
        addToast(httpErrorToHuman(err), 'error');
        updateStoredGroup(serverGroup.uuid, { serverOrder: serverGroup.serverOrder });
        setServers(previous);
      });
  };

  const busy = bulkActionLoading !== null;
  const iconButton = (label: string, icon: typeof faPen, onClick: () => void, color = 'gray') => (
    <Tooltip label={label}>
      <ActionIcon variant='subtle' color={color} size='sm' aria-label={label} onClick={onClick}>
        <FontAwesomeIcon icon={icon} className='size-3.5' />
      </ActionIcon>
    </Tooltip>
  );

  return (
    <>
      <GroupAddServerModal
        serverGroup={serverGroup}
        opened={modal === 'add'}
        onClose={() => setModal(null)}
        onServerAdded={refetch}
      />
      <ServerGroupEditModal serverGroup={serverGroup} opened={modal === 'edit'} onClose={() => setModal(null)} />
      <ConfirmationModal
        opened={modal === 'delete'}
        onClose={() => setModal(null)}
        title={t('pages.account.home.tabs.groupedServers.page.modal.deleteServerGroup.title', {})}
        confirm={t('common.button.delete', {})}
        onConfirmed={doDelete}
      >
        {t('pages.account.home.tabs.groupedServers.page.modal.deleteServerGroup.content', {
          group: serverGroup.name,
        }).md()}
      </ConfirmationModal>
      <ConfirmationModal
        opened={modal === 'remove'}
        onClose={() => setModal(null)}
        title={t('pages.account.home.tabs.groupedServers.page.modal.removeServerFromGroup.title', {})}
        confirm={t('common.button.remove', {})}
        onConfirmed={doRemove}
      >
        {t('pages.account.home.tabs.groupedServers.page.modal.removeServerFromGroup.content', {
          server: removing?.name ?? '',
          group: serverGroup.name,
        }).md()}
      </ConfirmationModal>

      <Card
        p={0}
        className={`relative overflow-hidden ${isDropTarget && !dropBlockedReason ? 'outline-2! -outline-offset-1! outline-(--mantine-color-blue-filled)!' : ''}`}
      >
        <BlockedOverlay
          visible={isDropTarget && dropBlockedReason === 'alreadyInGroup'}
          icon={faCircleExclamation}
          title={t('pages.account.home.tabs.groupedServers.page.drag.blocked.alreadyInGroup.title', {})}
          description={t('pages.account.home.tabs.groupedServers.page.drag.blocked.alreadyInGroup.description', {
            group: serverGroup.name,
          })}
        />
        <BlockedOverlay
          visible={isDropTarget && dropBlockedReason === 'groupFull'}
          icon={faCircleExclamation}
          title={t('pages.account.home.tabs.groupedServers.page.drag.blocked.groupFull.title', {})}
          description={t('pages.account.home.tabs.groupedServers.page.drag.blocked.groupFull.description', {
            max: MAX_SERVERS_PER_GROUP,
          })}
        />

        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 ${expanded ? 'border-b border-(--mantine-color-default-border)' : ''}`}
        >
          <div className='flex min-w-0 flex-1 basis-56 items-center gap-2'>
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                role='button'
                tabIndex={0}
                aria-label={tExt('servers.groups.reorder', { name: serverGroup.name })}
                className='flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-(--mantine-color-dimmed) hover:bg-(--mantine-color-default-hover)'
              >
                <FontAwesomeIcon icon={faGripVertical} />
              </div>
            )}
            <Checkbox
              checked={ids.length > 0 && picked === ids.length}
              indeterminate={picked > 0 && picked < ids.length}
              disabled={loading || ids.length === 0}
              onChange={() => onSelect(ids, picked !== ids.length)}
              aria-label={tExt('servers.groups.selectGroup', { name: serverGroup.name })}
            />
            <button
              type='button'
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
              className='flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-(--mantine-color-blue-filled)'
            >
              <FontAwesomeIcon
                icon={faChevronRight}
                className={`size-3 shrink-0 text-(--mantine-color-dimmed) motion-safe:transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
              <Text component='h3' fw={600} size='sm' className='min-w-0'>
                <ScrollingText>{serverGroup.name}</ScrollingText>
              </Text>
              <Badge variant='light' color='gray' size='sm' className='shrink-0'>
                {tItem('server', servers.total)}
              </Badge>
            </button>
          </div>

          <div className='flex shrink-0 items-center gap-1 max-sm:w-full'>
            <TextInput
              size='xs'
              placeholder={t('common.input.search', {})}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                const first = ordered[0];
                if (e.key === 'Enter' && expanded && first && !loading && search === debouncedSearch) {
                  e.preventDefault();
                  navigate(`/server/${first.uuidShort}`);
                }
              }}
              leftSection={<FontAwesomeIcon icon={faSearch} />}
              className='w-40 max-sm:flex-1 max-sm:w-auto'
            />
            <Menu position='bottom-end'>
              <Menu.Target>
                <Tooltip label={t('pages.account.home.tooltip.groupActions', {})}>
                  <ActionIcon
                    variant='subtle'
                    color='gray'
                    size='sm'
                    aria-label={t('pages.account.home.tooltip.groupActions', {})}
                    disabled={busy}
                    loading={busy}
                  >
                    <FontAwesomeIcon icon={faEllipsisVertical} className='size-3.5' />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t('pages.account.home.bulkActions.groupActions', {})}</Menu.Label>
                <Menu.Item
                  leftSection={<FontAwesomeIcon icon={faPlay} />}
                  disabled={busy || servers.total === 0}
                  onClick={() => groupPower('start')}
                >
                  {t('common.enum.serverPowerAction.start', {})}
                </Menu.Item>
                <Menu.Item
                  leftSection={<FontAwesomeIcon icon={faRotateRight} />}
                  disabled={busy || servers.total === 0}
                  onClick={() => groupPower('restart')}
                >
                  {t('common.enum.serverPowerAction.restart', {})}
                </Menu.Item>
                <Menu.Item
                  leftSection={<FontAwesomeIcon icon={faStop} />}
                  disabled={busy || servers.total === 0}
                  onClick={() => groupPower('stop')}
                >
                  {t('common.enum.serverPowerAction.stop', {})}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            {iconButton(t('pages.account.home.tooltip.addServerToGroup', {}), faPlus, () => setModal('add'))}
            {iconButton(t('common.tooltip.edit', {}), faPen, () => setModal('edit'))}
            {iconButton(t('common.tooltip.delete', {}), faTrash, () => setModal('delete'), 'red')}
          </div>
        </div>

        <Collapse expanded={expanded}>
          <div className='p-3'>
            {loading && servers.data.length === 0 ? (
              <Spinner.Centered />
            ) : items.length === 0 ? (
              <Text size='sm' c='dimmed' ta='center' py='md'>
                {tExt('servers.groups.emptyGroup', {})}
              </Text>
            ) : (
              <DndSortableList
                id={serverGroup.uuid}
                items={items.map((item) => item.dndId)}
                strategy={rectSortingStrategy}
              >
                <div className={GRID_CLASS[theme.serverCardStyle]}>
                  {items.map(({ server, dndId }) => (
                    <SortableItem key={dndId} id={dndId} data={{ server }}>
                      <ServerCard
                        server={server}
                        art={theme.eggs[server.egg.uuid]?.banner || theme.homeBanner}
                        icon={theme.eggs[server.egg.uuid]?.icon}
                        variant={theme.serverCardStyle}
                        selected={selected.includes(server.uuid)}
                        onSelect={(checked) => onSelect([server.uuid], checked)}
                        menuItems={
                          <Menu.Item
                            color='red'
                            leftSection={<FontAwesomeIcon icon={faMinus} />}
                            onClick={() => {
                              setRemoving(server);
                              setModal('remove');
                            }}
                          >
                            {t('pages.account.home.tooltip.removeFromGroup', {})}
                          </Menu.Item>
                        }
                      />
                    </SortableItem>
                  ))}
                </div>
              </DndSortableList>
            )}

            {servers.total > servers.perPage && <TablePagination data={servers} onPageSelect={setPage} mt='md' />}
          </div>
        </Collapse>
      </Card>
    </>
  );
}
