// An egg configuration's route order saved without Mint names the console `/`, which Mint gives to Home; the
// console (`/console`) must come back in that slot, and orders already made for Mint must stay untouched.
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

  test('an order that already lists the console is left alone', () => {
    const order = [route('/files'), route('/console'), route('/')];
    assert.equal(withConsoleRoute(order), order);
  });

  test('an order without `/` hides both Home and the console, as it would the console without Mint', () => {
    const order = [route('/files')];
    assert.equal(withConsoleRoute(order), order);
  });

  test('a redirect to `/` is not the console', () => {
    const order = [{ type: 'redirect', name: 'Docs', nameTranslations: {}, destination: '/' }, route('/files')];
    assert.equal(withConsoleRoute(order), order);
  });
});
