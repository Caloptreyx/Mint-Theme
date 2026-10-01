// The theme editor's search: which settings a query finds, in which order, and the hint shown when only a
// description or an option matched.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { expandTerms, searchSettings } from '../frontend/src/lib/editorSearch.ts';

const docs = [
  { label: 'Toast style', section: 'Interface', also: ['The messages that pop up after saving', 'Default', 'Glassy'] },
  { label: 'Glassy effect', section: 'Style', also: ['Blocks', 'For a glassy look set block opacity'] },
  { label: 'Card corners', section: 'Style', also: ['Blocks'] },
  { label: 'Block opacity', section: 'Style', also: ['Blocks'] },
  { label: 'Logo URL', section: 'Login page', also: ["Replaces the panel's logo"] },
  { label: 'Hintergrundbild', section: 'Hintergrund', also: ['Bildschirmfüllend'] },
];
const labels = (query: string) => searchSettings(docs, query).map((hit) => hit.doc.label);

describe('searchSettings', () => {
  test('an empty or blank query finds nothing', () => {
    assert.deepEqual(searchSettings(docs, ''), []);
    assert.deepEqual(searchSettings(docs, '   '), []);
  });

  test('every word has to match, each anywhere in the setting', () => {
    assert.deepEqual(labels('glassy pop'), ['Toast style']);
    assert.deepEqual(labels('login logo'), ['Logo URL']);
    assert.deepEqual(labels('glassy nothing'), []);
  });

  test('case and accents are ignored', () => {
    assert.deepEqual(labels('CARD Córners'), ['Card corners']);
    assert.deepEqual(labels('fullend'), ['Hintergrundbild']);
  });

  test('a label starting with the query comes first, then labels, sections, other text', () => {
    assert.deepEqual(labels('glassy'), ['Glassy effect', 'Toast style']);
    assert.deepEqual(labels('style'), ['Toast style', 'Glassy effect', 'Card corners', 'Block opacity']);
    assert.deepEqual(labels('block'), ['Block opacity', 'Glassy effect', 'Card corners']);
  });

  test('the hint is the other text that matched, only when label and section do not cover the query', () => {
    const [effect, toast] = searchSettings(docs, 'glassy');
    assert.equal(effect.hint, null);
    assert.equal(toast.hint, 'Glassy');
    assert.equal(searchSettings(docs, 'login logo')[0].hint, null);
    assert.equal(searchSettings(docs, 'pop')[0].hint, 'The messages that pop up after saving');
  });
});

describe('expandTerms', () => {
  const keys = ['editor.boxes.styles.line', 'editor.boxes.styles.fill', 'editor.boxes.stylesTitle', 'editor.font'];

  test('a prefix ending in a dot stands for every key under it, a key for itself', () => {
    assert.deepEqual(expandTerms(['editor.boxes.styles.', 'editor.font'], keys), [
      'editor.boxes.styles.line',
      'editor.boxes.styles.fill',
      'editor.font',
    ]);
  });
});
