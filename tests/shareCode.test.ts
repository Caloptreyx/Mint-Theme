// Share codes carry a look between panels; whatever a code holds must go through normalizeTheme and only
// ever change look fields, never the receiving site's content or settings.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { normalizeTheme } from '../frontend/src/lib/normalize.ts';
import { PRESETS } from '../frontend/src/lib/presets.ts';
import {
  decodeShareCode,
  encodeShareCode,
  MAX_SHARE_INPUT,
  MAX_SHARE_JSON,
  SHARE_PREFIX,
} from '../frontend/src/lib/shareCode.ts';
import { DEFAULT_THEME, type NebulaTheme, pickUserTheme, USER_THEME_FIELDS } from '../frontend/src/lib/theme.ts';

/** A code built by hand from arbitrary JSON text, as a hostile sender would. */
async function craft(json: string): Promise<string> {
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = Buffer.from(await new Response(stream).arrayBuffer());
  return SHARE_PREFIX + bytes.toString('base64url');
}

const SOURCE: NebulaTheme = normalizeTheme({
  ...DEFAULT_THEME,
  accent: '#ff3366',
  background: '#0a0a12',
  text: '#fafafa',
  font: 'outfit',
  radius: 4,
  glass: true,
  buttonStyle: 'outline',
  serverListView: 'grid',
  serverCardStyle: 'banner',
  backgroundImage: 'https://example.com/bg.png',
  lightSurface: '#fdfcff',
  // not part of the look: must never travel
  homeBanner: 'https://example.com/banner.png',
  serverHome: false,
});

const DRAFT: NebulaTheme = normalizeTheme({
  ...DEFAULT_THEME,
  accent: '#123456',
  font: 'montserrat',
  radius: 12,
  glass: false,
  backgroundImage: 'https://draft.example/bg.png',
  homeBanner: 'https://draft.example/banner.png',
  serverHome: true,
});

const apply = (draft: NebulaTheme, look: Partial<NebulaTheme>) => normalizeTheme({ ...draft, ...look }, draft);

describe('share codes', () => {
  test('round trip over a different draft reproduces the look and keeps the rest of the draft', async () => {
    const code = await encodeShareCode(SOURCE);
    assert.match(code, /^mint1\.[A-Za-z0-9_-]+$/);
    const look = await decodeShareCode(code);
    assert.ok(look);
    const result = apply(DRAFT, look);
    assert.deepEqual(pickUserTheme(result), pickUserTheme(SOURCE));
    for (const key of Object.keys(DEFAULT_THEME) as (keyof NebulaTheme)[]) {
      if (!USER_THEME_FIELDS.includes(key)) assert.deepEqual(result[key], DRAFT[key], key);
    }
  });

  test('a look left at the default resets the draft to the default look', async () => {
    const look = await decodeShareCode(await encodeShareCode(DEFAULT_THEME));
    assert.ok(look);
    assert.deepEqual(pickUserTheme(apply(DRAFT, look)), pickUserTheme(DEFAULT_THEME));
  });

  test('only fields that differ from the default are encoded, so codes stay short', async () => {
    const plain = await encodeShareCode(DEFAULT_THEME);
    const bigger = await encodeShareCode(SOURCE);
    assert.ok(plain.length < 20, plain);
    assert.ok(bigger.length < 300, bigger);
  });

  test('every built-in preset round trips', async () => {
    for (const preset of PRESETS) {
      const theme = normalizeTheme(preset.theme);
      const look = await decodeShareCode(await encodeShareCode(theme));
      assert.ok(look, preset.name);
      assert.deepEqual(pickUserTheme(apply(DRAFT, look)), pickUserTheme(theme), preset.name);
    }
  });

  test('a code is found inside a full link and in text with whitespace', async () => {
    const code = await encodeShareCode(SOURCE);
    const expected = await decodeShareCode(code);
    assert.deepEqual(await decodeShareCode(`https://panel.example.com/admin/mint#mint-share=${code}`), expected);
    assert.deepEqual(await decodeShareCode(`\n   ${code}  \t\n`), expected);
    assert.deepEqual(await decodeShareCode(`Try my theme: ${code} !`), expected);
  });

  test('garbage, truncated, oversized and non-object input gives null', async () => {
    const code = await encodeShareCode(SOURCE);
    assert.equal(await decodeShareCode(''), null);
    assert.equal(await decodeShareCode('hello world'), null);
    assert.equal(await decodeShareCode('mint1.'), null);
    assert.equal(await decodeShareCode('mint1.!!!!'), null);
    assert.equal(await decodeShareCode('mint1.AAAAAAAAAAAA'), null);
    assert.equal(await decodeShareCode(code.slice(0, Math.floor(code.length / 2))), null);
    assert.equal(await decodeShareCode(code + ' '.repeat(MAX_SHARE_INPUT)), null);
    assert.equal(await decodeShareCode(await craft('[1,2,3]')), null);
    assert.equal(await decodeShareCode(await craft('"accent"')), null);
    assert.equal(await decodeShareCode(await craft('null')), null);
    assert.equal(await decodeShareCode(await craft('{"accent":')), null);
    // compresses to a tiny code but inflates past the cap
    const bomb = await craft(`{"accent":"${'a'.repeat(MAX_SHARE_JSON)}"}`);
    assert.ok(bomb.length < MAX_SHARE_INPUT, 'the bomb itself fits the input cap');
    assert.equal(await decodeShareCode(bomb), null);
  });

  test('non-look fields in a crafted code are dropped', async () => {
    const look = await decodeShareCode(
      await craft(
        JSON.stringify({
          accent: '#abcdef',
          homeBanner: 'https://evil.example/x.png',
          serverHome: false,
          supportLinks: [{ label: 'x', url: 'https://evil.example' }],
          adminNavOrder: { top: ['x'], sections: {} },
        }),
      ),
    );
    assert.ok(look);
    for (const key of Object.keys(look)) assert.ok(USER_THEME_FIELDS.includes(key as keyof NebulaTheme), key);
    const result = apply(DRAFT, look);
    assert.equal(result.accent, '#abcdef');
    assert.equal(result.homeBanner, DRAFT.homeBanner);
    assert.equal(result.serverHome, DRAFT.serverHome);
    assert.deepEqual(result.supportLinks, DRAFT.supportLinks);
    assert.deepEqual(result.adminNavOrder, DRAFT.adminNavOrder);
  });

  test('hostile values are refused by the normalize step', async () => {
    const look = await decodeShareCode(
      await craft(
        JSON.stringify({
          backgroundImage: 'https://x.example/a.png);}body{display:none',
          accent: 'red;}html{display:none}',
          radius: 1e9,
          font: '"; } *{',
        }),
      ),
    );
    assert.ok(look);
    const result = apply(DRAFT, look);
    assert.equal(result.backgroundImage, DRAFT.backgroundImage);
    assert.equal(result.accent, DRAFT.accent);
    assert.equal(result.font, DRAFT.font);
    assert.ok(result.radius <= 24);
  });
});
