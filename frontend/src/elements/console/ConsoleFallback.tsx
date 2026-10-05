import { cloneElement, type ReactElement, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';
import {
  type fullUserSchema,
  isConflictingState,
  type serverSchema,
  serverStatusInfo,
  useAuth,
  useServerStore,
} from '../../lib/core.ts';
import type { SidebarLinkProps } from '../sidebar/nav.ts';

type Server = z.infer<typeof serverSchema>;
type User = z.infer<typeof fullUserSchema> | null;

/** `/server/<id>/console`, the console route Mint moved off the server root; group 1 is the server segment. */
const CONSOLE_PATH = /^\/server\/([^/]+)\/console\/?$/;

/**
 * While a server installs, restores a backup or transfers (core's `isConflictingState`, which also covers a
 * suspended server for non admins), core's ServerStateGuard lets only the server root and the console popout
 * through, and Home shows the live console there. Node maintenance and failed installs or restores block the root
 * too, so the console stays put then and core's block screen explains why.
 */
function consoleBlocked(server: Server, user: User): boolean {
  return (
    isConflictingState(server, user) &&
    !server.nodeMaintenanceEnabled &&
    !(server.status !== null && serverStatusInfo[server.status].failed)
  );
}

/** The server root for `path` when it is the console of the open server (by uuid or short id), else null. */
function rootOf(path: string, server: Server): string | null {
  const id = CONSOLE_PATH.exec(path)?.[1];
  return id && (id === server.uuid || id === server.uuidShort) ? `/server/${id}` : null;
}

function ConsoleLink({ link }: { link: ReactElement<SidebarLinkProps> }) {
  const server = useServerStore((s) => s.server);
  const { user } = useAuth();

  const root = consoleBlocked(server, user) ? rootOf(link.props.to, server) : null;
  // `end` keeps the root link from matching every server page; it lights up where Home shows the console
  return root ? cloneElement(link, { to: root, end: true }) : link;
}

/**
 * A `Sidebar.Link` render interceptor (core's link element, before Mint's wrappers): a link to a console route
 * points to the server root while the console is blocked. Only console links read the server store, so sidebars
 * outside the server router (no store provider) are never touched.
 */
export function withConsoleFallback(element: ReactElement<SidebarLinkProps>, props: SidebarLinkProps) {
  return CONSOLE_PATH.test(props.to) ? <ConsoleLink link={element} /> : element;
}

/**
 * Registered in `pages.server`, which core's ServerRouter renders beside its `<Routes>` (whose layout route is
 * ServerStateGuard), not under it, so this runs while the guard shows its block screen for `/console`. A visit to
 * the open server's console (bookmark, other links, a state change while on it) is replaced by the server root.
 */
export default function ConsoleRedirect() {
  const server = useServerStore((s) => s.server);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const root = consoleBlocked(server, user) ? rootOf(pathname, server) : null;

  useLayoutEffect(() => {
    if (root) navigate(root, { replace: true });
  }, [root, navigate]);

  return null;
}
