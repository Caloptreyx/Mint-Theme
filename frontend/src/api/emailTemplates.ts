import { axiosInstance } from '../lib/core.ts';
import { type EmailTemplatesStatus, parseEmailTemplatesStatus } from '../lib/email.ts';

const BASE = '/api/admin/extensions/dev.caloptreyx.mint/email-templates';

/** Whether Mint's email templates are on, and where each core template's saved content comes from. */
export const getEmailTemplates = (): Promise<EmailTemplatesStatus> =>
  axiosInstance.get(BASE).then(({ data }) => parseEmailTemplatesStatus(data));

/**
 * Turns Mint's email templates on (stock templates and older Mint layouts get Mint's) or off (Mint's layouts go
 * back to the panel's stock). Hand-saved HTML is kept, unless `overwrite` replaces it with Mint's layout too.
 */
export const setEmailTemplates = (enabled: boolean, overwrite = false): Promise<EmailTemplatesStatus> =>
  axiosInstance.put(BASE, { enabled, overwrite }).then(({ data }) => parseEmailTemplatesStatus(data));
