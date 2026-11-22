// The slim rail's server tile: a server name becomes at most two letters, as a CSS string for `content`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { railInitials } from '../frontend/src/lib/initials.ts';

test('two words give their first letters, one word its first two', () => {
  assert.equal(railInitials('My Craft'), '"MC"');
  assert.equal(railInitials('Survival'), '"SU"');
  assert.equal(railInitials('  lobby-01 test'), '"L0"');
});

test('punctuation and emoji are skipped, letters outside ASCII kept whole', () => {
  assert.equal(railInitials('§ Grüne "Welt"'), '"GW"');
  assert.equal(railInitials('Ärger'), '"ÄR"');
  assert.equal(railInitials('🔥 "\\" 🔥'), '""');
});
