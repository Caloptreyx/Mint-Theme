// Sorting, grouping, the status filter and client side pages of the servers list: the stored choice is read back
// from localStorage, servers without a value (no live stats, no status yet) must never sort above the ones that
// have one, and a status comes from the server itself before the node's live state.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Server } from '../frontend/src/elements/dashboard/ServerRow.tsx';
import {
  FETCH_ALL_MAX_PAGES,
  filterServers,
  groupServers,
  needsUsage,
  nextSort,
  type OrderContext,
  pageOfGroups,
  pagesToFetch,
  parseGroup,
  parseSort,
  rowStatus,
  serializeSort,
  sortServers,
  type Usage,
} from '../frontend/src/elements/dashboard/serverOrder.ts';

const server = (uuid: string, name: string, location = 'Berlin', egg = 'Paper', over: Partial<Server> = {}) =>
  ({
    uuid,
    uuidShort: uuid,
    name,
    locationUuid: `loc-${location}`,
    locationName: location,
    egg: { uuid: `egg-${egg}`, name: egg },
    isSuspended: false,
    status: null,
    ...over,
  }) as unknown as Server;

const running = (cpu: number): Usage => ({ state: 'running', cpuAbsolute: cpu, memoryBytes: cpu * 10, uptime: cpu });
const inState = (state: string): Usage => ({ ...running(1), state });
const names = (list: Server[]) => list.map((entry) => entry.name);
const context = (usage: Record<string, Usage>): OrderContext => ({ usage: (uuid) => usage[uuid] });

describe('stored choices', () => {
  test('a stored sort round trips', () => {
    assert.deepEqual(parseSort(serializeSort({ key: 'cpu', dir: 'desc' })), { key: 'cpu', dir: 'desc' });
    assert.equal(serializeSort(null), null);
  });

  test('anything unknown falls back to the API order and no grouping', () => {
    for (const raw of [null, '', 'name', 'name:up', 'owner:asc', 'name:asc:x']) assert.equal(parseSort(raw), null);
    assert.equal(parseGroup('node'), 'none');
    assert.equal(parseGroup(null), 'none');
    assert.equal(parseGroup('game'), 'game');
  });
});

describe('header clicks', () => {
  test('cycle ascending, descending, off', () => {
    assert.deepEqual(nextSort(null, 'name'), { key: 'name', dir: 'asc' });
    assert.deepEqual(nextSort({ key: 'name', dir: 'asc' }, 'name'), { key: 'name', dir: 'desc' });
    assert.equal(nextSort({ key: 'name', dir: 'desc' }, 'name'), null);
  });

  test('another column starts ascending', () => {
    assert.deepEqual(nextSort({ key: 'name', dir: 'desc' }, 'ram'), { key: 'ram', dir: 'asc' });
  });
});

describe('sortServers', () => {
  const list = [server('a', 'srv 10'), server('b', 'Srv 9'), server('c', 'alpha'), server('d', 'beta')];
  const usage: Record<string, Usage> = {
    a: running(50),
    b: { ...running(90), state: 'offline' },
    d: running(5),
  };
  const ctx = context(usage);

  test('no sort keeps the API order', () => {
    assert.deepEqual(names(sortServers(list, null, ctx)), ['srv 10', 'Srv 9', 'alpha', 'beta']);
  });

  test('names compare case insensitively and numbers naturally', () => {
    assert.deepEqual(names(sortServers(list, { key: 'name', dir: 'asc' }, ctx)), ['alpha', 'beta', 'Srv 9', 'srv 10']);
    assert.deepEqual(names(sortServers(list, { key: 'name', dir: 'desc' }, ctx)), ['srv 10', 'Srv 9', 'beta', 'alpha']);
  });

  test('servers without live stats, or not running, go last in both directions', () => {
    assert.deepEqual(names(sortServers(list, { key: 'cpu', dir: 'asc' }, ctx)), ['beta', 'srv 10', 'Srv 9', 'alpha']);
    assert.deepEqual(names(sortServers(list, { key: 'cpu', dir: 'desc' }, ctx)), ['srv 10', 'beta', 'Srv 9', 'alpha']);
  });

  test('status follows the filter order, unreported last', () => {
    const mixed = [
      server('a', 'srv 10', 'Berlin', 'Paper', { status: 'installing' }),
      server('b', 'Srv 9', 'Berlin', 'Paper', { isSuspended: true }),
      server('c', 'alpha'),
      server('d', 'beta'),
    ];
    const byStatus = context({ a: running(1), c: running(1) });
    assert.deepEqual(names(sortServers(mixed, { key: 'status', dir: 'asc' }, byStatus)), [
      'alpha',
      'Srv 9',
      'srv 10',
      'beta',
    ]);
    assert.deepEqual(names(sortServers(mixed, { key: 'status', dir: 'desc' }, byStatus)), [
      'srv 10',
      'Srv 9',
      'alpha',
      'beta',
    ]);
  });
});

