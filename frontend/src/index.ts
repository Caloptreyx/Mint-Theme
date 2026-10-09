import { faHandPointer, faHouse, faPalette } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { MantineThemeOverride } from '@mantine/core';
import { createElement, lazy } from 'react';
import { Extension, type ExtensionContext, type HookableComponent } from 'shared';
import ProfileCard from './elements/account/ProfileCard.tsx';
import { withAnnouncementCta, withServerAnnouncements } from './elements/announcements/AnnouncementCta.tsx';
import AnnouncementCtaTab from './elements/announcements/AnnouncementCtaTab.tsx';
import { AuthLayout, withFormLinks } from './elements/auth/AuthLayout.tsx';
import { AuthLogo, AuthScope, LOGIN_PREVIEW_PATH } from './elements/auth/AuthScope.tsx';
import ConsoleRedirect, { withConsoleFallback } from './elements/console/ConsoleFallback.tsx';
import ConsoleRouteOrder from './elements/console/ConsoleRouteOrder.tsx';
import EditorKeys from './elements/files/EditorKeys.tsx';
import ThemeChoiceCard from './elements/library/ThemeChoiceCard.tsx';
import LocalThemeNotice from './elements/page/LocalThemeNotice.tsx';
import { hidePageTitle } from './elements/page/PageTitles.tsx';
import PageTransition from './elements/page/PageTransition.tsx';
import BottomNav from './elements/sidebar/BottomNav.tsx';
import GroupedNav from './elements/sidebar/GroupedNav.tsx';
import { withNavSearch } from './elements/sidebar/NavSearch.tsx';
import { RailLogo, RailTip } from './elements/sidebar/Rail.tsx';
import SidebarShell from './elements/sidebar/SidebarShell.tsx';
import { applyCachedTheme, currentTheme, listenForPreview, loadTheme, watchUserTheme } from './lib/apply.ts';
import {
  Alert,
  AppIcon,
  AuthWrapper,
  Notification,
  ServerContentContainer,
  type ServerContentContainerProps,
  Sidebar,
} from './lib/core.ts';
import { mountMobileEditor } from './lib/mobileEditor.ts';
import { THEME_UPDATE_PERMISSION } from './lib/permissions.ts';
import { attachTerminal, detachTerminal, initTerminal } from './lib/terminal.ts';
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
    // `mobileNav: 'bottomBar'`: below lg a bottom bar of menu links whose Menu button opens core's drawer; registered
    // after the shell so its first node stays core's floating menu button, which the bar clicks
    Sidebar.addRenderInterceptor((element, props) => createElement(BottomNav, { ...props, element }));
    // while core's ServerStateGuard blocks every page but the server root (an install, restore or transfer), the
    // Console link points to Home, which shows the live console then; before RailTip so it gets core's own element
    Sidebar.Link.addRenderInterceptor(withConsoleFallback);
    Sidebar.Link.addRenderInterceptor((element, props) => createElement(RailTip, { ...props, link: element }));
    AppIcon.addRenderInterceptor((element, props) =>
      createElement(RailLogo, { fallback: element, className: props.className }),
    );

    applyCachedTheme();
    void loadTheme();
    // a user's own pick among the presets an admin offers replaces the site look for them (lib/apply.ts)
    watchUserTheme();
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
    // users pick their own theme among the presets an admin offers, in a card of core's account grid
    ctx.extensionRegistry.pages.dashboard.account.accountContainers.appendComponent(ThemeChoiceCard);

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

    // xterm takes its font, cursor and line height from its options, not the CSS, so the theme hands them over
    ctx.extensionRegistry.pages.server.console.xterm
      .addInitHandler(initTerminal)
      .addAfterOpenHandler(attachTerminal)
      .addOnUnmountHandler(detachTerminal);

    // `mobileEditor`: every Monaco editor gets phone settings on a phone, and the file editor page a row of the
    // keys phone keyboards lack, above the on-screen keyboard
    ctx.extensionRegistry.elements.monacoEditor.addOnMountHandler(mountMobileEditor);
    ctx.extensionRegistry.pages.server.files.editorContainer.appendContentComponent(EditorKeys);

    // route changes animate the content column; the theme's CSS picks the animation, 'none' has no rule
    ctx.extensionRegistry.global.prependComponent(PageTransition);
    // 'Apply in this browser' (the editor) is on: a corner card says only this browser shows that theme, with Stop
    ctx.extensionRegistry.global.appendComponent(LocalThemeNotice);

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

    // Home becomes the server landing page, the console keeps its name, icon and permission at /console with Mint's
    // layout; the route is a copy, core's route objects are shared with the rest of the panel (server selector).
    // With `serverHome` off the console stays at `/` (still Mint's layout) and there is no Home. Core runs this once
    // per server router (and quick actions palette, egg configuration editor), so a change shows on their next mount.
    ctx.extensionRegistry.routes.addServerRouteInterceptor((routes) => {
      const home = currentTheme().serverHome;
      const console = routes.findIndex((route) => route.path === '/');
      if (console !== -1) {
        routes[console] = { ...routes[console], path: home ? '/console' : '/', element: ServerConsole };
      }
      if (!home) return;

      routes.unshift({
        name: () => getExtTranslations().t('home.title', {}),
        icon: faHouse,
        path: '/',
        element: ServerHome,
        exact: true,
        permission: null,
      });
    });

    // an egg configuration's route order saved without Mint lists the console as `/`, which is Home here
    ctx.extensionRegistry.pages.global.prependComponent(ConsoleRouteOrder);
    // while the guard blocks the console (see the Console link above), visits to it (bookmarks, other links) land on
    // Home; pages.server renders beside core's ServerStateGuard, not under it, so this runs while the guard blocks it
    ctx.extensionRegistry.pages.server.prependComponent(ConsoleRedirect);

    // the backend's `mint-theme` admin permission group (backend/src/permissions.rs) in core's role editor
    ctx.extensionRegistry.enterPermissionIcons((icons) =>
      icons.addAdminPermissionIcon('mint-theme', createElement(FontAwesomeIcon, { icon: faPalette })),
    );
    ctx.extensionRegistry.routes.addAdminRoute({
      name: () => getExtTranslations().t('nav.editor', {}),
      icon: faPalette,
      path: '/mint',
      category: 'system',
      // core shows it to roles holding either; saving needs settings.update or mint-theme.update (lib/permissions.ts)
      permission: ['settings.read', THEME_UPDATE_PERMISSION],
      element: ThemeEditor,
      exact: true,
    });
  }

  public initializeMantineTheme(): MantineThemeOverride {
    return { headings: { fontWeight: '600' } };
  }
}

export default new DevCaloptreyxMintExtension();
