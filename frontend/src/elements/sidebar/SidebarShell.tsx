import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cloneElement, isValidElement, type ReactElement, type ReactNode, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import Card from '@/elements/Card.tsx';
import Sidebar from '@/elements/Sidebar.tsx';
import { useRelativePageStore } from '@/stores/relativePage.ts';
import { useNebulaTheme } from '../../lib/apply.ts';
import GroupedNav from './GroupedNav.tsx';
import { flatten, type SidebarProps, splitHeader } from './nav.ts';
import TopNav from './TopNav.tsx';

type Bar = 'header' | 'floating' | 'pill' | 'nav';

// `!` outranks Mantine's unlayered card styles; `lg` is the breakpoint core shows its desktop sidebar at
const BAR_CLASS: Record<Bar, string> = {
  header: 'top-0 flex-row! items-center gap-3 rounded-none! border-x-0! border-t-0! px-6! py-2!',
  floating: 'top-3 mx-6 mt-3 flex-row! items-center gap-3 px-3! py-2!',
  pill: 'top-3 mx-6 mt-3 flex-row! items-center gap-3 rounded-full! py-1.5! pr-2! pl-5!',
  nav: 'top-0 flex-col! gap-1.5 rounded-none! border-x-0! border-t-0! px-6! pt-2! pb-1.5!',
};

/**
 * A card across the top of the content column, desktop only. app.css puts it in the column's grid cell so it
 * sticks while the page scrolls, and pushes the column down by its height, measured into `--nebula-bar-h`.
 */
function ContentBar({ bar, children }: { bar: Bar; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const shell = el?.parentElement;
    if (!el || !shell) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const height = el.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
      shell.style.setProperty('--nebula-bar-h', `${height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => {
      observer.disconnect();
      shell.style.removeProperty('--nebula-bar-h');
    };
  }, [bar]);

  return (
    <Card
      ref={ref}
      data-nebula-bar={bar}
      className={`nebula-bar hidden! lg:flex! sticky! z-30 backdrop-blur-md ${BAR_CLASS[bar]}`}
    >
      {children}
    </Card>
  );
}

/** The pill layout's bar with the dock left in the sidebar: where you are, from the title core gives the page. */
function PageTitle() {
  const title = useRelativePageStore((state) => state.title);
  // core titles its pages "Page | Server name" or "Page | Panel name"
  const [page, ...context] = title.split(' | ');

  return (
    <div className='flex min-w-0 flex-1 items-center gap-2 text-sm'>
      {context.length > 0 && (
        <>
          <span className='truncate text-(--mantine-color-dimmed)'>{context.join(' | ')}</span>
          <FontAwesomeIcon icon={faChevronRight} className='shrink-0 text-[10px] text-(--mantine-color-dimmed)' />
        </>
      )}
      <span className='truncate font-medium'>{page}</span>
    </div>
  );
}

/**
 * Core's Sidebar through a render interceptor, so it sees the header, footer and menu after every props
 * interceptor (GroupedNav's sections, the menu style's search). The default layout with the dock in the sidebar
 * returns core's element untouched. Otherwise core still renders its drawer and desktop card from the same
 * props, and this adds a bar across the content for the desktop: the dock (header minus its links, which stay
 * in the menu), the pill layout's account, or the horizontal layout's whole menu. Nodes shown in the bar are the
 * same elements, so a copy stays mounted in the desktop card, hidden by `buildCss`; the drawer keeps them all.
 */
export default function SidebarShell({ element, ...sidebar }: SidebarProps & { element: ReactElement<SidebarProps> }) {
  const { sidebarLayout: layout, dockPosition, sidebarGroups } = useNebulaTheme();
  const { pathname } = useLocation();
  const horizontal = layout === 'horizontal';
  const moveDock = !horizontal && dockPosition !== 'sidebar';

  // the setup wizard's sidebar holds its steps, so it keeps core's layout (buildCss leaves it alone too)
  if (pathname.startsWith('/oobe') || !(horizontal || moveDock || layout === 'pill')) return element;

  const { dock, nav } = splitHeader(sidebar.header);
  const footer = flatten(sidebar.footer, 'footer/');

  if (horizontal) {
    // the bar draws its own dropdowns for the sections, so it takes the links from inside GroupedNav
    const menu =
      isValidElement<{ children?: ReactNode }>(sidebar.children) && sidebar.children.type === GroupedNav
        ? sidebar.children.props.children
        : sidebar.children;

    return (
      <>
        {element}
        <ContentBar bar='nav'>
          <div className='flex min-w-0 items-center gap-3'>
            <div className='nebula-dock'>{dock}</div>
            <div className='nebula-bar-end'>{footer}</div>
          </div>
          <TopNav items={[...nav, ...flatten(menu, 'menu/')]} groups={sidebarGroups} />
        </ContentBar>
      </>
    );
  }

  return (
    <>
      {moveDock
        ? cloneElement(element, {
            header: (
              <>
                <div className='nebula-dock-origin'>{dock}</div>
                {nav}
              </>
            ),
          })
        : element}
      <ContentBar bar={dockPosition === 'header' ? 'header' : layout === 'pill' ? 'pill' : 'floating'}>
        {moveDock ? <div className='nebula-dock'>{dock}</div> : <PageTitle />}
        {layout === 'pill' && (
          <div className='nebula-bar-end'>
            {footer.filter((node) => isValidElement(node) && node.type === Sidebar.Footer)}
          </div>
        )}
      </ContentBar>
    </>
  );
}
