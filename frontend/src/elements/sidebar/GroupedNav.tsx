import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Children, Fragment, isValidElement, type ReactNode, useState } from 'react';
import Sidebar from '@/elements/Sidebar.tsx';
import UnstyledButton from '@/elements/UnstyledButton.tsx';
import { useNebulaTheme } from '../../lib/apply.ts';

const CLOSED_KEY = 'nebula:sidebar-closed';

function readClosed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** The router wraps the menu in fragments, which Children.toArray keeps as single nodes. */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flatten((child.props as { children?: ReactNode }).children)
      : [child],
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
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
      <UnstyledButton className='nebula-sb-toggle' onClick={toggle} aria-expanded={open}>
        <span className='truncate'>{label}</span>
        <FontAwesomeIcon icon={faChevronDown} className='nebula-sb-chevron' />
      </UnstyledButton>
      {open && <div className='nebula-sb-items'>{children}</div>}
    </div>
  );
}

/**
 * Turns the flat menu into collapsible sections, following the panel's own dividers:
 * a labelled divider opens a section that collects the links after it, an unlabelled
 * one closes it and stays a plain rule. Labels come from the egg's route order, so
 * operators name the sections in the panel itself.
 */
export default function GroupedNav({ children }: { children: ReactNode }) {
  const { sidebarGroups } = useNebulaTheme();

  if (!sidebarGroups) return <>{children}</>;

  const out: ReactNode[] = [];
  let section: { label: string; items: ReactNode[] } | null = null;

  const flush = () => {
    if (!section) return;
    out.push(
      <Section key={`section-${section.label}`} label={section.label}>
        {section.items}
      </Section>,
    );
    section = null;
  };

  for (const node of flatten(children)) {
    if (isValidElement(node) && node.type === Sidebar.Divider) {
      const label = (node.props as { label?: string }).label;
      flush();

      if (label) {
        section = { label, items: [] };
      } else {
        out.push(node);
      }
      continue;
    }

    if (section) {
      section.items.push(node);
    } else {
      out.push(node);
    }
  }
  flush();

  return <>{out}</>;
}
