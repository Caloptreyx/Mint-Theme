import { faDisplay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { clearLocalTheme, useLocalTheme } from '../../lib/apply.ts';
import { Button, Card, Text } from '../../lib/core.ts';
import { useExtTranslations } from '../../translations.ts';

/**
 * While 'Apply in this browser' is on, a small card in the bottom right corner says so and turns it off; on phones a
 * one line pill, so it covers little of the page. Below core's ActionBar (z-90) and toasts (z-999), above the bottom
 * bar (app.css); a card right inside a `.fixed` box stays solid.
 */
export default function LocalThemeNotice() {
  const { t } = useExtTranslations();
  const local = useLocalTheme();

  // the editor's preview frame paints drafts, the notice belongs to the real page
  if (!local || window.parent !== window) return null;

  return (
    <div
      data-nebula-local-notice
      role='status'
      className='fixed right-3 bottom-3 z-80 max-w-[calc(100vw-1.5rem)] print:hidden'
    >
      <Card
        p='xs'
        title={t('localTheme.notice', {})}
        className='flex! flex-row! items-center gap-3 shadow-lg max-sm:gap-2 max-sm:rounded-full! max-sm:py-1.5! max-sm:pl-3!'
      >
        <FontAwesomeIcon icon={faDisplay} className='text-(--mantine-color-dimmed) shrink-0' />
        <Text size='xs' className='max-sm:hidden'>
          {t('localTheme.notice', {})}
        </Text>
        <Text size='xs' fw={500} className='sm:hidden'>
          {t('localTheme.noticeShort', {})}
        </Text>
        <Button
          size='compact-xs'
          variant='light'
          className='shrink-0'
          aria-label={t('localTheme.stopDescription', {})}
          onClick={clearLocalTheme}
        >
          {t('localTheme.stop', {})}
        </Button>
      </Card>
    </div>
  );
}
