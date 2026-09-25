import { faDiscord, faGithub } from '@fortawesome/free-brands-svg-icons';
import { faBook, faEnvelope, faHeartPulse, faLink, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createElement, Fragment, type ReactElement } from 'react';
import AppIcon from '@/elements/AppIcon.tsx';
import Card from '@/elements/Card.tsx';
import type { Props as AuthWrapperProps } from '@/pages/auth/AuthWrapper.tsx';
import { useNebulaTheme } from '../../lib/apply.ts';
import type { SupportLink, SupportLinkIcon } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import { HeaderLogo } from './AuthScope.tsx';

/** Also shown beside the icon picker in the editor. */
export const SUPPORT_ICONS: Record<SupportLinkIcon, IconDefinition> = {
  discord: faDiscord,
  github: faGithub,
  docs: faBook,
  status: faHeartPulse,
  mail: faEnvelope,
  link: faLink,
};

// core puts every auth form in a Card; these layouts lay it straight onto the page or into a card of their own
const FLAT_FORM =
  '[&_.mantine-Card-root]:overflow-visible! [&_.mantine-Card-root]:border-transparent! [&_.mantine-Card-root]:bg-transparent! [&_.mantine-Card-root]:p-0! [&_.mantine-Card-root]:shadow-none! [&_.mantine-Card-root]:[backdrop-filter:none]!';

const LINK_STYLES = {
  header:
    'rounded-(--mantine-radius-sm) px-2.5 py-1.5 text-sm hover:bg-(--mantine-color-default-hover) hover:text-(--mantine-color-text)',
  aboveForm:
    'rounded-full border border-(--mantine-color-default-border) bg-(--mantine-color-default) px-3 py-1 text-xs hover:bg-(--mantine-color-default-hover) hover:text-(--mantine-color-text)',
};

/** Links that leave the panel open in a new tab; root relative ones load in place. */
function SupportLinks({ links, variant }: { links: SupportLink[]; variant: 'header' | 'aboveForm' }) {
  const { t } = useExtTranslations();

  return (
    <nav
      aria-label={t('auth.supportLinks', {})}
      className={`flex flex-wrap items-center gap-1.5 ${variant === 'header' ? 'ms-auto justify-end' : 'mb-4 w-full justify-center'}`}
    >
      {links.map((link, index) => {
        const external = !link.url.startsWith('/');
        return (
          <a
            key={index}
            href={link.url}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            title={link.label}
            className={`inline-flex items-center gap-1.5 font-medium text-(--mantine-color-dimmed) transition-colors motion-reduce:transition-none ${LINK_STYLES[variant]}`}
          >
            {link.icon && <FontAwesomeIcon icon={SUPPORT_ICONS[link.icon]} />}
            {/* phones get just the icon in the top bar; the label stays for screen readers and in the tooltip */}
            <span className={link.icon && variant === 'header' ? 'max-sm:sr-only' : undefined}>{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

/** Support links placed above the form, first in the page's content. */
function FormLinks() {
  const { supportLinks, supportLinksPosition } = useNebulaTheme();
  if (supportLinksPosition !== 'aboveForm' || !supportLinks.length) return null;
  return <SupportLinks links={supportLinks} variant='aboveForm' />;
}

/** AuthWrapper props interceptor: renders nothing extra unless links are set to sit above the form. */
export function withFormLinks(props: AuthWrapperProps): AuthWrapperProps {
  return { ...props, children: createElement(Fragment, null, createElement(FormLinks), props.children) };
}

/** The top bar: the logo on the left when it moved there, support links on the right. */
function AuthHeader({ logo, links }: { logo: boolean; links: SupportLink[] }) {
  return (
    <header className='flex shrink-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-6'>
      {logo && (
        <HeaderLogo.Provider value>
          <AppIcon className='mt-0! h-10! w-auto! [&_img]:h-full! [&_img]:w-auto!' />
        </HeaderLogo.Provider>
      )}
      {links.length > 0 && <SupportLinks links={links} variant='header' />}
    </header>
  );
}

/** The login background, else the panel background, else an accent gradient. Decorative, and gone on phones. */
function AuthBanner({ className }: { className: string }) {
  const { loginBackground, backgroundImage } = useNebulaTheme();
  // both passed SAFE_URL in normalizeTheme, so neither can close the url("...")
  const image = loginBackground || backgroundImage;

  return (
    <div
      aria-hidden
      className={`bg-cover bg-center ${image ? '' : 'bg-linear-to-br from-(--mantine-color-blue-filled) to-(--nebula-highlight)'} ${className}`}
      style={image ? { backgroundImage: `url("${image}")` } : undefined}
    />
  );
}

/**
 * AuthWrapper render interceptor. Core's page is a scroller sized to the window below its top edge with the
 * form centred in it; the defaults return it untouched. Otherwise it goes into a column (the `[&>div]` rules
 * size that scroller to the column, so a top bar above it fits) beside or inside the banner.
 */
export function AuthLayout({ children }: { children: ReactElement }) {
  const { authLayout: layout, authLogoPosition, supportLinks, supportLinksPosition } = useNebulaTheme();
  const logoInHeader = authLogoPosition === 'header';
  const headerLinks = supportLinksPosition === 'header' ? supportLinks : [];
  const header = (logoInHeader || headerLinks.length > 0) && <AuthHeader logo={logoInHeader} links={headerLinks} />;

  if (layout === 'default' && !header) return children;

  const form = (
    <div className={`min-h-0 flex-1 [&>div]:h-full! ${layout === 'default' ? '' : FLAT_FORM}`}>{children}</div>
  );

  switch (layout) {
    case 'sideBanner':
    case 'floatingBanner':
      // the banner replaces the page image, so the form column sits on the plain page colour
      return (
        <div className='flex h-dvh bg-(--mantine-color-body)'>
          <div className='flex min-w-0 flex-1 flex-col lg:max-w-xl'>
            {header}
            {form}
          </div>
          {layout === 'sideBanner' ? (
            <AuthBanner className='hidden flex-1 lg:block' />
          ) : (
            <div className='hidden flex-1 p-3 lg:block'>
              <AuthBanner className='size-full rounded-(--mantine-radius-lg)' />
            </div>
          )}
        </div>
      );
    case 'panels':
      // the form sizes itself inside the card and this outer box scrolls instead of core's scroller
      return (
        <div className='flex h-dvh flex-col'>
          {header}
          <div className='flex min-h-0 flex-1 overflow-auto p-3 sm:p-6'>
            <Card p={0} className='m-auto w-full max-w-md lg:max-w-4xl'>
              <div className='flex lg:min-h-128'>
                <div
                  className={`flex min-w-0 flex-1 items-center px-3 py-8 sm:px-8 [&>div]:h-auto! [&>div]:w-full ${FLAT_FORM}`}
                >
                  {children}
                </div>
                <AuthBanner className='hidden w-1/2 shrink-0 lg:block' />
              </div>
            </Card>
          </div>
        </div>
      );
    default:
      return (
        <div className='flex h-dvh flex-col'>
          {header}
          {form}
        </div>
      );
  }
}
