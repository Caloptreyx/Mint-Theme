import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { currentTheme } from '../../lib/apply.ts';

// the content column of each router; the sidebar is its sibling, so it never moves
const ROOTS = '#server-root, #dashboard-root, #admin-root';
const ATTR = 'data-nebula-page-enter';

/**
 * Registered in core's global slot, just before its routes. On a route change it marks the element holding the
 * page with `ATTR`, and `buildCss` animates that element's children. Not the column itself: a transform there
 * would pin fixed pages (the theme editor) to the column instead of the window while it runs. The mark goes once
 * no page animation is left running, so content that arrives late (a lazy page) still finishes its own. The theme
 * is read at navigation time, so an option changed in the editor applies to the preview's next navigation.
 */
export default function PageTransition() {
  const marker = useRef<HTMLSpanElement>(null);
  const { pathname } = useLocation();
  const last = useRef(pathname);

  useEffect(() => {
    // the first page load and search or hash changes (a folder in Files) are not route changes
    if (last.current === pathname) return;
    last.current = pathname;
    if (currentTheme().pageTransition === 'none') return;

    let root: Element | null = null;
    for (let el = marker.current?.nextElementSibling; el && !root; el = el.nextElementSibling) {
      root = el.matches(ROOTS) ? el : el.querySelector(ROOTS);
    }
    // core's Container puts the notices and the page in its first div and the copyright in the second
    const content = root?.firstElementChild?.firstElementChild ?? root;
    if (!(content instanceof HTMLElement)) return;
    const page = content;

    // restarts the animation when routes change faster than it runs
    page.removeAttribute(ATTR);
    void page.offsetWidth;
    page.setAttribute(ATTR, '');

    const settle = () => {
      const running = page
        .getAnimations({ subtree: true })
        .some(
          (a) => a instanceof CSSAnimation && a.animationName.startsWith('nebula-page') && a.playState === 'running',
        );
      if (!running) page.removeAttribute(ATTR);
    };
    page.addEventListener('animationend', settle);
    page.addEventListener('animationcancel', settle);
    // reduced motion plays nothing, so nothing ends; this clears it anyway
    const timer = window.setTimeout(settle, 1000);

    return () => {
      window.clearTimeout(timer);
      page.removeEventListener('animationend', settle);
      page.removeEventListener('animationcancel', settle);
      page.removeAttribute(ATTR);
    };
  }, [pathname]);

  return <span ref={marker} hidden />;
}
