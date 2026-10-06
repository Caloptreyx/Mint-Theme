// The side menu's arrangement: saved orders reorder what core renders, never drop or invent entries, survive links
// core adds or hides later, and stored orders (user settings, the theme) are bounded strings only.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  arrange,
  EMPTY_NAV_ORDER,
  mergeNavOrder,
  mergeOrder,
  navLinkId,
  navMenuOf,
  navSectionId,
  normalizeNavOrder,
} from '../frontend/src/lib/navOrder.ts';

// null stands for an entry without an id, like a plain rule
const byId = (items: (string | null)[], order: string[]) => arrange(items, (item) => item, order);

describe('arrange', () => {
  test('follows the saved order', () => {
    assert.deepEqual(byId(['a', 'b', 'c'], ['c', 'a', 'b']), ['c', 'a', 'b']);
  });

  test('an empty order is core order', () => {
    assert.deepEqual(byId(['a', 'b', 'c'], []), ['a', 'b', 'c']);
  });

  test('ids the order does not know follow the entry core shows before them', () => {
    // core added `x` after `a` and `y` first; the user had put `a` last
    assert.deepEqual(byId(['y', 'a', 'x', 'b'], ['b', 'a']), ['y', 'b', 'a', 'x']);
  });

  test('consecutive unknown ids stay together and in core order', () => {
    assert.deepEqual(byId(['a', 'x', 'y', 'b'], ['b', 'a']), ['b', 'a', 'x', 'y']);
  });

  test('saved ids that are not in the menu change nothing', () => {
    assert.deepEqual(byId(['a', 'b'], ['gone', 'b', 'other', 'a']), ['b', 'a']);
  });

  test('entries without an id keep their slot', () => {
    assert.deepEqual(byId(['a', null, 'b', 'c'], ['c', 'b', 'a']), ['c', null, 'b', 'a']);
  });

  test('never drops or duplicates entries', () => {
    const items = ['a', 'b', null, 'c', 'd', 'e'];
    const out = byId(items, ['e', 'zz', 'c', 'a', 'c']);
    assert.deepEqual([...out].sort(), [...items].sort());
  });

  test('items sharing an id keep their order among themselves', () => {
    const items = [
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
      { id: 'a', n: 3 },
    ];
    assert.deepEqual(
      arrange(items, (item) => item.id, ['b', 'a']).map((item) => item.n),
      [2, 1, 3],
    );
  });
});

describe('mergeOrder', () => {
  test('ids not on screen this time keep their place after the id they followed', () => {
    // `/mods` belongs to another egg's server menu
    assert.deepEqual(mergeOrder(['/files', '/mods', '/console'], ['/console', '/files']), [
      '/console',
      '/files',
      '/mods',
    ]);
  });

  test('a hidden id that came first stays first', () => {
    assert.deepEqual(mergeOrder(['x', 'a', 'b'], ['b', 'a']), ['x', 'b', 'a']);
  });

  test('the new arrangement wins for every id on screen', () => {
    assert.deepEqual(mergeOrder(['a', 'b', 'c'], ['c', 'b', 'a']), ['c', 'b', 'a']);
  });
});

describe('mergeNavOrder', () => {
  test('merges the top level and each section, keeping sections not on screen', () => {
    const previous = { top: ['section:a', 'x'], sections: { 'section:a': ['1', '2'], 'section:gone': ['9'] } };
    const next = { top: ['x'], sections: { 'section:a': ['2'] } };
    assert.deepEqual(mergeNavOrder(previous, next), {
      top: ['section:a', 'x'],
      sections: { 'section:a': ['1', '2'], 'section:gone': ['9'] },
    });
  });
});

describe('normalizeNavOrder', () => {
  test('keeps a valid order', () => {
    const order = { top: ['/a', 'section:b'], sections: { 'section:b': ['/c', '/d'] } };
    assert.deepEqual(normalizeNavOrder(order), order);
  });

  test('anything but an order is empty', () => {
    for (const raw of [null, undefined, 'x', 1, [], { top: 'a' }, { sections: [] }]) {
      assert.deepEqual(normalizeNavOrder(raw), EMPTY_NAV_ORDER, JSON.stringify(raw));
    }
  });

  test('drops non strings, empty and overlong ids, duplicates and empty sections', () => {
    const long = 'x'.repeat(301);
    assert.deepEqual(
      normalizeNavOrder({
        top: ['a', 1, '', long, 'a', null, 'b'],
        sections: { s: [2, 'c', 'c'], empty: [], bad: 'x', [long]: ['d'] },
      }),
      { top: ['a', 'b'], sections: { s: ['c'] } },
    );
  });

  test('bounds the size', () => {
    const many = Array.from({ length: 500 }, (_, i) => `/${i}`);
    const sections = Object.fromEntries(many.map((id) => [id, [id]]));
    const out = normalizeNavOrder({ top: many, sections });
    assert.equal(out.top.length, 200);
    assert.equal(Object.keys(out.sections).length, 50);
  });

  test('a `__proto__` section id stays a plain key', () => {
    const out = normalizeNavOrder(JSON.parse('{"top":[],"sections":{"__proto__":["a"]}}'));
    assert.deepEqual(Object.getPrototypeOf(out.sections), Object.prototype);
    assert.deepEqual(Object.getOwnPropertyDescriptor(out.sections, '__proto__')?.value, ['a']);
  });
});

describe('ids', () => {
  test('a server link leaves out the server so one order fits every server', () => {
    assert.equal(navLinkId('/server/1a2b3c4d/files'), '/server/files');
    assert.equal(navLinkId('/server/1a2b3c4d'), '/server');
    assert.equal(navLinkId('/server/1a2b3c4d/files/*'), '/server/files');
    assert.equal(navLinkId('/admin/servers'), '/admin/servers');
    assert.equal(navLinkId('/admin/servers/1a2b3c4d'), '/admin/servers/:server');
    assert.equal(navLinkId('https://example.com/server/x'), 'https://example.com/server/x');
  });

  test("an admin category's section is its category key, whatever the label's language", () => {
    assert.equal(navSectionId('System', '.0/.1:$system/.0'), 'section:system');
    assert.equal(navSectionId('Système', 'menu/.0/.1:$system/.0'), 'section:system');
  });

  test('a divider from a route order is its label', () => {
    assert.equal(navSectionId('Management', '.0/.$divider-3'), 'section:Management');
    assert.equal(navSectionId('Management', 'menu/.0/.$divider-3'), 'section:Management');
    assert.equal(navSectionId('Management', null), 'section:Management');
  });

  test('the menu follows the page', () => {
    assert.equal(navMenuOf('/server/abc/files'), 'server');
    assert.equal(navMenuOf('/admin'), 'admin');
    assert.equal(navMenuOf('/admin/users'), 'admin');
    assert.equal(navMenuOf('/administrator'), 'dashboard');
    assert.equal(navMenuOf('/account/api-keys'), 'dashboard');
    assert.equal(navMenuOf('/'), 'dashboard');
    assert.equal(navMenuOf('/oobe/register'), null);
  });
});
