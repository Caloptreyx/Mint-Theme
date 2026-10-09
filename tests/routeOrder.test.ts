// An egg configuration's route order saved without Mint names the console `/`, which Mint gives to Home; the
// console (`/console`) must come back in that slot, and orders already made for Mint must stay untouched. Home is
// the server root core links to, so an order keeping the console must keep `/` as well. With Home turned off the
// console is `/` again, so an order made while Home was on must not lose it.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { withConsoleRoute } from '../frontend/src/lib/routeOrder.ts';

const route = (path: string) => ({ type: 'route', path });
const divider = { type: 'divider', name: 'Manage', nameTranslations: {} };

describe('withConsoleRoute with Home', () => {
  test('an order saved without Mint gets the console right after its `/`', () => {
    const order = [divider, route('/'), route('/files'), divider];
    assert.deepEqual(withConsoleRoute(order, true), [divider, route('/'), route('/console'), route('/files'), divider]);
    assert.deepEqual(order, [divider, route('/'), route('/files'), divider], 'the stored order is not mutated');
  });

  test('an order that lists both Home and the console is left alone', () => {
    const order = [route('/files'), route('/console'), route('/')];
    assert.equal(withConsoleRoute(order, true), order);
  });

  test('an order keeping the console but not Home gets `/` right before `/console`', () => {
    const order = [divider, route('/files'), route('/console'), divider];
    assert.deepEqual(withConsoleRoute(order, true), [divider, route('/files'), route('/'), route('/console'), divider]);
    assert.deepEqual(order, [divider, route('/files'), route('/console'), divider], 'the stored order is not mutated');
  });

  test('the console listed first gets Home in front of it', () => {
    assert.deepEqual(withConsoleRoute([route('/console'), route('/files')], true), [
      route('/'),
      route('/console'),
      route('/files'),
    ]);
  });

  test('an order without `/` hides both Home and the console, as it would the console without Mint', () => {
    const order = [route('/files')];
    assert.equal(withConsoleRoute(order, true), order);
  });

  test('a redirect to `/` or `/console` is not a route', () => {
    const order = [{ type: 'redirect', name: 'Docs', nameTranslations: {}, destination: '/' }, route('/files')];
    assert.equal(withConsoleRoute(order, true), order);
    const toConsole = [{ type: 'redirect', name: 'Log', nameTranslations: {}, destination: '/console' }];
    assert.equal(withConsoleRoute(toConsole, true), toConsole);
  });
});

describe('withConsoleRoute without Home', () => {
  test('an order made while Home was on keeps the console, now at `/`, in its slot', () => {
    const order = [divider, route('/files'), route('/console'), divider];
    assert.deepEqual(withConsoleRoute(order, false), [divider, route('/files'), route('/'), divider]);
    assert.deepEqual(order, [divider, route('/files'), route('/console'), divider], 'the stored order is not mutated');
  });

  test('orders that already list `/` are left alone, with or without `/console`', () => {
    for (const order of [
      [route('/'), route('/files')],
      [route('/'), route('/console'), route('/files')],
    ]) {
      assert.equal(withConsoleRoute(order, false), order);
    }
  });

  test('an order without either hides the console, as in core', () => {
    const order = [route('/files')];
    assert.equal(withConsoleRoute(order, false), order);
  });

  test('a redirect to `/console` is not renamed', () => {
    const order = [{ type: 'redirect', name: 'Log', nameTranslations: {}, destination: '/console' }];
    assert.equal(withConsoleRoute(order, false), order);
  });
});
