import { faList, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Pagination } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';
import getServers from '@/api/server/getServers.ts';
import { AdminCan } from '@/elements/Can.tsx';
import Card from '@/elements/Card.tsx';
import Group from '@/elements/Group.tsx';
import Checkbox from '@/elements/input/Checkbox.tsx';
import Select from '@/elements/input/Select.tsx';
import Switch from '@/elements/input/Switch.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import SegmentedControl from '@/elements/SegmentedControl.tsx';
import Spinner from '@/elements/Spinner.tsx';
import Text from '@/elements/Text.tsx';
import Title from '@/elements/Title.tsx';
import { queryKeys } from '@/lib/queryKeys.ts';
import type { serverPowerAction } from '@/lib/schemas/server/server.ts';
import BulkActionBar from '@/pages/dashboard/home/BulkActionBar.tsx';
import { useSearchablePaginatedTable } from '@/plugins/resource/useSearchablePaginatedTable.ts';
import { useBulkPowerActions } from '@/plugins/server/useBulkPowerActions.ts';
import { useServerListShowOthers } from '@/plugins/server/useServerListShowOthers.ts';
import { useStartOnGroupedServers } from '@/plugins/server/useStartOnGroupedServers.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import ServerCard, { GRID_CLASS } from '../elements/dashboard/ServerCard.tsx';
import ServerRow, { COLUMN_CLASS, COLUMNS, ROW_GRID, type RowStatus } from '../elements/dashboard/ServerRow.tsx';
import { useNebulaTheme } from '../lib/apply.ts';
import { useExtTranslations } from '../translations.ts';

type View = 'list' | 'grid';
type Filter = 'all' | RowStatus;
const VIEW_KEY = 'nebula:server-view';
const FILTERS: Filter[] = ['all', 'running', 'offline', 'suspended'];

function storedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

