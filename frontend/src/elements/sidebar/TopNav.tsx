import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useReducedMotion } from '@mantine/hooks';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import Button from '@/elements/Button.tsx';
import Menu from '@/elements/Menu.tsx';
import { useExtTranslations } from '../../translations.ts';
import { groupNav, isNavActive, isNavDivider, type NavEntry } from './nav.ts';

/** A sidebar section in the top bar: its label opens core's own links in a dropdown. */
function NavMenu({ label, items }: { label: string; items: ReactNode[] }) {
  const [opened, setOpened] = useState(false);
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const active = items.some((item) => isNavActive(item, pathname));

  useEffect(() => {
    setOpened(false);
  }, [pathname]);

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      trigger='click-hover'
      openDelay={80}
      closeDelay={200}
      position='bottom-start'
      offset={6}
      shadow='md'
      transitionProps={reduceMotion ? { duration: 0 } : undefined}
    >
      <Menu.Target>
        <Button
          variant={active ? 'light' : 'subtle'}
          color={active ? 'blue' : 'gray'}
          className='nebula-topnav-section'
          rightSection={<FontAwesomeIcon icon={faChevronDown} size='xs' />}
        >
          {label}
        </Button>
      </Menu.Target>
      {/* a click on a link, even the current one, closes the menu */}
      <Menu.Dropdown className='nebula-topnav-menu' onClick={() => setOpened(false)}>
        {items}
      </Menu.Dropdown>
    </Menu>
  );
}

/**
 * The horizontal layout's menu: core's Sidebar.Link elements in a row that scrolls sideways when it runs out of
 * room. With `sidebarGroups` on, each labelled divider's links go in a dropdown; other dividers are thin rules.
 */
export default function TopNav({ items, groups }: { items: ReactNode[]; groups: boolean }) {
  const { t } = useExtTranslations();
  const entries: NavEntry[] = groups ? groupNav(items) : items.map((node) => ({ kind: 'node', node }));

  return (
    <nav className='nebula-topnav' aria-label={t('topBar.navigation', {})}>
      {entries.map((entry, index) => {
        if (entry.kind === 'section') {
          return <NavMenu key={`section-${index}-${entry.label}`} label={entry.label} items={entry.items} />;
        }
        return isNavDivider(entry.node) ? <span key={`rule-${index}`} className='nebula-topnav-rule' /> : entry.node;
      })}
    </nav>
  );
}
