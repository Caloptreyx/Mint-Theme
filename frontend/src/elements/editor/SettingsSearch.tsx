import { faMagnifyingGlass, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon, Stack, Text, TextInput, UnstyledButton } from '../../lib/core.ts';
import { expandTerms, SETTINGS, type SearchHit, type Setting, searchSettings } from '../../lib/editorSearch.ts';
import translations, { useExtTranslations } from '../../translations.ts';
import type { Section } from './Sections.tsx';

interface SettingDoc {
  setting: Setting;
  label: string;
  section: string;
  also: string[];
}

export type SettingHit = SearchHit<SettingDoc>;

const ENGLISH: Record<string, string> = translations.mapping;
const TERMS = SETTINGS.map((setting) => expandTerms(setting.also ?? [], Object.keys(ENGLISH)));

/** The settings matching `query`, in the current language with the English text searchable too. */
export function useSettingSearch(query: string): SettingHit[] {
  const { t } = useExtTranslations();
  // prefixes expand to keys only known at runtime; `{max}` style placeholders are left out of the text
  const lookup = (key: string) =>
    (t as unknown as (key: string, values: object) => string)(key, {})
      .replace(/\s*\{\w+\}/g, '')
      .trim();

  const docs = SETTINGS.map(
    (setting, i): SettingDoc => ({
      setting,
      label: lookup(setting.label),
      section: t(`editor.section.${setting.section}`, {}),
      also: [...TERMS[i].map(lookup), ENGLISH[setting.label], ...TERMS[i].map((key) => ENGLISH[key])],
    }),
  );

  return searchSettings(docs, query);
}

export function SettingSearchInput({
  query,
  onQuery,
  onSubmit,
}: {
  query: string;
  onQuery: (query: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useExtTranslations();

  return (
    <TextInput
      mt='sm'
      aria-label={t('editor.search.placeholder', {})}
      placeholder={t('editor.search.placeholder', {})}
      leftSection={<FontAwesomeIcon icon={faMagnifyingGlass} />}
      rightSection={
        query && (
          <ActionIcon
            variant='subtle'
            color='gray'
            size='sm'
            aria-label={t('editor.search.clear', {})}
            onClick={() => onQuery('')}
          >
            <FontAwesomeIcon icon={faXmark} />
          </ActionIcon>
        )
      }
      value={query}
      onChange={(e) => onQuery(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onQuery('');
        if (e.key === 'Enter') onSubmit();
      }}
    />
  );
}

export function SettingResults({
  query,
  hits,
  icons,
  onPick,
}: {
  query: string;
  hits: SettingHit[];
  icons: Record<Section, IconDefinition>;
  onPick: (hit: SettingHit) => void;
}) {
  const { t } = useExtTranslations();

  if (hits.length === 0) {
    return (
      <Text size='sm' c='dimmed'>
        {t('editor.search.empty', { query: query.trim() })}
      </Text>
    );
  }

  return (
    <Stack gap={2}>
      {hits.map((hit) => (
        <UnstyledButton
          key={`${hit.doc.setting.section}:${hit.doc.setting.label}`}
          onClick={() => onPick(hit)}
          className='flex items-start gap-3 rounded-md px-2 py-1.5 text-left hover:bg-(--mantine-color-default-hover)'
        >
          <FontAwesomeIcon
            icon={icons[hit.doc.setting.section]}
            className='mt-1 w-4! shrink-0 text-(--mantine-color-dimmed)'
          />
          <div className='min-w-0'>
            <Text size='sm' fw={500}>
              {hit.doc.label}
            </Text>
            <Text size='xs' c='dimmed' lineClamp={2}>
              {hit.hint ? `${hit.doc.section} · ${hit.hint}` : hit.doc.section}
            </Text>
          </div>
        </UnstyledButton>
      ))}
    </Stack>
  );
}

/**
 * Scrolls `container` to the element showing exactly `text` and flashes it (`data-nebula-search-hit`, app.css).
 * Some sections render after a fetch, so it looks again for up to two seconds; `done` runs once it found the
 * label or gave up. Returns a cleanup that stops looking.
 */
export function revealLabel(container: HTMLElement, text: string, done: () => void): () => void {
  let tries = 0;
  let timer: number | undefined;

  const attempt = () => {
    // the innermost element with that text: a label or heading, not the card around it
    const target = Array.from(container.querySelectorAll<HTMLElement>('*')).find(
      (el) =>
        el.textContent?.trim() === text && !Array.from(el.children).some((child) => child.textContent?.trim() === text),
    );
    if (!target && ++tries < 20) {
      timer = window.setTimeout(attempt, 100);
      return;
    }

    if (target) {
      const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({
        top: container.scrollTop + offset - container.clientHeight / 3,
        behavior: reduce ? 'auto' : 'smooth',
      });
      target.setAttribute('data-nebula-search-hit', '');
      target.addEventListener('animationend', () => target.removeAttribute('data-nebula-search-hit'), { once: true });
      controlFor(container, target)?.focus({ preventScroll: true });
    } else {
      container.scrollTo({ top: 0 });
    }
    done();
  };

  attempt();
  return () => window.clearTimeout(timer);
}

const FOCUSABLE =
  'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), [tabindex="0"], a[href]';

/** The control a label belongs to: its `for` target, else the nearest focusable thing in its wrapper. */
function controlFor(container: HTMLElement, label: HTMLElement): HTMLElement | null {
  const owner = label.closest('label');
  if (owner?.control) return owner.control as HTMLElement;
  const id = owner?.htmlFor || label.getAttribute('for');
  if (id) {
    const byId = document.getElementById(id);
    if (byId) return byId;
  }
  // the label's own wrapper (a radio group, the slider's row) holds the control, so widen step by step
  for (let el = label.parentElement; el && el !== container; el = el.parentElement) {
    const found = el.querySelector<HTMLElement>(FOCUSABLE);
    if (found) return found;
  }
  return null;
}
