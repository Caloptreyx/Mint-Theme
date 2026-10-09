import { faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Input } from '@mantine/core';
import { Button, Stack, Switch, Text } from '../../lib/core.ts';
import { EMPTY_NAV_ORDER, isEmptyNavOrder, mergeNavOrder, NAV_MENUS } from '../../lib/navOrder.ts';
import type { NebulaTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import NavArranger, { arrangedOrder, toArrangeItems, useAdminMenu } from '../sidebar/NavArranger.tsx';
import { arrangeMenu, groupNav } from '../sidebar/nav.ts';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

/**
 * Menu order section: the collapsible sections of the server menu (`sidebarGroups`), whether users may arrange each
 * menu (`userArrange`), and the admin area's menu order for everyone (`adminNavOrder`). Core has route order editors
 * for the server and dashboard menus but none for the admin menu. That order lists the admin menu beside the editor
 * as core renders it (GroupedNav publishes it), so links the admin's role cannot open are not listed and keep their
 * saved place.
 */
export default function NavOrderField({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const menu = useAdminMenu();
  const items = toArrangeItems(groupNav(arrangeMenu(menu, [theme.adminNavOrder])), null);

  return (
    <Stack gap='lg'>
      <Switch
        label={t('editor.sidebarGroups', {})}
        description={t('editor.sidebarGroupsDescription', {})}
        checked={theme.sidebarGroups}
        onChange={(e) => set({ sidebarGroups: e.currentTarget.checked })}
      />
      <Input.Wrapper
        label={t('editor.navOrder.userArrange', {})}
        description={t('editor.navOrder.userArrangeDescription', {})}
      >
        <Stack gap='xs' mt='xs'>
          {NAV_MENUS.map((menu) => (
            <Switch
              key={menu}
              label={t(`editor.navOrder.menus.${menu}`, {})}
              checked={theme.userArrange[menu]}
              onChange={(e) => set({ userArrange: { ...theme.userArrange, [menu]: e.currentTarget.checked } })}
            />
          ))}
        </Stack>
      </Input.Wrapper>
      <Input.Wrapper label={t('editor.navOrder.label', {})} description={t('editor.navOrder.description', {})}>
        <Stack gap='xs' mt='xs'>
          {items.length > 0 ? (
            <NavArranger
              items={items}
              onChange={(next) => set({ adminNavOrder: mergeNavOrder(theme.adminNavOrder, arrangedOrder(next)) })}
            />
          ) : (
            <Text size='xs' c='dimmed'>
              {t('editor.navOrder.empty', {})}
            </Text>
          )}
          <Button
            variant='default'
            className='self-start'
            leftSection={<FontAwesomeIcon icon={faRotateLeft} />}
            disabled={isEmptyNavOrder(theme.adminNavOrder)}
            onClick={() => set({ adminNavOrder: EMPTY_NAV_ORDER })}
          >
            {t('editor.navOrder.reset', {})}
          </Button>
        </Stack>
      </Input.Wrapper>
    </Stack>
  );
}
