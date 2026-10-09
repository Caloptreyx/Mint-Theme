import { useExtTranslations } from '../../translations.ts';

const WIDTH_KEY = 'nebula:editor-width';
const MIN_WIDTH = 320;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 400;
const KEY_STEP = 16;

function clampWidth(width: number): number {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));
}

function storeWidth(width: number) {
  try {
    localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    // the width just resets on the next load
  }
}

/** The settings panel's width this browser last left it at, else the default. */
export function storedPanelWidth(): number {
  try {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return stored ? clampWidth(stored) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

/**
 * The handle between the settings panel and the preview: drag it, use the arrow keys (Home and End for the limits)
 * or double click it for the default width. The width is kept per browser. `onDragging` lets the editor turn off
 * the preview frame's pointer events, which would otherwise swallow the drag.
 */
export default function PanelResizer({
  width,
  onWidth,
  onDragging,
}: {
  width: number;
  onWidth: (width: number) => void;
  onDragging: (dragging: boolean) => void;
}) {
  const { t } = useExtTranslations();

  const commit = (next: number) => {
    const clamped = clampWidth(next);
    onWidth(clamped);
    storeWidth(clamped);
  };

  return (
    <div
      role='separator'
      aria-orientation='vertical'
      aria-label={t('editor.resizePanel', {})}
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      className='relative z-10 -ml-1 w-2 shrink-0 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-[3px] after:w-0.5 after:transition-colors hover:after:bg-(--mantine-primary-color-filled) focus-visible:after:bg-(--mantine-primary-color-filled)'
      onDoubleClick={() => commit(DEFAULT_WIDTH)}
      onKeyDown={(e) => {
        const next =
          e.key === 'ArrowLeft'
            ? width - KEY_STEP
            : e.key === 'ArrowRight'
              ? width + KEY_STEP
              : e.key === 'Home'
                ? MIN_WIDTH
                : e.key === 'End'
                  ? MAX_WIDTH
                  : null;
        if (next === null) return;
        e.preventDefault();
        commit(next);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const handle = e.currentTarget;
        const startX = e.clientX;
        const startWidth = width;
        handle.setPointerCapture(e.pointerId);
        onDragging(true);

        const move = (event: PointerEvent) => onWidth(clampWidth(startWidth + event.clientX - startX));
        const end = (event: PointerEvent) => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', end);
          handle.removeEventListener('pointercancel', end);
          onDragging(false);
          commit(startWidth + event.clientX - startX);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
      }}
    />
  );
}
