import { Tooltip, useComputedColorScheme } from '@mantine/core';
import {
  type CSSProperties,
  createElement,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useNebulaTheme } from '../../lib/apply.ts';
import { ServerStatusIndicator, useGlobalStore, useServerStore } from '../../lib/core.ts';
import { railInitials } from '../../lib/initials.ts';
import { type SidebarLinkProps, swapElements } from './nav.ts';

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

/**
 * Wraps core's server block (ServerStatusIndicator) while the slim rail shows it, that is with the dock left in the
 * sidebar: the rail has no room for the name, so `buildCss` turns the block into an initials tile with the state on
 * its corner over icon-only power buttons, and the tooltip names the server. The drawer shows the same element whole.
 */
function RailServer({ fallback }: { fallback: ReactNode }) {
  const { sidebarLayout, dockPosition } = useNebulaTheme();
  // core renders the sidebar before the server has loaded, with an empty server object
  const name = useServerStore((state) => state.server.name) ?? '';
  const rail = sidebarLayout === 'slim' && dockPosition === 'sidebar';
  const ref = useRef<HTMLDivElement>(null);
  const [inRail, setInRail] = useState(false);

  useLayoutEffect(() => {
    setInRail(rail && !!ref.current?.closest('#sidebar-desktop'));
  }, [rail]);

  if (!rail) return fallback;

  const style = { '--nebula-rail-initials': railInitials(name) } as CSSProperties;
  return (
    <Tooltip label={name} position='right' offset={14} disabled={!inRail} withinPortal>
      <div ref={ref} className='nebula-rail-server' style={style}>
        {fallback}
      </div>
    </Tooltip>
  );
}

/** Sidebar props interceptor: core's server block in the server router's header goes into RailServer. */
export function withRailServer<P extends { header?: ReactNode }>(props: P): P {
  const header = swapElements(props.header, (element) =>
    element.type === ServerStatusIndicator
      ? createElement(RailServer, { key: element.key ?? undefined, fallback: element })
      : undefined,
  );
  return { ...props, header };
}
