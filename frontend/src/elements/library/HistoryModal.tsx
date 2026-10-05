import { useEffect, useState } from 'react';
import { getThemeHistory } from '../../api/library.ts';
import {
  Button,
  Card,
  formatDateTime,
  Group,
  httpErrorToHuman,
  Modal,
  Spinner,
  Stack,
  Text,
  useToast,
} from '../../lib/core.ts';
import type { ThemeHistory } from '../../lib/library.ts';
import type { NebulaTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import Swatches from './Swatches.tsx';

// backend/src/history.rs keeps this many
const MAX_ENTRIES = 10;

/** The themes earlier saves replaced, newest first; loading one only sets the editor's draft. */
export default function HistoryModal({
  opened,
  onClose,
  onLoad,
}: {
  opened: boolean;
  onClose: () => void;
  onLoad: (theme: NebulaTheme) => void;
}) {
  const { t } = useExtTranslations();
  const { addToast } = useToast();
  const [history, setHistory] = useState<ThemeHistory | null>(null);

  // fetched on every open, a save in between adds an entry
  useEffect(() => {
    if (!opened) return;
    setHistory(null);
    getThemeHistory()
      .then(setHistory)
      .catch((err) => {
        addToast(httpErrorToHuman(err), 'error');
        onClose();
      });
  }, [opened]);

  return (
    <Modal opened={opened} onClose={onClose} title={t('library.historyTitle', {})} size='lg'>
      <Stack gap='xs'>
        <Text size='sm' c='dimmed'>
          {t('library.historyDescription', { max: MAX_ENTRIES })}
        </Text>
        {history?.current && (
          <Text size='sm'>
            {t('library.historyCurrent', { time: formatDateTime(history.current.at), user: history.current.user })}
          </Text>
        )}
        {!history ? (
          <Spinner.Centered />
        ) : history.entries.length === 0 ? (
          <Text size='sm' c='dimmed'>
            {t('library.historyEmpty', {})}
          </Text>
        ) : (
          history.entries.map((entry, i) => (
            <Card key={i} p='sm'>
              <Group justify='space-between' gap='sm'>
                <div className='min-w-0'>
                  <Text size='sm' fw={600} truncate>
                    {entry.at !== null && entry.user !== null
                      ? t('library.historyBy', { time: formatDateTime(entry.at), user: entry.user })
                      : t('library.historyUnknown', {})}
                  </Text>
                </div>
                <Group gap='sm' wrap='nowrap'>
                  <Swatches theme={entry.theme} />
                  <Button
                    size='xs'
                    variant='light'
                    onClick={() => {
                      onLoad(entry.theme);
                      addToast(t('library.loaded', {}), 'success');
                      onClose();
                    }}
                  >
                    {t('library.load', {})}
                  </Button>
                </Group>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </Modal>
  );
}
