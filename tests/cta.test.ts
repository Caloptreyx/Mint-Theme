// Announcement call to action buttons: the map is rendered as links for every signed in user, so the client
// re-checks what the backend stored, and a button must never land on the wrong announcement.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  type AnnouncementLike,
  CTA_MAX_TITLE,
  CTA_MAX_URL,
  ctaTitleProblem,
  ctaUrlProblem,
  matchAnnouncement,
  normalizeCtas,
} from '../frontend/src/lib/cta.ts';

const UUID_A = '00000000-0000-4000-8000-00000000000a';
const UUID_B = '00000000-0000-4000-8000-00000000000b';

describe('ctaUrlProblem', () => {
  test('accepts http(s) and root relative links', () => {
    for (const url of ['https://example.com/store?a=1&b=2#top', 'http://example.com', '/account', ' /account ']) {
      assert.equal(ctaUrlProblem(url), null, url);
    }
  });

  test('refuses other origins, schemes and breakout characters', () => {
    for (const url of [
      '',
      '/',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'data:text/html,x',
      'example.com',
      '/a b',
      '/a"b',
      "/a'b",
      '/a<b',
      '/a(b',
      '/a;b',
      '/a{b',
      '/a\u0001b',
    ]) {
      assert.equal(ctaUrlProblem(url), 'urlInvalid', JSON.stringify(url));
    }
  });

  test('caps the length at the backend limit', () => {
    const longest = `/${'a'.repeat(CTA_MAX_URL - 1)}`;
    assert.equal(ctaUrlProblem(longest), null);
    assert.equal(ctaUrlProblem(`${longest}a`), 'urlLong');
  });
});

describe('ctaTitleProblem', () => {
  test('needs 1 to 60 characters once trimmed', () => {
    assert.equal(ctaTitleProblem('Visit the store'), null);
    assert.equal(ctaTitleProblem('   '), 'titleEmpty');
    assert.equal(ctaTitleProblem('é'.repeat(CTA_MAX_TITLE)), null);
    assert.equal(ctaTitleProblem('é'.repeat(CTA_MAX_TITLE + 1)), 'titleLong');
    // counted in code points like the backend, not UTF-16 units
    assert.equal(ctaTitleProblem('🚀'.repeat(CTA_MAX_TITLE)), null);
  });

  test('refuses control characters', () => {
    assert.equal(ctaTitleProblem('a\tb'), 'titleInvalid');
  });
});

describe('normalizeCtas', () => {
  test('drops anything the backend could not have stored', () => {
    assert.deepEqual(normalizeCtas(null), {});
    assert.deepEqual(normalizeCtas([]), {});
    assert.deepEqual(
      normalizeCtas({
        [UUID_A]: { title: ' Store ', url: '/store' },
        [UUID_B]: { title: 'Bad', url: 'javascript:alert(1)' },
        'not-a-uuid': { title: 'Store', url: '/store' },
        '00000000-0000-4000-8000-00000000000c': { title: '', url: '/store' },
        '00000000-0000-4000-8000-00000000000d': 'nope',
      }),
      { [UUID_A]: { title: 'Store', url: '/store' } },
    );
  });
});

describe('matchAnnouncement', () => {
  const colors: Record<string, string> = { info: 'blue', warning: 'yellow' };
  const colorOf = (type: string) => colors[type];
  const announcement = (uuid: string, over: Partial<AnnouncementLike> = {}): AnnouncementLike => ({
    uuid,
    type: 'info',
    title: 'Maintenance',
    titleTranslations: {},
    content: 'Tonight at **10pm**.',
    contentTranslations: {},
    ...over,
  });
  const alert = { title: 'Maintenance', content: 'Tonight at **10pm**.', color: 'blue' };

  test('finds the announcement by title, content and colour', () => {
    const list = [announcement(UUID_A), announcement(UUID_B, { title: 'Other' })];
    assert.equal(matchAnnouncement(list, alert, 'en', colorOf), UUID_A);
    assert.equal(matchAnnouncement(list, { ...alert, color: 'yellow' }, 'en', colorOf), null);
    assert.equal(matchAnnouncement(list, { ...alert, content: 'Tomorrow.' }, 'en', colorOf), null);
  });

  test('compares the text in the current language, falling back to the default', () => {
    const list = [announcement(UUID_A, { titleTranslations: { de: 'Wartung' }, contentTranslations: { de: 'Heute.' } })];
    assert.equal(matchAnnouncement(list, { ...alert, title: 'Wartung', content: 'Heute.' }, 'de', colorOf), UUID_A);
    assert.equal(matchAnnouncement(list, alert, 'de', colorOf), null);
    assert.equal(matchAnnouncement(list, alert, 'fr', colorOf), UUID_A);
  });

  test('skips announcements that render the same alert instead of guessing', () => {
    const list = [announcement(UUID_A), announcement(UUID_B)];
    assert.equal(matchAnnouncement(list, alert, 'en', colorOf), null);
  });

  test('the same announcement listed twice is still one match', () => {
    assert.equal(matchAnnouncement([announcement(UUID_A), announcement(UUID_A)], alert, 'en', colorOf), UUID_A);
  });
});
