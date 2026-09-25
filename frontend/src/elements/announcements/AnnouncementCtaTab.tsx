import { useEffect, useState } from 'react';
import type { z } from 'zod';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/Button.tsx';
import { AdminCan } from '@/elements/Can.tsx';
import AdminContentContainer from '@/elements/containers/AdminContentContainer.tsx';
import Group from '@/elements/Group.tsx';
import Switch from '@/elements/input/Switch.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import Stack from '@/elements/Stack.tsx';
import type { adminAnnouncementSchema } from '@/lib/schemas/admin/announcements.ts';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import updateAnnouncementCta from '../../api/updateAnnouncementCta.ts';
import { CTA_MAX_TITLE, CTA_MAX_URL, type CtaProblem, ctaTitleProblem, ctaUrlProblem } from '../../lib/cta.ts';
import { loadCtas, rememberCta } from '../../lib/ctaStore.ts';
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    // asks again, another admin may have changed it since this page loaded
    loadCtas(true)
      .then((ctas) => {
        const cta = ctas[announcement.uuid];
        setEnabled(!!cta);
        setTitle(cta?.title ?? '');
        setUrl(cta?.url ?? '');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setLoading(false));
  }, [announcement.uuid, addToast]);

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
        rememberCta(announcement.uuid, cta);
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
        <Switch
          label={tExt('announcementCta.enable', {})}
          description={tExt('announcementCta.enableDescription', {})}
          checked={enabled}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
          disabled={loading}
        />
        <TextInput
          label={tExt('announcementCta.buttonTitle', {})}
          description={tExt('announcementCta.buttonTitleDescription', { max: CTA_MAX_TITLE })}
          placeholder={tExt('announcementCta.buttonTitlePlaceholder', {})}
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          disabled={loading || !enabled}
          withAsterisk={enabled}
          error={title ? problemText(titleProblem) : null}
        />
        <TextInput
          label={tExt('announcementCta.buttonLink', {})}
          description={tExt('announcementCta.buttonLinkDescription', {})}
          placeholder={tExt('announcementCta.buttonLinkPlaceholder', {})}
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
          disabled={loading || !enabled}
          withAsterisk={enabled}
          error={url ? problemText(urlProblem) : null}
        />
        <Group>
          <AdminCan action='announcements.update' cantSave>
            <Button onClick={save} loading={saving} disabled={loading || !!titleProblem || !!urlProblem}>
              {t('common.button.save', {})}
            </Button>
          </AdminCan>
        </Group>
      </Stack>
    </AdminContentContainer>
  );
}
