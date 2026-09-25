import { axiosInstance } from '@/api/axios.ts';
import type { NebulaTheme } from '../lib/theme.ts';

export default async (theme: NebulaTheme): Promise<void> => {
  await axiosInstance.put('/api/admin/extensions/dev.caloptreyx.mint/theme', { theme });
};