export default function ServerList() {
  const { t, tItem } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const theme = useNebulaTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [startOnGrouped] = useStartOnGroupedServers();
  const [showOthers, setShowOthers] = useServerListShowOthers();
  const [view, setView] = useState<View>(storedView);
  const [filter, setFilter] = useState<Filter>('all');
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const { handleBulkPowerAction, bulkActionLoading } = useBulkPowerActions();

  const {
    data: servers,
    loading,
    search,
    setSearch,
    setPage,
  } = useSearchablePaginatedTable({
    queryKey: queryKeys.user.servers.all(),
    fetcher: (page, query) => getServers(page, query, showOthers),
    deps: [showOthers],
  });

  const onStatus = useCallback(
    (uuid: string, status: RowStatus) =>
      setStatuses((prev) => (prev[uuid] === status ? prev : { ...prev, [uuid]: status })),
    [],
  );

  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // the choice just won't survive a reload
    }
  };

  // core keeps the grouped list on '/' when the user starts there, so the tabs follow that setting
  const allPath = startOnGrouped ? '/all' : '/';
  const groupedPath = startOnGrouped ? '/' : '/grouped';

  const rows = servers?.data ?? [];
  const matches = (uuid: string) => filter === 'all' || statuses[uuid] === filter;
  const visible = rows.filter((server) => matches(server.uuid));
  const pages = Math.ceil((servers?.total ?? 0) / (servers?.perPage || 1));

  // Only what is on screen can be selected. A server hidden by the filter, the search or a page change is
  // dropped for good (it does not come back ticked), and the bar never counts it, even for the one render
  // before the effect prunes the state.
  const visibleIds = visible.map((server) => server.uuid);
  const visibleKey = visibleIds.join(',');
  const chosen = selected.filter((uuid) => visibleIds.includes(uuid));
  const allChosen = visible.length > 0 && chosen.length === visible.length;

  useEffect(() => {
    const keep = new Set(visibleKey.split(','));
    setSelected((prev) => (prev.every((uuid) => keep.has(uuid)) ? prev : prev.filter((uuid) => keep.has(uuid))));
  }, [visibleKey]);

  const onSelect = (uuid: string) => (checked: boolean) =>
    setSelected((prev) =>
      checked ? (prev.includes(uuid) ? prev : [...prev, uuid]) : prev.filter((other) => other !== uuid),
    );

  const onBulkAction = async (action: z.infer<typeof serverPowerAction>) => {
    await handleBulkPowerAction(chosen, action);
    setSelected([]);
  };

  const cards = theme.tableStyle === 'cards';
  // the header's transparent border lines its columns up with the rows' when each row is a bordered card
  const listHeader = (
    <div
      className={`${ROW_GRID} ${cards ? 'py-2 border border-transparent' : 'py-3 border-b border-(--mantine-color-default-border)'} text-xs font-semibold tracking-wider uppercase text-(--mantine-color-dimmed)`}
    >
      <div>
        <Checkbox
          checked={allChosen}
          indeterminate={chosen.length > 0 && !allChosen}
          onChange={() => setSelected(allChosen ? [] : visibleIds)}
          aria-label={tExt('servers.selectAll', {})}
        />
      </div>
      {COLUMNS.map((column) => (
        <span key={column} className={`${COLUMN_CLASS[column]} ${column === 'game' ? 'max-md:invisible' : ''}`}>
          {tExt(`servers.column.${column}`, {})}
        </span>
      ))}
    </div>
  );
  const listRows = visible.map((server) => (
    <ServerRow
      key={server.uuid}
      server={server}
      art={theme.eggs[server.egg.uuid]?.banner || theme.homeBanner}
      icon={theme.eggs[server.egg.uuid]?.icon}
      card={cards}
      selected={chosen.includes(server.uuid)}
      onSelect={onSelect(server.uuid)}
      onStatus={onStatus}
    />
  ));

  return (
    <>
      <Group justify='space-between' align='flex-start' mb='md' wrap='nowrap' className='max-sm:flex-wrap!'>
        <div className='min-w-0'>
          <Title order={2}>{tExt('servers.title', {})}</Title>
          <Text size='sm' c='dimmed'>
            {tExt('servers.subtitle', {})}
          </Text>
        </div>
        <SegmentedControl
          value={pathname === groupedPath ? 'grouped' : 'all'}
          onChange={(value) => navigate(value === 'grouped' ? groupedPath : allPath)}
          data={[
            { value: 'all', label: t('pages.account.home.tabs.allServers.title', {}) },
            { value: 'grouped', label: t('pages.account.home.tabs.groupedServers.title', {}) },
          ]}
        />
      </Group>

      <Group mb='md' gap='sm'>
        <TextInput
          placeholder={t('common.input.search', {})}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full md:w-62.5'
        />
        <Select
          data={FILTERS.map((value) => ({ value, label: tExt(`servers.filter.${value}`, {}) }))}
          value={filter}
          onChange={(value) => setFilter((value as Filter) ?? 'all')}
          w={150}
        />
        <SegmentedControl
          value={view}
          onChange={(value) => changeView(value as View)}
          data={[
            { value: 'list', label: <FontAwesomeIcon icon={faList} aria-label={tExt('servers.view.list', {})} /> },
            {
              value: 'grid',
              label: <FontAwesomeIcon icon={faTableCellsLarge} aria-label={tExt('servers.view.grid', {})} />,
            },
          ]}
        />
        <div className='flex-1' />
        <AdminCan action='servers.read'>
          <Switch
            label={t('pages.account.home.tabs.allServers.page.input.showOtherUsersServers', {})}
            checked={showOthers}
            onChange={(e) => {
              setPage(1);
              setShowOthers(e.currentTarget.checked);
            }}
          />
        </AdminCan>
      </Group>

      {loading ? (
        <Spinner.Centered />
      ) : rows.length === 0 ? (
        <Text c='dimmed'>{t('pages.account.home.noServers', {})}</Text>
      ) : view === 'grid' ? (
        <div className={GRID_CLASS[theme.serverCardStyle]}>
          {visible.map((server) => (
            <ServerCard
              key={server.uuid}
              server={server}
              art={theme.eggs[server.egg.uuid]?.banner || theme.homeBanner}
              variant={theme.serverCardStyle}
              icon={theme.eggs[server.egg.uuid]?.icon}
              selected={chosen.includes(server.uuid)}
              onSelect={onSelect(server.uuid)}
              onStatus={onStatus}
            />
          ))}
        </div>
      ) : cards ? (
        // the 'cards' table style: every row is a card of its own under a plain header, like core's tables
        <div className='flex flex-col gap-1.5'>
          {listHeader}
          {listRows}
        </div>
      ) : (
        <Card p={0} className='overflow-hidden'>
          {listHeader}
          {listRows}
        </Card>
      )}

      {rows.length > 0 && (
        <Group justify='space-between' mt='md'>
          <Text size='sm' c='dimmed'>
            {tExt('servers.showing', { count: tItem('server', visible.length) })}
          </Text>
          {pages > 1 && <Pagination total={pages} value={servers?.page ?? 1} onChange={setPage} boundaries={1} />}
        </Group>
      )}

      <BulkActionBar
        selectedCount={chosen.length}
        onClear={() => setSelected([])}
        onAction={onBulkAction}
        loading={bulkActionLoading}
      />
    </>
  );
}
