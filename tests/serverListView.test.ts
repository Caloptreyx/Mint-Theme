import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  parseServerListView,
  patchForServerListChoice,
  resolveServerListView,
  SERVER_LIST_CHOICES,
  serverListChoiceOf,
} from '../frontend/src/lib/serverListView.ts';
import { SERVER_CARD_STYLES } from '../frontend/src/lib/theme.ts';

describe('parseServerListView', () => {
  test('accepts list and grid, returns null for anything else', () => {
    assert.equal(parseServerListView('list'), 'list');
    assert.equal(parseServerListView('grid'), 'grid');
    for (const raw of [null, undefined, '', 'List', 'GRID', 'cards']) {
      assert.equal(parseServerListView(raw), null, String(raw));
    }
  });
});

describe('unified servers list layout picker', () => {
  test('exposes table followed by every server card style', () => {
    assert.deepEqual(SERVER_LIST_CHOICES, ['table', ...SERVER_CARD_STYLES]);
    assert.equal(SERVER_LIST_CHOICES.length, 7);
  });

  test('maps theme state to table when in list view, else the active card style', () => {
    assert.equal(serverListChoiceOf({ serverListView: 'list', serverCardStyle: 'default' }), 'table');
    assert.equal(serverListChoiceOf({ serverListView: 'list', serverCardStyle: 'banner' }), 'table');
    for (const style of SERVER_CARD_STYLES) {
      assert.equal(serverListChoiceOf({ serverListView: 'grid', serverCardStyle: style }), style);
    }
  });

  test('picking table sets list view while preserving serverCardStyle; picking a card style sets grid view and style', () => {
    assert.deepEqual(patchForServerListChoice('table'), { serverListView: 'list' });
    for (const style of SERVER_CARD_STYLES) {
      assert.deepEqual(patchForServerListChoice(style), { serverListView: 'grid', serverCardStyle: style });
    }
  });
});

describe('resolveServerListView', () => {
  test('outside preview, an explicit browser choice overrides the theme default', () => {
    assert.equal(resolveServerListView({ themeView: 'list', inPreview: false, storedView: null }), 'list');
    assert.equal(resolveServerListView({ themeView: 'grid', inPreview: false, storedView: null }), 'grid');
    assert.equal(resolveServerListView({ themeView: 'grid', inPreview: false, storedView: 'list' }), 'list');
    assert.equal(resolveServerListView({ themeView: 'list', inPreview: false, storedView: 'grid' }), 'grid');
  });

  test('inside preview, browser storage is ignored so themeView shows immediately unless temporarily overridden', () => {
    assert.equal(resolveServerListView({ themeView: 'grid', inPreview: true, storedView: 'list' }), 'grid');
    assert.equal(resolveServerListView({ themeView: 'list', inPreview: true, storedView: 'grid' }), 'list');
    // manual toggle inside the iframe overrides until cleared by a theme layout/style change
    assert.equal(
      resolveServerListView({
        themeView: 'grid',
        inPreview: true,
        storedView: 'grid',
        iframeOverride: 'list',
      }),
      'list',
    );
    assert.equal(
      resolveServerListView({
        themeView: 'list',
        inPreview: true,
        storedView: 'list',
        iframeOverride: 'grid',
      }),
      'grid',
    );
  });
});
