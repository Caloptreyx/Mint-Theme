import { faHouse, faPalette } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { MantineThemeOverride } from '@mantine/core';
import { createElement } from 'react';
import { Extension, type ExtensionContext } from 'shared';
import Sidebar from '@/elements/Sidebar.tsx';
import EggLabel from './elements/EggLabel.tsx';
import ServerState from './elements/ServerState.tsx';
import GroupedNav from './elements/sidebar/GroupedNav.tsx';
import { applyCachedTheme, listenForPreview, loadTheme } from './lib/apply.ts';
import ServerHome from './pages/ServerHome.tsx';
import ServerList from './pages/ServerList.tsx';
import ThemeEditor from './pages/ThemeEditor.tsx';
import { getExtTranslations } from './translations.ts';

class DevS4wayNebulaExtension extends Extension {
  public cardIcon = createElement(FontAwesomeIcon, { icon: faPalette });
  public cardConfigurationPage: React.FC | null = ThemeEditor;
  public cardComponent: React.FC | null = null;

  public initialize(ctx: ExtensionContext): void {
    // the server menu is split into collapsible groups; GroupedNav leaves other sidebars alone
    Sidebar.addPropsInterceptor((props) => ({
      ...props,
      children: createElement(GroupedNav, { children: props.children }),
    }));

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

    ctx.extensionRegistry.pages.server.console.powerButtonComponents.prependComponent(ServerState);
    ctx.extensionRegistry.pages.server.console.container.prependContentComponent(EggLabel);

    // Home becomes the server landing page, the console keeps its name, icon and permission at /console
    ctx.extensionRegistry.routes.addServerRouteInterceptor((routes) => {
      const console = routes.find((route) => route.path === '/');
      if (console) console.path = '/console';

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
      path: '/nebula',
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

export default new DevS4wayNebulaExtension();
