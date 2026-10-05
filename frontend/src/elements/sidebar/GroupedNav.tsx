import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type ReactNode, useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';
import { useNebulaTheme } from '../../lib/apply.ts';
import { UnstyledButton } from '../../lib/core.ts';
import { flatten, groupNav, isNavActive } from './nav.ts';

const CLOSED_KEY = 'nebula:sidebar-closed';

function readClosed(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((entry) => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

// One list for every copy of the menu (the drawer and the desktop card both render it) and every tab.
let closedSections = readClosed();
const listeners = new Set<() => void>();

function publish(next: string[], persist: boolean) {
  closedSections = next;
  if (persist) {
    try {
      localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
    } catch {
      // the sections just reopen on the next load
    }
  }
  for (const listener of listeners) listener();
}

const onStorage = (event: StorageEvent) => {
  if (event.key === CLOSED_KEY) publish(readClosed(), false);
};

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

function toggleSection(label: string) {
  publish(
    closedSections.includes(label) ? closedSections.filter((entry) => entry !== label) : [...closedSections, label],
    true,
  );
}

function openSections(labels: string[]) {
  if (labels.some((label) => closedSections.includes(label))) {
    publish(
      closedSections.filter((entry) => !labels.includes(entry)),
      true,
    );
  }
}

/**
 * The slim rail has no room for a toggle, so there the section is a rule over all of its links. The same nodes
 * render in the drawer too, which keeps the toggle: `buildCss` shows the rule and every link inside the rail
 * only, app.css hides a closed section's links everywhere else.
 */
function Section({
  label,
  open,
  rail,
  children,
}: {
  label: string;
  open: boolean;
  rail: boolean;
  children: ReactNode;
}) {
  return (
    <div className='nebula-sb-section' data-open={open || undefined}>
      {rail && <hr className='nebula-sb-rule' />}
      <UnstyledButton className='nebula-sb-toggle' onClick={() => toggleSection(label)} aria-expanded={open}>
        <span className='truncate'>{label}</span>
        <FontAwesomeIcon icon={faChevronDown} className='nebula-sb-chevron' />
      </UnstyledButton>
      {(open || rail) && <div className='nebula-sb-items'>{children}</div>}
    </div>
  );
}

/** Turns the flat menu into collapsible sections at the panel's labelled dividers (see `groupNav`). */
export default function GroupedNav({ children }: { children: ReactNode }) {
  const { sidebarGroups, sidebarLayout } = useNebulaTheme();
  const { pathname } = useLocation();
  const closed = useSyncExternalStore(subscribe, () => closedSections);

  const entries = sidebarGroups ? groupNav(flatten(children)) : [];
  // a closed section would hide the current page's link, so arriving on one of its pages opens it
  const activeSections = entries
    .flatMap((entry) =>
      entry.kind === 'section' && entry.items.some((node) => isNavActive(node, pathname)) ? [entry.label] : [],
    )
    .join('\n');
  useEffect(() => {
    if (activeSections) openSections(activeSections.split('\n'));
  }, [pathname, activeSections]);

  if (!sidebarGroups) return <>{children}</>;

  return (
    <>
      {entries.map((entry) =>
        entry.kind === 'node' ? (
          entry.node
        ) : (
          <Section
            key={`section-${entry.label}`}
            label={entry.label}
            open={!closed.includes(entry.label)}
            rail={sidebarLayout === 'slim'}
          >
            {entry.items}
          </Section>
        ),
      )}
    </>
  );
}
