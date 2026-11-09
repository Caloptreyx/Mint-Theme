import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Group, SegmentedControl, Text, Title, useStartOnGroupedServers, useTranslations } from '../../lib/core.ts';
import { useExtTranslations } from '../../translations.ts';

/**
 * The servers pages' title row, shared by the list of every server and the grouped one, so the switch between
 * them sits in the same place on both. Core keeps the grouped page on '/' when the user starts there, so the
 * paths follow that setting. `children` go under the switch on the right (the grouped page's Create group).
 */
export default function ServersHeader({ children }: { children?: ReactNode }) {
  const { t } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [startOnGrouped] = useStartOnGroupedServers();
  const allPath = startOnGrouped ? '/all' : '/';
  const groupedPath = startOnGrouped ? '/' : '/grouped';

  return (
    <Group justify='space-between' align='flex-start' mb='md' wrap='nowrap' className='max-sm:flex-wrap!'>
      <div className='min-w-0'>
        <Title order={2}>{tExt('servers.title', {})}</Title>
        <Text size='sm' c='dimmed'>
          {tExt('servers.subtitle', {})}
        </Text>
      </div>
      <Group gap='sm' wrap='nowrap' className='max-sm:flex-wrap!'>
        {/* on phones the row wraps; the switch stays first, so it sits where it does on the other page */}
        {children && <div className='max-sm:order-last'>{children}</div>}
        <SegmentedControl
          value={pathname === groupedPath ? 'grouped' : 'all'}
          onChange={(value) => navigate(value === 'grouped' ? groupedPath : allPath)}
          data={[
            { value: 'all', label: t('pages.account.home.tabs.allServers.title', {}) },
            { value: 'grouped', label: t('pages.account.home.tabs.groupedServers.title', {}) },
          ]}
        />
      </Group>
    </Group>
  );
}
