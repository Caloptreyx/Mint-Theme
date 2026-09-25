import type { ClickEffect } from '../../lib/theme.ts';

// Tiny previews for the Style section's ChoiceCards, drawn with the panel's live variables.

const TERMINAL_DOTS = ['bg-red-400', 'bg-yellow-400', 'bg-green-400'];

/** A terminal window over a gradient, blurred when `glass` is on. */
export function GlassMock({ glass }: { glass: boolean }) {
  return (
    <div className='relative size-full overflow-hidden rounded-sm bg-linear-to-br from-(--mantine-color-blue-filled) to-(--nebula-highlight)'>
      <span className='absolute -left-1 top-1 size-6 rounded-full bg-white/80' />
      <span className='absolute right-3 -bottom-3 size-8 rounded-full bg-(--mantine-color-blue-9)' />
      <div
        className={`absolute inset-x-4 inset-y-1.5 flex flex-col gap-1 rounded-sm border border-white/25 bg-black/30 p-1.5 ${
          glass ? 'backdrop-blur-sm' : ''
        }`}
      >
        <div className='flex gap-0.5'>
          {TERMINAL_DOTS.map((dot) => (
            <span key={dot} className={`size-1 rounded-full ${dot}`} />
          ))}
        </div>
        <span className='h-0.5 w-3/4 rounded-full bg-white/80' />
        <span className='h-0.5 w-1/2 rounded-full bg-(--nebula-highlight)' />
      </div>
    </div>
  );
}

/** A card with or without its hairline. */
export function BlockMock({ border }: { border: boolean }) {
  return (
    <div
      className={`flex size-full flex-col justify-center gap-1.5 rounded-(--mantine-radius-md) bg-(--nebula-card) px-3 ${
        border ? 'border border-(--mantine-color-default-border)' : ''
      }`}
    >
      <span className='h-1 w-1/2 rounded-full bg-(--mantine-color-text)' />
      <span className='h-1 w-3/4 rounded-full bg-(--mantine-color-dimmed)' />
    </div>
  );
}

/** Mantine's default input, or the filled one the theme uses once the border is off. */
export function InputMock({ border }: { border: boolean }) {
  return (
    <div
      className={`flex h-8 w-full items-center gap-1.5 rounded-(--mantine-radius-sm) px-2 ${
        border
          ? 'border border-(--mantine-color-default-border) bg-(--mantine-color-dark-6) light:bg-(--mantine-color-white)'
          : 'bg-(--mantine-color-dark-5) light:bg-(--mantine-color-gray-1)'
      }`}
    >
      <span className='h-3.5 w-px bg-(--mantine-color-text)' />
      <span className='h-1 w-12 rounded-full bg-(--mantine-color-placeholder)' />
    </div>
  );
}

// exaggerated so the difference reads at tile size; the dashed ghost marks where the button sat before the press
const PRESSED: Record<ClickEffect, string> = {
  none: '',
  drop: 'translate-y-1',
  shrink: 'scale-90',
  outline: 'outline-2 outline-offset-2 outline-(--mantine-color-blue-filled)',
};

/** A button caught mid press. */
export function ClickMock({ effect, label }: { effect: ClickEffect; label: string }) {
  return (
    <span className='relative inline-flex'>
      {(effect === 'drop' || effect === 'shrink') && (
        <span className='absolute inset-0 rounded-(--mantine-radius-sm) border border-dashed border-(--mantine-color-dimmed)' />
      )}
      <span
        className={`relative rounded-(--mantine-radius-sm) bg-(--mantine-color-blue-filled) px-3 py-1 text-xs font-medium text-(--mantine-primary-color-contrast) ${PRESSED[effect]}`}
      >
        {label}
      </span>
    </span>
  );
}
