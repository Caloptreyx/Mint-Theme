import type { AlertProps } from '@mantine/core';
import { createContext, isValidElement, type ReactElement, type ReactNode, useContext } from 'react';
import { Link } from 'react-router';
import type { z } from 'zod';
import Button from '@/elements/Button.tsx';
import { announcementTypeColorMapping } from '@/lib/enums.ts';
import type { announcementSchema } from '@/lib/schemas/announcements.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useGlobalStore } from '@/stores/global.ts';
import { useServerStore } from '@/stores/server.ts';
import { ctaUrlProblem, matchAnnouncement } from '../../lib/cta.ts';
import { useCtas } from '../../lib/ctaStore.ts';

type Announcement = z.infer<typeof announcementSchema>;

// the server store only exists below the server router, so its announcements are handed down through this instead
const ServerAnnouncements = createContext<Announcement[]>([]);

function ServerAnnouncementsScope({ children }: { children: ReactNode }) {
  const announcements = useServerStore((state) => state.serverAnnouncements);
  return <ServerAnnouncements.Provider value={announcements}>{children}</ServerAnnouncements.Provider>;
}

/** Render interceptor for ServerContentContainer, which draws the server scoped announcements. */
export function withServerAnnouncements<P>(element: ReactElement<P>): ReactElement<P> {
  return <ServerAnnouncementsScope>{element}</ServerAnnouncementsScope>;
}

interface Props {
  title: string;
  content: string;
  color: string | undefined;
}

function AnnouncementCtaButton({ title, content, color }: Props) {
  const { language } = useTranslations();
  const global = useGlobalStore((state) => state.announcements);
  const server = useContext(ServerAnnouncements);

  const uuid = matchAnnouncement(
    [...global, ...server],
    { title, content, color },
    language,
    (type) => announcementTypeColorMapping[type as Announcement['type']],
  );
  // only alerts that are announcements ever ask the backend
  const ctas = useCtas(uuid !== null);
  const cta = uuid === null ? undefined : ctas[uuid];
  if (!cta || ctaUrlProblem(cta.url)) return null;

  const button = (
    <Button size='xs' color={color}>
      {cta.title}
    </Button>
  );

  // SAFE_URL has ruled out `//host`, so a leading slash is a panel page
  return (
    <div className='mt-3'>
      {cta.url.startsWith('/') ? (
        <Link to={cta.url}>{button}</Link>
      ) : (
        <a href={cta.url} target='_blank' rel='noopener noreferrer'>
          {button}
        </a>
      )}
    </div>
  );
}

/**
 * Props interceptor for core's Alert. Announcements render as an Alert with a string title and a markdown body
 * (`content.md()`, whose child is the source text); those get the button appended, anything else passes through.
 */
export function withAnnouncementCta<P extends AlertProps>(props: P): P {
  const body = props.children;
  if (typeof props.title !== 'string' || !isValidElement<{ children?: unknown }>(body)) return props;
  if (typeof body.props.children !== 'string') return props;

  return {
    ...props,
    children: (
      <>
        {body}
        <AnnouncementCtaButton title={props.title} content={body.props.children} color={props.color} />
      </>
    ),
  };
}
