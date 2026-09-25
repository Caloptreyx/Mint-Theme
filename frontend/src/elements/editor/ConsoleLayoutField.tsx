import {
  type CollisionDetection,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { faGripVertical, faPlus, faRotateLeft, faTerminal, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type ComponentProps, type ReactNode, useState } from 'react';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Button from '@/elements/Button.tsx';
import { DndBoard, DndSortableList, SortableItem } from '@/elements/dnd/DragAndDrop.tsx';
import Menu from '@/elements/Menu.tsx';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import Tooltip from '@/elements/Tooltip.tsx';
import {
  CONSOLE_SLOTS,
  CONSOLE_WIDGETS,
  type ConsoleLayout,
  type ConsoleSlot,
  type ConsoleWidget,
  DEFAULT_CONSOLE_LAYOUT,
  type NebulaTheme,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

/** Slot droppables get a prefix so they never collide with a widget id. */
const SLOT_PREFIX = 'slot:';

const slotOf = (layout: ConsoleLayout, id: string): ConsoleSlot | undefined =>
  id.startsWith(SLOT_PREFIX)
    ? CONSOLE_SLOTS.find((slot) => `${SLOT_PREFIX}${slot}` === id)
    : CONSOLE_SLOTS.find((slot) => layout[slot].includes(id as ConsoleWidget));

/** Widgets under the pointer beat the slot around them; the keyboard has no pointer and falls back to distance. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const widgets = hits.filter((hit) => !String(hit.id).startsWith(SLOT_PREFIX));
  if (widgets.length > 0) return widgets;
  return hits.length > 0 ? hits : closestCenter(args);
};

function Chip({
  label,
  dragHandleProps,
  onRemove,
  removeLabel,
}: {
  label: string;
  dragHandleProps?: ComponentProps<'div'>;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className='flex items-center gap-1 min-w-0 rounded-sm border border-(--mantine-color-default-border) bg-(--mantine-color-default) pl-1.5 pr-0.5 py-0.5'>
      <div {...dragHandleProps} className='flex items-center gap-1.5 flex-1 min-w-0 py-0.5'>
        <FontAwesomeIcon icon={faGripVertical} className='shrink-0 text-(--mantine-color-dimmed)' />
        <span className='text-xs leading-tight wrap-break-word min-w-0'>{label}</span>
      </div>
      {onRemove && (
        <Tooltip label={removeLabel}>
          <ActionIcon variant='subtle' color='gray' size='xs' aria-label={removeLabel} onClick={onRemove}>
            <FontAwesomeIcon icon={faXmark} />
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  );
}

function SlotBox({ slot, children }: { slot: ConsoleSlot; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${SLOT_PREFIX}${slot}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-1.5 min-w-0 rounded-md border border-dashed p-1.5 transition-colors motion-reduce:transition-none ${
        isOver
          ? 'border-(--mantine-color-blue-filled) bg-(--mantine-color-blue-light)'
          : 'border-(--mantine-color-default-border)'
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Console section: a schematic of the console page. The terminal is fixed in the middle; widgets are chips in
 * the four slots around it, dragged within and between slots, removed with their cross and added from a menu of
 * the ones not on the page yet.
 */
export default function ConsoleLayoutField({ theme, set }: Props) {
  const { t } = useExtTranslations();
  // while dragging, chips move between slots here; the theme only changes on drop
  const [dragging, setDragging] = useState<ConsoleLayout | null>(null);
  const layout = dragging ?? theme.consoleLayout;

  const widgetLabel = (id: ConsoleWidget) => t(`editor.consoleLayout.widget.${id}`, {});
  const unused = CONSOLE_WIDGETS.filter((id) => !CONSOLE_SLOTS.some((slot) => layout[slot].includes(id)));
  const isDefault = JSON.stringify(theme.consoleLayout) === JSON.stringify(DEFAULT_CONSOLE_LAYOUT);

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!dragging || !over) return;
    const id = String(active.id) as ConsoleWidget;
    const from = slotOf(dragging, id);
    const to = slotOf(dragging, String(over.id));
    if (!from || !to || from === to) return;

    // entering another slot: insert at the hovered chip, or at the end when hovering the slot itself
    const target = dragging[to].filter((widget) => widget !== id);
    const at = target.indexOf(String(over.id) as ConsoleWidget);
    target.splice(at === -1 ? target.length : at, 0, id);
    setDragging({ ...dragging, [from]: dragging[from].filter((widget) => widget !== id), [to]: target });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = dragging;
    setDragging(null);
    if (!current || !over) return;

    const id = String(active.id) as ConsoleWidget;
    const slot = slotOf(current, id);
    if (!slot) return;
    const oldIndex = current[slot].indexOf(id);
    const newIndex = current[slot].indexOf(String(over.id) as ConsoleWidget);
    if (newIndex !== -1 && newIndex !== oldIndex) {
      set({ consoleLayout: { ...current, [slot]: arrayMove(current[slot], oldIndex, newIndex) } });
    } else if (current !== theme.consoleLayout) {
      set({ consoleLayout: current });
    }
  };

  const addMenu = (slot: ConsoleSlot, compact: boolean) => {
    const label = t('editor.consoleLayout.addTo', { slot: t(`editor.consoleLayout.slot.${slot}`, {}) });

    return (
      <Menu position='bottom'>
        <Menu.Target>
          {compact ? (
            <ActionIcon variant='subtle' color='gray' aria-label={label} title={label} className='self-center'>
              <FontAwesomeIcon icon={faPlus} />
            </ActionIcon>
          ) : (
            <Button
              variant='subtle'
              color='gray'
              size='compact-xs'
              className='self-start'
              aria-label={label}
              leftSection={<FontAwesomeIcon icon={faPlus} />}
            >
              {t('editor.consoleLayout.add', {})}
            </Button>
          )}
        </Menu.Target>
        <Menu.Dropdown maw={280}>
          {unused.length === 0 ? (
            <Menu.Item disabled>{t('editor.consoleLayout.allPlaced', {})}</Menu.Item>
          ) : (
            unused.map((id) => (
              <Menu.Item key={id} onClick={() => set({ consoleLayout: { ...layout, [slot]: [...layout[slot], id] } })}>
                <span className='block text-sm'>{widgetLabel(id)}</span>
                <span className='block text-xs text-(--mantine-color-dimmed)'>
                  {t(`editor.consoleLayout.widgetDescription.${id}`, {})}
                </span>
              </Menu.Item>
            ))
          )}
        </Menu.Dropdown>
      </Menu>
    );
  };

  const slotBox = (slot: ConsoleSlot) => {
    const side = slot === 'left' || slot === 'right';

    return (
      <SlotBox slot={slot}>
        <Text size='xs' c='dimmed' className={`leading-tight ${side ? 'text-center' : ''}`}>
          {t(`editor.consoleLayout.slot.${slot}`, {})}
        </Text>
        <DndSortableList id={slot} items={layout[slot]}>
          {layout[slot].map((id) => (
            <SortableItem
              key={id}
              id={id}
              renderItem={({ dragHandleProps }) => (
                <Chip
                  label={widgetLabel(id)}
                  dragHandleProps={dragHandleProps}
                  onRemove={() =>
                    set({ consoleLayout: { ...layout, [slot]: layout[slot].filter((widget) => widget !== id) } })
                  }
                  removeLabel={t('editor.consoleLayout.remove', { name: widgetLabel(id) })}
                />
              )}
            />
          ))}
        </DndSortableList>
        {addMenu(slot, side)}
      </SlotBox>
    );
  };

  return (
    <Stack gap='sm'>
      <div>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t('editor.consoleLayout.title', {})}
        </Text>
        <Text size='xs' c='dimmed' mt={4}>
          {t('editor.consoleLayout.description', {})}
        </Text>
      </div>

      <DndBoard
        collisionDetection={collision}
        describeItem={(item) => {
          const id = String(item.id);
          const slot = id.startsWith(SLOT_PREFIX) ? slotOf(layout, id) : undefined;
          return slot
            ? t(`editor.consoleLayout.slot.${slot}`, {})
            : CONSOLE_WIDGETS.includes(id as ConsoleWidget)
              ? widgetLabel(id as ConsoleWidget)
              : id;
        }}
        renderOverlay={(active) =>
          active && CONSOLE_WIDGETS.includes(String(active.id) as ConsoleWidget) ? (
            <Chip label={widgetLabel(String(active.id) as ConsoleWidget)} />
          ) : null
        }
        onDragStart={() => setDragging(theme.consoleLayout)}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className='flex flex-col gap-2'>
          {slotBox('top')}
          <div className='grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] gap-2'>
            {slotBox('left')}
            <div className='flex flex-col items-center justify-center gap-1.5 min-h-28 rounded-md border border-(--mantine-color-blue-filled) bg-(--mantine-color-blue-light) text-(--mantine-color-blue-light-color)'>
              <FontAwesomeIcon icon={faTerminal} size='lg' />
              <span className='text-[10px] font-semibold uppercase tracking-wider'>
                {t('editor.consoleLayout.terminal', {})}
              </span>
            </div>
            {slotBox('right')}
          </div>
          {slotBox('bottom')}
        </div>
      </DndBoard>

      <Button
        variant='subtle'
        color='gray'
        size='compact-xs'
        className='self-start'
        disabled={isDefault}
        leftSection={<FontAwesomeIcon icon={faRotateLeft} />}
        onClick={() => set({ consoleLayout: DEFAULT_CONSOLE_LAYOUT })}
      >
        {t('editor.consoleLayout.reset', {})}
      </Button>
    </Stack>
  );
}
