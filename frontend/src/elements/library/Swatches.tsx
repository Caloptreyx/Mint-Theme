import type { NebulaTheme } from '../../lib/theme.ts';

/** Mini layered theme preview chip (page, card surface, accent bar and highlight dot) that stays legible on dark cards. */
export default function Swatches({ theme }: { theme: Partial<NebulaTheme> }) {
  const { background, surface, accent, highlight, text } = theme;
  if (!background && !surface && !accent && !highlight) return null;

  return (
    <span
      aria-hidden='true'
      className='inline-flex h-7 w-13 shrink-0 items-center rounded-md p-1 ring-1 ring-inset ring-white/20 outline-1 outline-black/25'
      style={{ background: background ?? surface ?? 'var(--mantine-color-body)' }}
    >
      <span
        className='flex h-full flex-1 flex-col justify-between rounded-[3px] p-1 ring-1 ring-inset ring-white/15'
        style={{ background: surface ?? background ?? 'var(--nebula-card)' }}
      >
        <span className='flex items-center gap-0.5'>
          <span
            className='h-1.5 flex-1 rounded-full'
            style={{ background: accent ?? 'var(--mantine-primary-color-filled)' }}
          />
          {highlight && <span className='size-1.5 shrink-0 rounded-full' style={{ background: highlight }} />}
        </span>
        <span
          className='h-1 w-2/3 rounded-full opacity-55'
          style={{ background: text ?? highlight ?? accent ?? 'currentColor' }}
        />
      </span>
    </span>
  );
}
