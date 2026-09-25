import { axiosInstance } from '@/api/axios.ts';
import type { AnnouncementCta } from '../lib/cta.ts';

/** Sets or, with null, removes one announcement's button; resolves to what was stored (trimmed). */
export default async (announcement: string, cta: AnnouncementCta | null): Promise<AnnouncementCta | null> => {
  const { data } = await axiosInstance.put<{ cta: AnnouncementCta | null }>(
    '/api/admin/extensions/dev.caloptreyx.mint/announcement-ctas',
    { announcement, cta },
  );
  return data.cta;
};
