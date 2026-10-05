// An egg configuration's route order saved without Mint names the console `/`, which Mint gives to Home; the
// console (`/console`) must come back in that slot, and orders already made for Mint must stay untouched. Home is
// the server root core links to, so an order keeping the console must keep `/` as well.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { withConsoleRoute } from '../frontend/src/lib/routeOrder.ts';

const route = (path: string) => ({ type: 'route', path });
const divider = { type: 'divider', name: 'Manage', nameTranslations: {} };

describe('withConsoleRoute', () => {
  test('an order saved without Mint gets the console right after its `/`', () => {
    const order = [divider, route('/'), route('/files'), divider];
    assert.deepEqual(withConsoleRoute(order), [divider, route('/'), route('/console'), route('/files'), divider]);
    assert.deepEqual(order, [divider, route('/'), route('/files'), divider], 'the stored order is not mutated');
  });

  test('an order that lists both Home and the console is left alone', () => {
    const order = [route('/files'), route('/console'), route('/')];
    assert.equal(withConsoleRoute(order), order);
  });

  test('an order keeping the console but not Home gets `/` right before `/console`', () => {
    const order = [divider, route('/files'), route('/console'), divider];
    assert.deepEqual(withConsoleRoute(order), [divider, route('/files'), route('/'), route('/console'), divider]);
    assert.deepEqual(order, [divider, route('/files'), route('/console'), divider], 'the stored order is not mutated');
  });

  test('the console listed first gets Home in front of it', () => {
    assert.deepEqual(withConsoleRoute([route('/console'), route('/files')]), [
      route('/'),
      route('/console'),
      route('/files'),
    ]);
  });

  test('an order without `/` hides both Home and the console, as it would the console without Mint', () => {
    const order = [route('/files')];
    assert.equal(withConsoleRoute(order), order);
  });

  test('a redirect to `/` or `/console` is not a route', () => {
    const order = [{ type: 'redirect', name: 'Docs', nameTranslations: {}, destination: '/' }, route('/files')];
    assert.equal(withConsoleRoute(order), order);
    const toConsole = [{ type: 'redirect', name: 'Log', nameTranslations: {}, destination: '/console' }];
    assert.equal(withConsoleRoute(toConsole), toConsole);
  });
});
