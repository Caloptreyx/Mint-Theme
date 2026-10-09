import {
  faBars,
  faChevronDown,
  faCubes,
  faDroplet,
  faFont,
  faHouse,
  faImage,
  faListOl,
  faRightToBracket,
  faServer,
  faSwatchbook,
  faTableColumns,
  faTerminal,
  faWandMagicSparkles,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Collapse } from '@mantine/core';
import { useState } from 'react';
import { useExtTranslations } from '../../translations.ts';
import type { Section } from './Sections.tsx';

type SectionGroup = 'look' | 'navigation' | 'pages' | 'interface';

/** The editor's sections in the order the menu lists them, under their group. */
const SECTION_GROUPS: { id: SectionGroup; sections: { id: Section; icon: IconDefinition }[] }[] = [
  {
    id: 'look',
    sections: [
      { id: 'presets', icon: faSwatchbook },
      { id: 'colours', icon: faDroplet },
      { id: 'style', icon: faFont },
      { id: 'background', icon: faImage },
    ],
  },
  {
    id: 'navigation',
    sections: [
      { id: 'sidebar', icon: faTableColumns },
      { id: 'menu', icon: faBars },
      { id: 'menuOrder', icon: faListOl },
    ],
  },
  {
    id: 'pages',
    sections: [
      { id: 'home', icon: faHouse },
      { id: 'console', icon: faTerminal },
      { id: 'servers', icon: faServer },
      { id: 'login', icon: faRightToBracket },
    ],
  },
  {
    id: 'interface',
    sections: [
      { id: 'interface', icon: faWandMagicSparkles },
      { id: 'components', icon: faCubes },
    ],
  },
];

export const SECTION_ICONS = Object.fromEntries(
  SECTION_GROUPS.flatMap(({ sections }) => sections.map(({ id, icon }) => [id, icon])),
) as Record<Section, IconDefinition>;

/**
 * The editor's section menu: each group's sections under a heading that folds them away. A folded group holding
 * the open section keeps its heading in the accent colour, so the open section is never lost.
 */
export default function EditorNav({
  section,
  onSection,
  search,
}: {
  section: Section;
  onSection: (id: Section) => void;
  search: React.ReactNode;
}) {
  const { t } = useExtTranslations();
  const [folded, setFolded] = useState<SectionGroup[]>([]);

  return (
    <nav
      aria-label={t('editor.sections', {})}
      className='flex w-60 shrink-0 flex-col bg-(--nebula-card) border-r border-(--mantine-color-default-border)'
    >
      <div className='p-3'>{search}</div>
      <div className='flex-1 min-h-0 overflow-y-auto px-2 pb-3'>
        {SECTION_GROUPS.map(({ id, sections }) => {
          const open = !folded.includes(id);
          const holdsSection = sections.some((entry) => entry.id === section);

          return (
            <div key={id} className='mb-2'>
              <button
                type='button'
                aria-expanded={open}
                onClick={() =>
                  setFolded((current) => (open ? [...current, id] : current.filter((entry) => entry !== id)))
                }
                className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider outline-none hover:bg-(--mantine-color-default-hover) focus-visible:ring-2 focus-visible:ring-(--mantine-primary-color-filled) ${
                  !open && holdsSection ? 'text-(--mantine-primary-color-light-color)' : 'text-(--mantine-color-dimmed)'
                }`}
              >
                {t(`editor.groups.${id}`, {})}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-[10px] transition-transform ${open ? '' : '-rotate-90'}`}
                />
              </button>
              <Collapse expanded={open}>
                <div className='flex flex-col gap-0.5 pt-0.5'>
                  {sections.map((entry) => {
                    const active = entry.id === section;

                    return (
                      <button
                        type='button'
                        key={entry.id}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => onSection(entry.id)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--mantine-primary-color-filled) ${
                          active
                            ? 'bg-(--mantine-primary-color-light) font-medium text-(--mantine-primary-color-light-color)'
                            : 'hover:bg-(--mantine-color-default-hover)'
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={entry.icon}
                          fixedWidth
                          className={active ? undefined : 'text-(--mantine-color-dimmed)'}
                        />
                        <span className='truncate'>{t(`editor.section.${entry.id}`, {})}</span>
                      </button>
                    );
                  })}
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
