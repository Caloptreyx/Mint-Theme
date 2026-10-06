import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faGripVertical, faLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type ComponentProps, type ReactNode, useSyncExternalStore } from 'react';
import { Card, DndContainer, Group, restrictToVerticalAxis, SortableItem, Stack, Text } from '../../lib/core.ts';
import type { NavOrder } from '../../lib/navOrder.ts';
import { useExtTranslations } from '../../translations.ts';
import { findLink, isNavDivider, type NavEntry, navNodeId } from './nav.ts';

type ArrangeLink = { id: string; name: string; icon?: IconDefinition };
/** What the arranger lists: the menu's links and sections, without rules or links the user cannot open. */
export type ArrangeItem =
  | ({ kind: 'link' } & ArrangeLink)
  | { kind: 'section'; id: string; label: string; links: ArrangeLink[] };

/**
 * The arranger's rows for grouped menu entries. `visible` (ids) leaves out links the user cannot open, which core
 * still puts in the menu inside a permission wrapper that renders nothing; null keeps every link. A section left
 * with no link is left out, and an id met twice (one page linked twice) is listed once.
 */
export function toArrangeItems(entries: NavEntry[], visible: ReadonlySet<string> | null): ArrangeItem[] {
  const seen = new Set<string>();
  const linkOf = (node: ReactNode): ArrangeLink | null => {
    const link = findLink(node);
    const id = navNodeId(node);
    if (!link || !id || seen.has(id) || (visible && !visible.has(id))) return null;
    seen.add(id);
    return { id, name: link.name ?? link.title ?? link.to, icon: link.icon };
  };

  return entries.flatMap((entry): ArrangeItem[] => {
    if (entry.kind === 'node') {
      const link = linkOf(entry.node);
      return link ? [{ kind: 'link', ...link }] : [];
    }
    const links = entry.items.map(linkOf).filter((link) => link !== null);
    return links.length > 0 ? [{ kind: 'section', id: entry.id, label: entry.label, links }] : [];
  });
}

/** The order the rows show, to merge into the saved one (`mergeNavOrder`). */
export function arrangedOrder(items: ArrangeItem[]): NavOrder {
  return {
    top: items.map((item) => item.id),
    sections: Object.fromEntries(
      items.flatMap((item) => (item.kind === 'section' ? [[item.id, item.links.map((link) => link.id)]] : [])),
    ),
  };
}

// The admin menu as core renders it, for the editor's site wide order: the editor is an admin page, so GroupedNav
// publishes the menu beside it. Only what the signed in admin may open is in it.
let adminMenu: ReactNode[] = [];
let adminMenuSignature = '';
const adminMenuListeners = new Set<() => void>();

export function publishAdminMenu(nodes: ReactNode[]) {
  const signature = nodes
    .map((node) => {
      const link = findLink(node);
      if (link) return `${link.to}\t${link.name ?? ''}`;
      return isNavDivider(node) ? `-\t${node.props.label ?? ''}` : '';
    })
    .join('\n');
  if (signature === adminMenuSignature) return;
  adminMenu = nodes;
  adminMenuSignature = signature;
  for (const listener of adminMenuListeners) listener();
}

export function useAdminMenu(): ReactNode[] {
  return useSyncExternalStore(
    (listener) => {
      adminMenuListeners.add(listener);
      return () => {
        adminMenuListeners.delete(listener);
      };
    },
    () => adminMenu,
  );
}

function LinkRow({ link, handle }: { link: ArrangeLink; handle: ComponentProps<'div'> }) {
  const { t } = useExtTranslations();

  return (
    <Card p='xs'>
      <Group gap='xs' wrap='nowrap'>
        <div
          {...handle}
          aria-label={t('arrangeMenu.move', { name: link.name })}
          className='text-(--mantine-color-dimmed)'
        >
          <FontAwesomeIcon icon={faGripVertical} />
        </div>
        <FontAwesomeIcon icon={link.icon ?? faLink} className='w-4 shrink-0 text-(--mantine-color-dimmed)' />
        <Text size='sm' truncate>
          {link.name}
        </Text>
      </Group>
    </Card>
  );
}

/** One section: its title row moves the whole section, its links move inside it. */
function SectionCard({
  section,
  handle,
  onLinks,
}: {
  section: Extract<ArrangeItem, { kind: 'section' }>;
  handle: ComponentProps<'div'>;
  onLinks: (links: ArrangeLink[]) => void;
}) {
  const { t } = useExtTranslations();

  return (
    <Card p='xs'>
      <Stack gap={6}>
        <Group gap='xs' wrap='nowrap'>
          <div
            {...handle}
            aria-label={t('arrangeMenu.moveSection', { name: section.label })}
            className='text-(--mantine-color-dimmed)'
          >
            <FontAwesomeIcon icon={faGripVertical} />
          </div>
          <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider' truncate>
            {section.label}
          </Text>
        </Group>
        <DndContainer
          id={`nebula-nav-${section.id}`}
          items={section.links}
          modifiers={[restrictToVerticalAxis]}
          getItemLabel={(link) => link.name}
          callbacks={{ onDragEnd: onLinks }}
        >
          {(links) => (
            <Stack gap={4} className='pl-4'>
              {links.map((link) => (
                <SortableItem
                  key={link.id}
                  id={link.id}
                  renderItem={({ dragHandleProps }) => <LinkRow link={link} handle={dragHandleProps} />}
                />
              ))}
            </Stack>
          )}
        </DndContainer>
      </Stack>
    </Card>
  );
}

/**
 * The menu as draggable rows, with core's drag and drop kit (keyboard included): links and whole sections move at
 * the top level, a section's links move inside it. Controlled; `onChange` gets the rows in their new order.
 */
export default function NavArranger({
  items,
  onChange,
}: {
  items: ArrangeItem[];
  onChange: (items: ArrangeItem[]) => void;
}) {
  return (
    <DndContainer
      id='nebula-nav-top'
      items={items}
      modifiers={[restrictToVerticalAxis]}
      getItemLabel={(item) => (item.kind === 'link' ? item.name : item.label)}
      callbacks={{ onDragEnd: onChange }}
    >
      {(rows) => (
        <Stack gap={6}>
          {rows.map((item) => (
            <SortableItem
              key={item.id}
              id={item.id}
              renderItem={({ dragHandleProps }) =>
                item.kind === 'link' ? (
                  <LinkRow link={item} handle={dragHandleProps} />
                ) : (
                  <SectionCard
                    section={item}
                    handle={dragHandleProps}
                    onLinks={(links) =>
                      onChange(items.map((entry) => (entry.id === item.id ? { ...item, links } : entry)))
                    }
                  />
                )
              }
            />
          ))}
        </Stack>
      )}
    </DndContainer>
  );
}
