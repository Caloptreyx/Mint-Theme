import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type ReactNode, useState } from 'react';
import UnstyledButton from '@/elements/UnstyledButton.tsx';
import { useNebulaTheme } from '../../lib/apply.ts';
import { flatten, groupNav } from './nav.ts';

const CLOSED_KEY = 'nebula:sidebar-closed';

function readClosed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * The slim rail has no room for a toggle, so there the section is a rule over all of its links. The same nodes
 * render in the drawer too, which keeps the toggle: `buildCss` shows the rule and every link inside the rail
 * only, app.css hides a closed section's links everywhere else.
 */
function Section({ label, rail, children }: { label: string; rail: boolean; children: ReactNode }) {
  const [closed, setClosed] = useState(() => readClosed());
  const open = !closed.includes(label);

  const toggle = () => {
    const next = open ? [...closed, label] : closed.filter((entry) => entry !== label);
    setClosed(next);
    try {
      localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
    } catch {
      // the sections just reopen on the next load
    }
  };

  return (
    <div className='nebula-sb-section' data-open={open || undefined}>
      {rail && <hr className='nebula-sb-rule' />}
      <UnstyledButton className='nebula-sb-toggle' onClick={toggle} aria-expanded={open}>
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

  if (!sidebarGroups) return <>{children}</>;

  return (
    <>
      {groupNav(flatten(children)).map((entry) =>
        entry.kind === 'node' ? (
          entry.node
        ) : (
          <Section key={`section-${entry.label}`} label={entry.label} rail={sidebarLayout === 'slim'}>
            {entry.items}
          </Section>
        ),
      )}
    </>
  );
}
