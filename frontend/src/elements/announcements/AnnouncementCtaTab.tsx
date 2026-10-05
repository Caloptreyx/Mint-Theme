import { useEffect, useState } from 'react';
import type { z } from 'zod';
import updateAnnouncementCta from '../../api/updateAnnouncementCta.ts';
import {
  AdminCan,
  AdminContentContainer,
  type adminAnnouncementSchema,
  Button,
  Group,
  httpErrorToHuman,
  Stack,
  Switch,
  Text,
  TextInput,
  useToast,
  useTranslations,
} from '../../lib/core.ts';
import { CTA_MAX_TITLE, CTA_MAX_URL, type CtaProblem, ctaTitleProblem, ctaUrlProblem } from '../../lib/cta.ts';
import { loadAdminCta, refreshCtas } from '../../lib/ctaStore.ts';
import { useExtTranslations } from '../../translations.ts';

/** The "Call to Action" tab on an announcement's admin page. */
export default function AnnouncementCtaTab({
  announcement,
}: {
  announcement: z.infer<typeof adminAnnouncementSchema>;
}) {
  const { t } = useTranslations();
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  // without the stored button the form would save over it unseen (an empty form removes it), so it stays locked
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);
    // asks again, another admin may have changed it since this page loaded; the admin route has every button, also
    // those of announcements that are disabled, scheduled or scoped
    loadAdminCta(announcement.uuid)
      .then((cta) => {
        setEnabled(!!cta);
        setTitle(cta?.title ?? '');
        setUrl(cta?.url ?? '');
      })
      .catch((err) => {
        setLoadFailed(true);
        addToast(httpErrorToHuman(err), 'error');
      })
      .finally(() => setLoading(false));
  }, [announcement.uuid, addToast, attempt]);
  const locked = loading || loadFailed;

  const problemText = (problem: CtaProblem | null) => {
    switch (problem) {
      case 'titleEmpty':
        return tExt('announcementCta.titleRequired', {});
      case 'titleLong':
        return tExt('announcementCta.titleTooLong', { max: CTA_MAX_TITLE });
      case 'titleInvalid':
        return tExt('announcementCta.titleInvalid', {});
      case 'urlInvalid':
        return tExt('announcementCta.linkInvalid', {});
      case 'urlLong':
        return tExt('announcementCta.linkTooLong', { max: CTA_MAX_URL });
      default:
        return null;
    }
  };

  // an empty field is flagged by its asterisk and the disabled save, not by an error before anything was typed
  const titleProblem = enabled ? ctaTitleProblem(title) : null;
  const urlProblem = enabled ? ctaUrlProblem(url) : null;

  const save = () => {
    setSaving(true);
    updateAnnouncementCta(announcement.uuid, enabled ? { title, url } : null)
      .then((cta) => {
        refreshCtas();
        if (cta) {
          setTitle(cta.title);
          setUrl(cta.url);
        }
        addToast(cta ? tExt('announcementCta.saved', {}) : tExt('announcementCta.removed', {}), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setSaving(false));
  };

  return (
    <AdminContentContainer
      title={tExt('announcementCta.title', {})}
      subtitle={tExt('announcementCta.description', {})}
      titleOrder={2}
      fullscreen
    >
      <Stack>
        {loadFailed && (
          <Group>
            <Text size='sm' c='red'>
              {tExt('announcementCta.loadFailed', {})}
            </Text>
            <Button variant='default' size='xs' onClick={() => setAttempt((count) => count + 1)}>
              {tExt('announcementCta.retry', {})}
            </Button>
          </Group>
        )}
        <Switch
          label={tExt('announcementCta.enable', {})}
          description={tExt('announcementCta.enableDescription', {})}
          checked={enabled}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
          disabled={locked}
        />
        <TextInput
          label={tExt('announcementCta.buttonTitle', {})}
          description={tExt('announcementCta.buttonTitleDescription', { max: CTA_MAX_TITLE })}
          placeholder={tExt('announcementCta.buttonTitlePlaceholder', {})}
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          disabled={locked || !enabled}
          withAsterisk={enabled}
          error={title ? problemText(titleProblem) : null}
        />
        <TextInput
          label={tExt('announcementCta.buttonLink', {})}
          description={tExt('announcementCta.buttonLinkDescription', {})}
          placeholder={tExt('announcementCta.buttonLinkPlaceholder', {})}
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
          disabled={locked || !enabled}
          withAsterisk={enabled}
          error={url ? problemText(urlProblem) : null}
        />
        <Group>
          <AdminCan action='announcements.update' cantSave>
            <Button onClick={save} loading={saving} disabled={locked || !!titleProblem || !!urlProblem}>
              {t('common.button.save', {})}
            </Button>
          </AdminCan>
        </Group>
      </Stack>
    </AdminContentContainer>
  );
}
