import { Tooltip, useComputedColorScheme } from '@mantine/core';
import { type ReactElement, useLayoutEffect, useRef, useState } from 'react';
import { useGlobalStore } from '@/stores/global.ts';
import { useNebulaTheme } from '../../lib/apply.ts';
import type { SidebarLinkProps } from './nav.ts';

/**
 * Wraps every Sidebar.Link (a render interceptor) so the slim rail can name its icon only links. The same link
 * also renders in the drawer, which shows the names, so the tooltip only turns on inside the desktop card.
 */
export function RailTip({ link, name }: SidebarLinkProps & { link: ReactElement }) {
  const { sidebarLayout } = useNebulaTheme();
  const rail = sidebarLayout === 'slim';
  const ref = useRef<HTMLDivElement>(null);
  const [inRail, setInRail] = useState(false);

  useLayoutEffect(() => {
    setInRail(rail && !!ref.current?.closest('#sidebar-desktop'));
  }, [rail]);

  if (!rail || !name) return link;

  return (
    <Tooltip label={name} position='right' offset={14} disabled={!inRail} withinPortal>
      <div ref={ref} className='nebula-rail-tip'>
        {link}
      </div>
    </Tooltip>
  );
}

/**
 * Wraps core's AppIcon (a render interceptor): the rail has no room for the name or a banner, so in the slim
 * layout the square icon comes along, and `buildCss` swaps it in inside the desktop card only.
 */
export function RailLogo({ fallback }: { fallback: ReactElement; className?: string }) {
  const { sidebarLayout } = useNebulaTheme();
  const app = useGlobalStore((state) => state.settings.app);
  const isLight = useComputedColorScheme('dark') === 'light';

  if (sidebarLayout !== 'slim') return fallback;

  return (
    <>
      {fallback}
      <img
        src={isLight ? (app.iconLight ?? app.icon) : app.icon}
        alt={app.name}
        className='nebula-rail-logo'
        draggable={false}
      />
    </>
  );
}
