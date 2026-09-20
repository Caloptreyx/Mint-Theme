import { faList, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Pagination } from '@mantine/core';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';
import getServers from '@/api/server/getServers.ts';
import { AdminCan } from '@/elements/Can.tsx';
import Card from '@/elements/Card.tsx';
import Group from '@/elements/Group.tsx';
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
import ServerCard from '../elements/dashboard/ServerCard.tsx';
import ServerRow, { ROW_GRID, type RowStatus } from '../elements/dashboard/ServerRow.tsx';
import { useNebulaTheme } from '../lib/apply.ts';
import { useExtTranslations } from '../translations.ts';

type View = 'list' | 'grid';
type Filter = 'all' | RowStatus;
const VIEW_KEY = 'nebula:server-view';
const FILTERS: Filter[] = ['all', 'running', 'offline', 'suspended'];
const COLUMNS = ['id', 'game', 'name', 'status', 'location', 'cpu', 'ram', 'uptime'] as const;

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

  const onBulkAction = async (action: z.infer<typeof serverPowerAction>) => {
    await handleBulkPowerAction(selected, action);
    setSelected([]);
  };

  return (
    <>
      <Group justify='space-between' align='flex-start' mb='md' wrap='nowrap'>
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
        <div className='gap-4 grid md:grid-cols-2'>
          {visible.map((server) => (
            <ServerCard
              key={server.uuid}
              server={server}
              art={theme.eggs[server.egg.uuid]?.banner || theme.homeBanner}
              icon={theme.eggs[server.egg.uuid]?.icon}
              onStatus={onStatus}
            />
          ))}
        </div>
      ) : (
        <Card p={0} className='overflow-hidden'>
          <div
            className={`${ROW_GRID} hidden! lg:grid! py-3 border-b border-(--mantine-color-default-border) text-xs font-semibold tracking-wider uppercase text-(--mantine-color-dimmed)`}
          >
            <span />
            {COLUMNS.map((column) => (
              <span key={column}>{tExt(`servers.column.${column}`, {})}</span>
            ))}
          </div>
          {visible.map((server) => (
            <ServerRow
              key={server.uuid}
              server={server}
              art={theme.eggs[server.egg.uuid]?.banner || theme.homeBanner}
              icon={theme.eggs[server.egg.uuid]?.icon}
              selected={selected.includes(server.uuid)}
              onSelect={(checked) =>
                setSelected((prev) => (checked ? [...prev, server.uuid] : prev.filter((uuid) => uuid !== server.uuid)))
              }
              onStatus={onStatus}
            />
          ))}
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
        selectedCount={selected.length}
        onClear={() => setSelected([])}
        onAction={onBulkAction}
        loading={bulkActionLoading}
      />
    </>
  );
}