describe('rowStatus', () => {
  test('suspension wins over everything, then the panel status, then the live state', () => {
    const suspended = { isSuspended: true, status: 'installing' as const };
    assert.equal(rowStatus(suspended, running(1)), 'suspended');
    assert.equal(rowStatus({ isSuspended: true, status: null }, undefined), 'suspended');
    assert.equal(rowStatus({ isSuspended: false, status: 'restoring_backup' }, running(1)), 'other');
    assert.equal(rowStatus({ isSuspended: false, status: null }, running(1)), 'running');
    assert.equal(rowStatus({ isSuspended: false, status: null }, inState('offline')), 'offline');
  });

  test('starting and stopping are other, no live state yet is unknown', () => {
    const plain = { isSuspended: false, status: null };
    assert.equal(rowStatus(plain, inState('starting')), 'other');
    assert.equal(rowStatus(plain, inState('stopping')), 'other');
    assert.equal(rowStatus(plain, undefined), null);
  });
});

describe('filterServers', () => {
  const list = [
    server('a', 'up'),
    server('b', 'down'),
    server('c', 'locked', 'Berlin', 'Paper', { isSuspended: true }),
    server('d', 'unreported'),
    server('e', 'installing', 'Berlin', 'Paper', { status: 'installing' }),
  ];
  const ctx = context({ a: running(1), b: inState('offline'), e: inState('offline') });

  test('a status filter keeps only servers in that status, from data the list already has', () => {
    assert.deepEqual(names(filterServers(list, 'running', ctx)), ['up']);
    assert.deepEqual(names(filterServers(list, 'offline', ctx)), ['down']);
    // suspended needs no live state at all, so it shows before the node answers
    assert.deepEqual(names(filterServers(list, 'suspended', ctx)), ['locked']);
  });

  test("'all' keeps every server, unreported ones included", () => {
    assert.equal(filterServers(list, 'all', ctx).length, list.length);
  });
});

describe('needsUsage', () => {
  test('only orderings that read the live state or values subscribe to it', () => {
    assert.equal(needsUsage(null, 'none', 'all'), false);
    assert.equal(needsUsage({ key: 'name', dir: 'asc' }, 'location', 'all'), false);
    assert.equal(needsUsage(null, 'none', 'offline'), true);
    assert.equal(needsUsage(null, 'status', 'all'), true);
    assert.equal(needsUsage({ key: 'status', dir: 'desc' }, 'none', 'all'), true);
    assert.equal(needsUsage({ key: 'uptime', dir: 'asc' }, 'none', 'all'), true);
  });
});

describe('pagesToFetch', () => {
  test('fetches every page only while ordering a list of a few pages', () => {
    assert.equal(pagesToFetch(52, 26, false), 0);
    assert.equal(pagesToFetch(26, 26, true), 0);
    assert.equal(pagesToFetch(27, 26, true), 2);
    assert.equal(pagesToFetch(26 * FETCH_ALL_MAX_PAGES, 26, true), FETCH_ALL_MAX_PAGES);
    assert.equal(pagesToFetch(26 * FETCH_ALL_MAX_PAGES + 1, 26, true), 0);
    assert.equal(pagesToFetch(0, 0, true), 0);
  });
});

describe('pageOfGroups', () => {
  const groups = [
    { key: 'x', label: 'X', servers: [server('a', 'a'), server('b', 'b'), server('c', 'c')] },
    { key: 'y', label: 'Y', servers: [server('d', 'd'), server('e', 'e')] },
  ];

  test('cuts the flat order into pages, a group split by the break showing on both', () => {
    assert.deepEqual(
      pageOfGroups(groups, 1, 2).map((group) => [group.key, names(group.servers)]),
      [['x', ['a', 'b']]],
    );
    assert.deepEqual(
      pageOfGroups(groups, 2, 2).map((group) => [group.key, names(group.servers)]),
      [
        ['x', ['c']],
        ['y', ['d']],
      ],
    );
    assert.deepEqual(
      pageOfGroups(groups, 3, 2).map((group) => [group.key, names(group.servers)]),
      [['y', ['e']]],
    );
    assert.deepEqual(pageOfGroups(groups, 4, 2), []);
  });
});

describe('groupServers', () => {
  const ctx = context({});
  const list = [
    server('a', 'one', 'Paris'),
    server('b', 'two', 'Berlin'),
    server('c', 'three', 'Paris'),
    server('d', 'four', 'Amsterdam'),
  ];

  test('no grouping is one group of everything', () => {
    const groups = groupServers(list, 'none', null, ctx);
    assert.equal(groups.length, 1);
    assert.deepEqual(names(groups[0].servers), ['one', 'two', 'three', 'four']);
  });

  test('groups go by name and keep the order inside', () => {
    const groups = groupServers(list, 'location', null, ctx);
    assert.deepEqual(
      groups.map((group) => [group.label, names(group.servers)]),
      [
        ['Amsterdam', ['four']],
        ['Berlin', ['two']],
        ['Paris', ['one', 'three']],
      ],
    );
  });

  test('sorting by the grouped field also orders the groups', () => {
    const groups = groupServers(list, 'location', { key: 'location', dir: 'desc' }, ctx);
    assert.deepEqual(
      groups.map((group) => group.label),
      ['Paris', 'Berlin', 'Amsterdam'],
    );
  });

  test('status groups follow the filter order, unreported servers count as other', () => {
    const groups = groupServers(list, 'status', null, context({ a: inState('offline'), c: running(1) }));
    assert.deepEqual(
      groups.map((group) => [group.key, names(group.servers)]),
      [
        ['running', ['three']],
        ['offline', ['one']],
        ['other', ['two', 'four']],
      ],
    );
  });
});
