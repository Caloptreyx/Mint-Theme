import { faMagnifyingGlass, faServer, faUser, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Combobox, TextInput, useCombobox } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
import { useNebulaTheme } from '../../lib/apply.ts';
import {
  ActionIcon,
  type adminFullUserSchema,
  type adminServerSchema,
  effectiveBinding,
  getAdminServers,
  getAdminUsers,
  getServers,
  getShortcutDefinition,
  httpErrorToHuman,
  isAdmin,
  Kbd,
  type ModifierKey,
  QuickActionsTrigger,
  ServerSwitcher,
  Spinner,
  type serverSchema,
  Text,
  Tooltip,
  useAuth,
  useQuickActionLocation,
  useQuickActionsStore,
  useServerQuickActionTarget,
  useShortcutOverrides,
  useToast,
} from '../../lib/core.ts';
import type { SearchComponent } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';

const MAX_RESULTS = 6;
const QUICK_ACTIONS_OPTION = 'nebula:quick-actions';
const DEBOUNCE_MS = 150;
const NO_ITEMS: never[] = [];

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

/**
 * One of the search's lists for the debounced `term`. `settled` says the items are the answer for that term, not
 * the previous term's kept on screen while it loads, so Enter never opens a result of an older query.
 */
function useResults<T>(
  key: string,
  term: string,
  enabled: boolean,
  fetcher: (search: string) => Promise<Pagination<T>>,
): { items: T[]; loading: boolean; settled: boolean } {
  const { addToast } = useToast();
  const { data, isFetching, isPlaceholderData, error } = useQuery({
    queryKey: ['nebula', 'nav-search', key, { search: term }],
    queryFn: () => fetcher(term),
    enabled,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (error) addToast(httpErrorToHuman(error), 'error');
  }, [error, addToast]);

  return {
    items: enabled ? (data?.data ?? NO_ITEMS) : NO_ITEMS,
    loading: enabled && isFetching,
    settled: !enabled || (!isFetching && !isPlaceholderData),
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

  const [term] = useDebouncedValue(query, DEBOUNCE_MS);
  const servers = useResults<z.infer<typeof serverSchema>>('servers', term, opened && !adminServers, (search) =>
    getServers(1, search),
  );
  const allServers = useResults<z.infer<typeof adminServerSchema>>(
    'admin-servers',
    term,
    opened && adminServers,
    (search) => getAdminServers(1, search),
  );
  const users = useResults<z.infer<typeof adminFullUserSchema>>('admin-users', term, opened && adminUsers, (search) =>
    getAdminUsers(1, search),
  );

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
  const loading = servers.loading || allServers.loading || users.loading;
  // the rows on screen answer what is typed: no keystroke still waiting out the debounce, no request in flight
  const settled = term === query && servers.settled && allServers.settled && users.settled;
  const resultsKey = results.map((result) => result.key).join('|');

  // Enter takes the top row once something is typed, as in core's palette, but only once the rows are the
  // answer to it. Mantine only announces rows picked with the arrow keys, so this one goes to the target below.
  const [autoOption, setAutoOption] = useState<string | null>(null);
  useEffect(() => {
    if (opened && query && settled) {
      setAutoOption(combobox.selectFirstOption());
    } else {
      combobox.resetSelectedOption();
      setAutoOption(null);
    }
  }, [opened, query, settled, resultsKey]);

  const submit = (value: string) => {
    const result = results.find((entry) => entry.key === value);
    combobox.closeDropdown();
    input.current?.blur();
    setQuery('');

    if (result) navigate(result.path);
    else openQuickActions(query);
  };

  const showHint = !!hint && !focused && !query && !loading;

  return (
    <Combobox store={combobox} onOptionSubmit={submit} withinPortal={portal}>
      <Combobox.Target withExpandedAttribute {...(opened && autoOption ? { 'aria-activedescendant': autoOption } : {})}>
        <TextInput
          ref={input}
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
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
            // the arrow keys hand the announced row back to Mantine
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') setAutoOption(null);
            // Mantine closes an open list itself; on a closed one Escape clears the field and keeps focus
            if (event.key === 'Escape' && !combobox.dropdownOpened && query) setQuery('');
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
