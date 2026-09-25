import { createContext, type ReactElement, useContext, useLayoutEffect, useSyncExternalStore } from 'react';
import { useGlobalStore } from '@/stores/global.ts';
import { useNebulaTheme } from '../../lib/apply.ts';

const AUTH_CLASS = 'nebula-auth';
/** A global route rendering core's login page, so signed in admins can preview it (auth routes redirect them). */
export const LOGIN_PREVIEW_PATH = '/mint/login-preview';

let mounted = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Rendered at the top of every auth page through `pages.auth.prependComponent`. While one is mounted
 * html carries `nebula-auth`, which scopes the login background in buildCss, and AuthLogo takes over.
 * A layout effect so both land before the first paint instead of flashing the normal look.
 */
export function AuthScope() {
  useLayoutEffect(() => {
    mounted++;
    document.documentElement.classList.add(AUTH_CLASS);
    for (const listener of listeners) listener();

    return () => {
      mounted--;
      if (!mounted) document.documentElement.classList.remove(AUTH_CLASS);
      for (const listener of listeners) listener();
    };
  }, []);

  return null;
}

/** True around the logo AuthLayout draws in its top bar; core's copy above the form gives way to it. */
export const HeaderLogo = createContext(false);

/** Wraps every AppIcon; swaps in the theme's login logo only while an auth page is mounted. */
export function AuthLogo({ fallback, className }: { fallback: ReactElement; className?: string }) {
  const onAuthPage = useSyncExternalStore(subscribe, () => mounted > 0);
  const { loginLogo, authLogoPosition } = useNebulaTheme();
  const inHeader = useContext(HeaderLogo);
  const appName = useGlobalStore((state) => state.settings.app.name);

  if (!onAuthPage) return fallback;
  if (authLogoPosition === 'header' && !inHeader) return null;
  if (!loginLogo) return fallback;

  return (
    <div className={`flex justify-center select-none ${className ?? ''}`}>
      <img src={loginLogo} alt={appName} className='block h-auto max-h-24 w-auto max-w-full object-contain' />
    </div>
  );
}
