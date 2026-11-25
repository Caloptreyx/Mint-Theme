import { type RefObject, useEffect, useRef } from 'react';

function isSelectKey(event: KeyboardEvent): boolean {
  return event.code === 'KeyS' || event.key.toLowerCase() === 's';
}

/**
 * Tracks whether the `S` key is currently held (outside editable inputs) for S+click server selection,
 * matching Calagopus core without importing `useSelectKeyHeld` (which does not exist on panel 1.2.0).
 */
export function useSelectKeyHeld(): RefObject<boolean> {
  const heldRef = useRef(false);

  useEffect(() => {
    const reset = () => {
      heldRef.current = false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSelectKey(event)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) {
        heldRef.current = false;
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        !target ||
        (target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          target.tagName !== 'SELECT' &&
          !target.isContentEditable)
      ) {
        heldRef.current = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isSelectKey(event)) reset();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') reset();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return heldRef;
}
