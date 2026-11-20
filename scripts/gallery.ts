// Prints the built-in presets as the Cala-Extensions site's Mint theme gallery data (src/data/mint-themes.json):
// `node scripts/gallery.ts > ../Cala-Extensions/src/data/mint-themes.json` (Node 24 strips the types).
import { normalizeTheme } from '../frontend/src/lib/normalize.ts';
import { PRESETS } from '../frontend/src/lib/presets.ts';
import { encodeShareCode } from '../frontend/src/lib/shareCode.ts';

const gallery = await Promise.all(
  PRESETS.map(async (preset) => {
    // laid over the default, as a share code decodes: absent look fields are the default's
    const theme = normalizeTheme(preset.theme);
    return {
      name: preset.name,
      colors: {
        accent: theme.accent,
        highlight: theme.highlight,
        background: theme.background,
        surface: theme.surface,
        text: theme.text,
        ...(theme.lightBackground && { lightBackground: theme.lightBackground }),
        ...(theme.lightSurface && { lightSurface: theme.lightSurface }),
        ...(theme.lightText && { lightText: theme.lightText }),
      },
      code: await encodeShareCode(theme),
    };
  }),
);

console.log(JSON.stringify(gallery, null, 2));
