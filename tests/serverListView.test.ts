import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseServerListView, resolveServerListView } from '../frontend/src/lib/serverListView.ts';

describe('parseServerListView', () => {
  test('accepts list and grid, returns null for anything else', () => {
    assert.equal(parseServerListView('list'), 'list');
    assert.equal(parseServerListView('grid'), 'grid');
    for (const raw of [null, undefined, '', 'List', 'GRID', 'cards']) {
      assert.equal(parseServerListView(raw), null, String(raw));
    }
  });
});

describe('resolveServerListView', () => {
  test('outside preview, an explicit browser choice overrides the theme default', () => {
    assert.equal(
      resolveServerListView({ themeView: 'list', inPreview: false, storedView: null, previewHint: null }),
      'list',
    );
    assert.equal(
      resolveServerListView({ themeView: 'grid', inPreview: false, storedView: null, previewHint: null }),
      'grid',
    );
    assert.equal(
      resolveServerListView({ themeView: 'grid', inPreview: false, storedView: 'list', previewHint: null }),
      'list',
    );
    assert.equal(
      resolveServerListView({ themeView: 'list', inPreview: false, storedView: 'grid', previewHint: 'list' }),
      'grid',
    );
  });

  test('inside preview, browser storage is ignored so live theme and card-style hints show immediately', () => {
    assert.equal(
      resolveServerListView({ themeView: 'grid', inPreview: true, storedView: 'list', previewHint: null }),
      'grid',
    );
    assert.equal(
      resolveServerListView({ themeView: 'list', inPreview: true, storedView: 'grid', previewHint: null }),
      'list',
    );
    // picking a card style forces Grid view in preview even when the theme default is List
    assert.equal(
      resolveServerListView({ themeView: 'list', inPreview: true, storedView: 'list', previewHint: 'grid' }),
      'grid',
    );
    // manual toggle inside the iframe overrides until cleared by a newer preview sequence
    assert.equal(
      resolveServerListView({
        themeView: 'list',
        inPreview: true,
        storedView: 'list',
        previewHint: 'grid',
        iframeOverride: 'list',
      }),
      'list',
    );
  });
});
