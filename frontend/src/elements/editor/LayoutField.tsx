import { faEye, faEyeSlash, faGripVertical, faLeftRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Card from '@/elements/Card.tsx';
import { DndContainer, SortableItem } from '@/elements/dnd/DragAndDrop.tsx';
import Group from '@/elements/Group.tsx';
import Switch from '@/elements/input/Switch.tsx';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import Tooltip from '@/elements/Tooltip.tsx';
import { restrictToVerticalAxis } from '@/lib/dragAndDrop.ts';
import type { HomeCard, HomeColumn, NebulaTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

export default function LayoutField({ theme, set }: Props) {
  const { t } = useExtTranslations();

  const inColumn = (side: HomeColumn) => theme.layout.filter((card) => card.column === side);

  /** Writes one column back in its new order, keeping the other column untouched. */
  const replaceColumn = (side: HomeColumn, cards: HomeCard[]) => {
    const others = theme.layout.filter((card) => card.column !== side);
    set({ layout: side === 'left' ? [...cards, ...others] : [...others, ...cards] });
  };

  const patch = (id: HomeCard['id'], changes: Partial<HomeCard>) =>
    set({ layout: theme.layout.map((card) => (card.id === id ? { ...card, ...changes } : card)) });

  const columnList = (side: HomeColumn) => {
    const cards = inColumn(side);

    return (
      <Stack gap={6}>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t(`editor.column.${side}`, {})}
        </Text>

        {cards.length === 0 ? (
          <Text size='xs' c='dimmed'>
            {t('editor.columnEmpty', {})}
          </Text>
        ) : (
          <DndContainer
            id={side}
            items={cards.map((card) => ({ id: card.id }))}
            modifiers={[restrictToVerticalAxis]}
            callbacks={{
              onDragEnd: (items) =>
                replaceColumn(
                  side,
                  items.map(({ id }) => cards.find((card) => card.id === id)).filter((card) => !!card),
                ),
            }}
          >
            {(items) => (
              <Stack gap={6}>
                {items.map(({ id }) => {
                  const card = cards.find((entry) => entry.id === id);
                  if (!card) return null;

                  return (
                    <SortableItem
                      key={card.id}
                      id={card.id}
                      renderItem={({ dragHandleProps }) => (
                        <Card p='xs'>
                          <Group gap='xs' wrap='nowrap'>
                            <div {...dragHandleProps} className='text-(--mantine-color-dimmed)'>
                              <FontAwesomeIcon icon={faGripVertical} />
                            </div>
                            <Text size='sm' className='flex-1' c={card.enabled ? undefined : 'dimmed'} truncate>
                              {t(`editor.card.${card.id}`, {})}
                            </Text>
                            <Tooltip label={t('editor.moveColumn', {})}>
                              <ActionIcon
                                variant='subtle'
                                color='gray'
                                aria-label={t('editor.moveColumn', {})}
                                onClick={() => patch(card.id, { column: side === 'left' ? 'right' : 'left' })}
                              >
                                <FontAwesomeIcon icon={faLeftRight} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t(card.enabled ? 'editor.hideCard' : 'editor.showCard', {})}>
                              <ActionIcon
                                variant='subtle'
                                color='gray'
                                aria-label={t(card.enabled ? 'editor.hideCard' : 'editor.showCard', {})}
                                onClick={() => patch(card.id, { enabled: !card.enabled })}
                              >
                                <FontAwesomeIcon icon={card.enabled ? faEye : faEyeSlash} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Card>
                      )}
                    />
                  );
                })}
              </Stack>
            )}
          </DndContainer>
        )}
      </Stack>
    );
  };

  return (
    <Stack>
      <Switch
        label={t('editor.sidebarGroups', {})}
        description={t('editor.sidebarGroupsDescription', {})}
        checked={theme.sidebarGroups}
        onChange={(e) => set({ sidebarGroups: e.currentTarget.checked })}
      />
      <Text size='xs' c='dimmed'>
        {t('editor.layoutDescription', {})}
      </Text>
      {columnList('left')}
      {columnList('right')}
    </Stack>
  );
}
