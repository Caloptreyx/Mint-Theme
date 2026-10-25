import type { IconDefinition, IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import { useMemo } from 'react';
import { z } from 'zod';
import { useGlobalStore } from './core.ts';

// Panel 1.2.7 lets admins pick a menu link's icon (a route order entry's `icon`). Sidebar.Link then gets the icon's
// identifier as `customIcon` and looks it up in the icons the panel loads at boot (the global store's `icons`).
// Older panels have neither, so both are read defensively and the link's own `icon` stays the fallback.

const ICON = z.object({ width: z.number(), height: z.number(), path: z.string() });

const PREFIXES: Record<string, IconPrefix> = { solid: 'fas', regular: 'far', brands: 'fab' };

/** The `customIcon` identifier of a Sidebar.Link's props, on panels that have it. */
export function customIconOf(link: object): string | null {
  return 'customIcon' in link && typeof link.customIcon === 'string' && link.customIcon ? link.customIcon : null;
}

/** Core's `useCustomIcon`: the configured icon when the panel knows it, else `fallback`. */
export function useCustomIcon(identifier: string | null, fallback: IconDefinition | undefined) {
  const icons = useGlobalStore((state) => ('icons' in state ? state.icons : undefined));

  return useMemo(() => {
    if (!identifier || !icons || typeof icons !== 'object') return fallback;
    const icon = ICON.safeParse(Object.getOwnPropertyDescriptor(icons, identifier)?.value);
    if (!icon.success) return fallback;
    // identifiers look like `fa:solid:house`, the same split core makes
    const [, set = '', name = identifier] = identifier.split(':');
    const definition: IconDefinition = {
      prefix: PREFIXES[set] ?? 'fas',
      iconName: name as IconName,
      icon: [icon.data.width, icon.data.height, [], '', icon.data.path],
    };
    return definition;
  }, [identifier, icons, fallback]);
}
