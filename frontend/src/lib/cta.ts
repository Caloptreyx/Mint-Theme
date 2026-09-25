import { SAFE_URL } from './theme.ts';

// Call to action buttons on announcements. The backend (`backend/src/cta.rs`) applies the same rules; they are
// checked again here because the map is rendered as links for every signed in user.

export const CTA_MAX_TITLE = 60;
export const CTA_MAX_URL = 500;

export interface AnnouncementCta {
  title: string;
  url: string;
}

/** Announcement uuid to its button. */
export type CtaMap = Record<string, AnnouncementCta>;

export type CtaProblem = 'titleEmpty' | 'titleLong' | 'titleInvalid' | 'urlInvalid' | 'urlLong';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL = /\p{Cc}/u;

/** Same limits as the backend: 1 to 60 characters once trimmed, no control characters. */
export function ctaTitleProblem(title: string): CtaProblem | null {
  const trimmed = title.trim();
  if (!trimmed) return 'titleEmpty';
  if ([...trimmed].length > CTA_MAX_TITLE) return 'titleLong';
  return CONTROL.test(trimmed) ? 'titleInvalid' : null;
}

/** http(s) or root relative (`/x`, never `//host`), with none of the characters `SAFE_URL` refuses. */
export function ctaUrlProblem(url: string): CtaProblem | null {
  const trimmed = url.trim();
  if (trimmed.length > CTA_MAX_URL) return 'urlLong';
  return SAFE_URL.test(trimmed) && !CONTROL.test(trimmed) ? null : 'urlInvalid';
}

/** Keeps only entries the backend could have stored; anything else is dropped. */
export function normalizeCtas(raw: unknown): CtaMap {
  const out: CtaMap = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

  for (const [uuid, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!UUID.test(uuid) || !value || typeof value !== 'object') continue;
    const { title, url } = value as Record<string, unknown>;
    if (typeof title !== 'string' || typeof url !== 'string') continue;
    if (ctaTitleProblem(title) || ctaUrlProblem(url)) continue;
    out[uuid.toLowerCase()] = { title: title.trim(), url: url.trim() };
  }

  return out;
}

export interface AnnouncementLike {
  uuid: string;
  type: string;
  title: string;
  titleTranslations: Record<string, string>;
  content: string;
  contentTranslations: Record<string, string>;
}

/** What an alert shows: its title, its markdown source and its colour. */
export interface RenderedAlert {
  title: string;
  content: string;
  color: string | undefined;
}

/**
 * The uuid of the announcement an alert renders, found the way core's `DismissibleAnnouncementAlert` builds it
 * (title and content in the current language, colour from the type). Null when nothing matches or when two
 * different announcements would render the same alert: a button on the wrong one is worse than none.
 */
export function matchAnnouncement(
  announcements: readonly AnnouncementLike[],
  alert: RenderedAlert,
  language: string,
  colorOf: (type: string) => string | undefined,
): string | null {
  let found: string | null = null;

  for (const announcement of announcements) {
    if (colorOf(announcement.type) !== alert.color) continue;
    if ((announcement.titleTranslations[language] ?? announcement.title) !== alert.title) continue;
    if ((announcement.contentTranslations[language] ?? announcement.content) !== alert.content) continue;
    if (found !== null && found !== announcement.uuid) return null;
    found = announcement.uuid;
  }

  return found;
}
