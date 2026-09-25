import { faHandPointer, faHouse, faPalette } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { MantineThemeOverride } from '@mantine/core';
import { createElement, lazy } from 'react';
import { Extension, type ExtensionContext, type HookableComponent } from 'shared';
import Alert from '@/elements/Alert.tsx';
import AppIcon from '@/elements/AppIcon.tsx';
import ServerContentContainer, {
  type Props as ServerContentContainerProps,
} from '@/elements/containers/ServerContentContainer.tsx';
import Notification from '@/elements/Notification.tsx';
import Sidebar from '@/elements/Sidebar.tsx';
import AuthWrapper from '@/pages/auth/AuthWrapper.tsx';
import ProfileCard from './elements/account/ProfileCard.tsx';
import { withAnnouncementCta, withServerAnnouncements } from './elements/announcements/AnnouncementCta.tsx';
import AnnouncementCtaTab from './elements/announcements/AnnouncementCtaTab.tsx';
import { AuthLayout, withFormLinks } from './elements/auth/AuthLayout.tsx';
import { AuthLogo, AuthScope, LOGIN_PREVIEW_PATH } from './elements/auth/AuthScope.tsx';
import { hidePageTitle } from './elements/page/PageTitles.tsx';
import PageTransition from './elements/page/PageTransition.tsx';
import GroupedNav from './elements/sidebar/GroupedNav.tsx';
import { withNavSearch } from './elements/sidebar/NavSearch.tsx';
import { RailLogo, RailTip } from './elements/sidebar/Rail.tsx';
import SidebarShell from './elements/sidebar/SidebarShell.tsx';
import { applyCachedTheme, listenForPreview, loadTheme } from './lib/apply.ts';
import { attachTerminalFont, detachTerminalFont, initTerminalFont } from './lib/terminal.ts';
import ServerConsole from './pages/ServerConsole.tsx';
import ServerHome from './pages/ServerHome.tsx';
import ServerList from './pages/ServerList.tsx';
import ThemeEditor from './pages/ThemeEditor.tsx';
import { getExtTranslations } from './translations.ts';

// the preview route is the only place that loads it outside core's own lazy auth router
const Login = lazy(() => import('@/pages/auth/Login.tsx'));

class DevCaloptreyxMintExtension extends Extension {
  public cardIcon = createElement(FontAwesomeIcon, { icon: faPalette });
  public cardConfigurationPage: React.FC | null = ThemeEditor;
  public cardComponent: React.FC | null = null;

  public initialize(ctx: ExtensionContext): void {
    // the server menu is split into collapsible groups; GroupedNav leaves other sidebars alone
    Sidebar.addPropsInterceptor((props) => ({
      ...props,
      children: createElement(GroupedNav, { children: props.children }),
    }));
    // `searchComponent` swaps core's Quick actions button (and moves its server switcher) in place, in every sidebar
    Sidebar.addPropsInterceptor(withNavSearch);
    // `sidebarLayout` and `dockPosition`: the shell adds the bars across the content (a render interceptor, so it
    // sees the props above), the slim rail names its links in tooltips and shows the square app icon
    Sidebar.addRenderInterceptor((element, props) => createElement(SidebarShell, { ...props, element }));
    Sidebar.Link.addRenderInterceptor((element, props) => createElement(RailTip, { ...props, link: element }));
    AppIcon.addRenderInterceptor((element, props) =>
      createElement(RailLogo, { fallback: element, className: props.className }),
    );

    applyCachedTheme();
    void loadTheme();
    listenForPreview();

    // the servers list route is hardcoded in the core router, so the page is replaced through its own container registry
    ctx.extensionRegistry.pages.dashboard.home.enterContainerAll((container) =>
      container.addPropsInterceptor((props) => ({
        ...props,
        title: getExtTranslations().t('servers.title', {}),
        hideTitleComponent: true,
        children: createElement(ServerList),
      })),
    );

    // the profile card stands in for the account page's title
    ctx.extensionRegistry.pages.dashboard.account.container
      .addPropsInterceptor((props) => ({ ...props, hideTitleComponent: true }))
      .prependContentComponent(ProfileCard);

    // the login background and logo only apply while an auth page is mounted
    ctx.extensionRegistry.pages.auth.prependComponent(AuthScope);
    AppIcon.addRenderInterceptor((element, props) =>
      createElement(AuthLogo, { fallback: element, className: props.className }),
    );
    // every auth page renders through AuthWrapper: the theme's layout wraps it (the defaults leave it as is)
    // and support links placed above the form go first in its content
    AuthWrapper.addRenderInterceptor((element) => createElement(AuthLayout, { children: element }));
    AuthWrapper.addPropsInterceptor(withFormLinks);

    // auth routes redirect signed in users, so the editor previews the real login page here instead
    ctx.extensionRegistry.routes.addGlobalRoute({
      path: LOGIN_PREVIEW_PATH,
      element: () => createElement(Login),
    });

    // the console terminal paints on a canvas, so the theme's monospace font is handed to xterm directly
    ctx.extensionRegistry.pages.server.console.xterm
      .addInitHandler(initTerminalFont)
      .addAfterOpenHandler(attachTerminalFont)
      .addOnUnmountHandler(detachTerminalFont);

    // route changes animate the content column; the theme's CSS picks the animation, 'none' has no rule
    ctx.extensionRegistry.global.prependComponent(PageTransition);

    // the glassy toast style (lib/theme.ts) picks its icon from the toast's colour, exposed as `data-nebula-tone`
    Notification.addPropsInterceptor((props) =>
      props.color ? { ...props, mod: [{ 'nebula-tone': props.color }, props.mod ?? {}] } : props,
    );

    // `pageTitles` off hides the title row of core's server pages; the export is typed as the bare component
    (ServerContentContainer as unknown as HookableComponent<ServerContentContainerProps>).addPropsInterceptor(
      hidePageTitle,
    );

    // announcements can carry a call to action button: core's Alert gets it appended when it renders one, and
    // ServerContentContainer hands the server scoped announcements (only in the server store) down to it
    Alert.addPropsInterceptor(withAnnouncementCta);
    (ServerContentContainer as unknown as HookableComponent<ServerContentContainerProps>).addRenderInterceptor(
      withServerAnnouncements,
    );
    ctx.extensionRegistry.pages.admin.announcements.view.subNavigation.addItemInterceptor((items, { announcement }) => {
      items.push({
        name: () => getExtTranslations().t('announcementCta.tab', {}),
        icon: faHandPointer,
        path: '/cta',
        element: createElement(AnnouncementCtaTab, { announcement }),
      });
    });

    // Home becomes the server landing page, the console keeps its name, icon and permission at /console with Nebula's layout
    ctx.extensionRegistry.routes.addServerRouteInterceptor((routes) => {
      const console = routes.find((route) => route.path === '/');
      if (console) {
        console.path = '/console';
        console.element = ServerConsole;
      }

      routes.unshift({
        name: () => getExtTranslations().t('home.title', {}),
        icon: faHouse,
        path: '/',
        element: ServerHome,
        exact: true,
        permission: null,
      });
    });

    ctx.extensionRegistry.routes.addAdminRoute({
      name: () => getExtTranslations().t('nav.editor', {}),
      icon: faPalette,
      path: '/mint',
      category: 'system',
      permission: 'settings.read',
      element: ThemeEditor,
      exact: true,
    });
  }

  public initializeMantineTheme(): MantineThemeOverride {
    return { headings: { fontWeight: '600' } };
  }
}

export default new DevCaloptreyxMintExtension();
