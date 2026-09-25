import { faMagnifyingGlass, faServer, faUser, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Combobox, TextInput, useCombobox } from '@mantine/core';
import {
  Children,
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import getAdminServers from '@/api/admin/servers/getServers.ts';
import getAdminUsers from '@/api/admin/users/getUsers.ts';
import getServers from '@/api/server/getServers.ts';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Kbd from '@/elements/Kbd.tsx';
import QuickActionsTrigger from '@/elements/quickActions/QuickActionsTrigger.tsx';
import ServerSwitcher from '@/elements/ServerSwitcher.tsx';
import Spinner from '@/elements/Spinner.tsx';
import Text from '@/elements/Text.tsx';
import Tooltip from '@/elements/Tooltip.tsx';
import { isAdmin } from '@/lib/permissions.ts';
import { useServerQuickActionTarget } from '@/lib/quickActions/coreQuickActions.tsx';
import { getShortcutDefinition } from '@/lib/quickActions/coreShortcuts.tsx';
import { useShortcutOverrides } from '@/lib/quickActions/shortcutOverrides.ts';
import { effectiveBinding, type ModifierKey } from '@/lib/quickActions/shortcuts.ts';
import type { adminServerSchema } from '@/lib/schemas/admin/servers.ts';
import type { adminFullUserSchema } from '@/lib/schemas/admin/users.ts';
import type { serverSchema } from '@/lib/schemas/server/server.ts';
import { useQuickActionLocation } from '@/plugins/useQuickActions.ts';
import { useSearchableResource } from '@/plugins/useSearchableResource.ts';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { useQuickActionsStore } from '@/stores/quickActions.ts';
import { useNebulaTheme } from '../../lib/apply.ts';
import type { SearchComponent } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';

const MAX_RESULTS = 6;
const QUICK_ACTIONS_OPTION = 'nebula:quick-actions';

// core's QuickActionsTrigger labels the shortcut like this; its formatter is not exported
const MODIFIER_LABELS: [ModifierKey, string, string][] = [
  ['ctrlOrMeta', 'Ctrl', 'Cmd'],
  ['ctrl', 'Ctrl', 'Ctrl'],
  ['meta', 'Cmd', 'Cmd'],
  ['alt', 'Alt', 'Opt'],
  ['shift', 'Shift', 'Shift'],
];

/** The palette's shortcut as the user has it bound, or null when they turned it off. */
function useQuickActionsHint(): string | null {
  const overrides = useShortcutOverrides();
  const definition = getShortcutDefinition('general.quickActions');
  const binding = definition ? effectiveBinding(definition, overrides) : null;
  if (!binding) return null;

  const mac = navigator.platform.toUpperCase().includes('MAC');
  const parts = MODIFIER_LABELS.filter(([modifier]) => binding.modifiers.includes(modifier)).map(([, pc, apple]) =>
    mac ? apple : pc,
  );
  parts.push(binding.key === ' ' ? 'Space' : binding.key.length === 1 ? binding.key.toUpperCase() : binding.key);
  return parts.join('+');
}

/** Opens core's palette with `query` typed in; its own shortcut keeps working whatever the menu shows. */
function useOpenQuickActions() {
  const setQuery = useQuickActionsStore((state) => state.setQuery);
  const setOpen = useQuickActionsStore((state) => state.setOpen);

  return (query: string) => {
    setQuery(query);
    setOpen(true);
  };
}

interface Result {
  key: string;
  label: string;
  description: string;
  path: string;
}

function ResultOption({ result, icon }: { result: Result; icon: IconDefinition }) {
  return (
    <Combobox.Option value={result.key}>
      <div className='flex min-w-0 items-center gap-2.5'>
        <FontAwesomeIcon icon={icon} className='shrink-0 text-(--mantine-color-dimmed)' />
        <div className='min-w-0'>
          <Text size='sm' truncate>
            {result.label}
          </Text>
          <Text size='xs' c='dimmed' truncate>
            {result.description}
          </Text>
        </div>
      </div>
    </Combobox.Option>
  );
}

/**
 * An always visible field that finds the user's servers as they type, or in the admin area every server and
 * user the admin may read, like core's palette does there. The last row hands the query to the palette.
 */
function SearchBar() {
  const { t } = useExtTranslations();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scope } = useQuickActionLocation();
  const serverTarget = useServerQuickActionTarget();
  const openQuickActions = useOpenQuickActions();
  const hint = useQuickActionsHint();
  const input = useRef<HTMLInputElement>(null);
  // inside the phone drawer the dropdown stays in place, as core's server switcher does; in the desktop
  // sidebar it goes to a portal so the sidebar's overflow cannot clip it
  const [portal, setPortal] = useState(true);
  useEffect(() => setPortal(!!input.current?.closest('#sidebar-desktop')), []);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
    },
  });
  const opened = combobox.dropdownOpened;

  const adminServers = scope === 'admin' && !!isAdmin(user, 'servers.read');
  const adminUsers = scope === 'admin' && !!isAdmin(user, 'users.read');

  const servers = useSearchableResource<z.infer<typeof serverSchema>>({
    queryKey: ['nebula', 'nav-search', 'servers'],
    fetcher: (search) => getServers(1, search),
    canRequest: opened && !adminServers,
  });
  const allServers = useSearchableResource<z.infer<typeof adminServerSchema>>({
    queryKey: ['nebula', 'nav-search', 'admin-servers'],
    fetcher: (search) => getAdminServers(1, search),
    canRequest: opened && adminServers,
  });
  const users = useSearchableResource<z.infer<typeof adminFullUserSchema>>({
    queryKey: ['nebula', 'nav-search', 'admin-users'],
    fetcher: (search) => getAdminUsers(1, search),
    canRequest: opened && adminUsers,
  });

  const serverResults: Result[] = adminServers
    ? allServers.items.slice(0, MAX_RESULTS).map((server) => ({
        key: `admin-server:${server.uuid}`,
        label: server.name,
        description: server.owner.username,
        path: `/admin/servers/${server.uuid}`,
      }))
    : servers.items.slice(0, MAX_RESULTS).map((server) => ({
        key: `server:${server.uuid}`,
        label: server.name,
        description: server.nodeName,
        path: serverTarget(server),
      }));
  const userResults: Result[] = adminUsers
    ? users.items.slice(0, MAX_RESULTS).map((found) => ({
        key: `user:${found.uuid}`,
        label: found.username,
        description: found.email,
        path: `/admin/users/${found.uuid}`,
      }))
    : [];
  const results = [...serverResults, ...userResults];
  const loading = opened && ((adminServers ? allServers.loading : servers.loading) || (adminUsers && users.loading));
  const resultsKey = results.map((result) => result.key).join('|');

  // Enter takes the top row once something is typed, as in core's palette
  useEffect(() => {
    if (opened && query) combobox.selectFirstOption();
  }, [opened, query, resultsKey]);

  const search = (value: string) => {
    setQuery(value);
    servers.setSearch(value);
    allServers.setSearch(value);
    users.setSearch(value);
  };

  const submit = (value: string) => {
    const result = results.find((entry) => entry.key === value);
    combobox.closeDropdown();
    input.current?.blur();
    search('');

    if (result) navigate(result.path);
    else openQuickActions(query);
  };

  const showHint = !!hint && !focused && !query && !loading;

  return (
    <Combobox store={combobox} onOptionSubmit={submit} withinPortal={portal}>
      <Combobox.Target>
        <TextInput
          ref={input}
          value={query}
          onChange={(event) => {
            search(event.currentTarget.value);
            combobox.openDropdown();
          }}
          onFocus={() => {
            setFocused(true);
            combobox.openDropdown();
          }}
          onClick={() => combobox.openDropdown()}
          onBlur={() => {
            setFocused(false);
            combobox.closeDropdown();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') input.current?.blur();
          }}
          placeholder={t('navSearch.placeholder', {})}
          aria-label={t('navSearch.placeholder', {})}
          leftSection={<FontAwesomeIcon icon={faMagnifyingGlass} size='sm' />}
          rightSection={loading ? <Spinner size={14} /> : showHint ? <Kbd size='xs'>{hint}</Kbd> : null}
          rightSectionWidth={showHint && hint ? hint.length * 7 + 16 : undefined}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={360} style={{ overflowY: 'auto' }}>
          {serverResults.length > 0 && (
            <Combobox.Group label={t(adminServers ? 'navSearch.allServers' : 'navSearch.servers', {})}>
              {serverResults.map((result) => (
                <ResultOption key={result.key} result={result} icon={faServer} />
              ))}
            </Combobox.Group>
          )}
          {userResults.length > 0 && (
            <Combobox.Group label={t('navSearch.users', {})}>
              {userResults.map((result) => (
                <ResultOption key={result.key} result={result} icon={faUser} />
              ))}
            </Combobox.Group>
          )}
          {!loading && results.length === 0 && <Combobox.Empty>{t('navSearch.empty', {})}</Combobox.Empty>}
          <Combobox.Option value={QUICK_ACTIONS_OPTION}>
            <div className='flex min-w-0 items-center gap-2.5'>
              <FontAwesomeIcon icon={faMagnifyingGlass} className='shrink-0 text-(--mantine-color-dimmed)' />
              <Text size='sm' truncate className='flex-1'>
                {query ? t('navSearch.everything', { query }) : t('navSearch.quickActions', {})}
              </Text>
              {hint && <Kbd size='xs'>{hint}</Kbd>}
            </div>
          </Combobox.Option>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

/** The slim rail has no room for a field, so an icon opens the palette instead (`#` is its server search). */
function RailButton({ mode }: { mode: Exclude<SearchComponent, 'palette'> }) {
  const { t } = useExtTranslations();
  const openQuickActions = useOpenQuickActions();
  const selector = mode === 'serverSelector';
  const label = t(selector ? 'navSearch.switchServer' : 'navSearch.placeholder', {});

  return (
    <div className='nebula-nav-search-icon'>
      <Tooltip label={label} position='right'>
        <ActionIcon
          variant='default'
          size='lg'
          aria-label={label}
          onClick={() => openQuickActions(selector ? '#' : '')}
        >
          <FontAwesomeIcon icon={selector ? faServer : faMagnifyingGlass} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}

/** Core's Quick actions button (`fallback`), or in its place core's server switcher or the search bar. */
export function NavSearch({ fallback, isServer }: { fallback: ReactNode; isServer: boolean }) {
  const { searchComponent } = useNebulaTheme();
  if (searchComponent === 'palette') return fallback;

  return (
    <div className='nebula-nav-search mt-2'>
      <div className='nebula-nav-search-full'>
        {searchComponent === 'serverSelector' ? <ServerSwitcher isServer={isServer} /> : <SearchBar />}
      </div>
      <RailButton mode={searchComponent} />
    </div>
  );
}

/** Core's server switcher at the bottom of the menu (`fallback`); the other modes search from the top instead. */
export function NavSearchFooter({ fallback }: { fallback: ReactNode }) {
  const { searchComponent } = useNebulaTheme();
  return searchComponent === 'palette' ? fallback : null;
}

/** Replaces matching elements anywhere in the routers' nested fragments, keeping the fragments walkable. */
function swap(node: ReactNode, replace: (element: ReactElement) => ReactNode | undefined): ReactNode {
  if (Array.isArray(node)) return Children.map(node, (child) => swap(child, replace));
  if (!isValidElement(node)) return node;

  const replaced = replace(node);
  if (replaced !== undefined) return replaced;
  if (node.type !== Fragment) return node;

  return cloneElement(node, undefined, swap((node.props as { children?: ReactNode }).children, replace));
}

/**
 * Sidebar props interceptor: core's Quick actions button and server switcher sit in the sidebar's header and
 * footer, which the routers build; they are swapped in place for components that read `searchComponent` live.
 */
export function withNavSearch<P extends { header?: ReactNode; footer?: ReactNode }>(props: P): P {
  let isServer = false;
  const footer = swap(props.footer, (element) => {
    if (element.type !== ServerSwitcher) return undefined;
    isServer = !!(element.props as { isServer?: boolean }).isServer;
    return createElement(NavSearchFooter, { key: element.key ?? undefined, fallback: element });
  });
  const header = swap(props.header, (element) =>
    element.type === QuickActionsTrigger
      ? createElement(NavSearch, { key: element.key ?? undefined, fallback: element, isServer })
      : undefined,
  );

  return { ...props, header, footer };
}
