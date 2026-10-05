import { Text, UnstyledButton } from '../../lib/core.ts';

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** A small mock of the option, drawn with theme variables so it follows the draft. */
  preview: React.ReactNode;
}

interface Props<T extends string> {
  label: string;
  description?: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3;
}

/** A radio group of preview tiles: the selected tile gets the accent border. */
export default function ChoiceCards<T extends string>({
  label,
  description,
  value,
  choices,
  onChange,
  columns = 2,
}: Props<T>) {
  const current = choices.findIndex((choice) => choice.value === value);

  // WAI-ARIA radio group: one tab stop, arrows move the selection and the focus with it
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = choices.length - 1;
    const from = Math.max(0, current);
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? from >= last
          ? 0
          : from + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? from <= 0
            ? last
            : from - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null || !choices[next]) return;
    e.preventDefault();
    onChange(choices[next].value);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div role='radiogroup' aria-label={label} onKeyDown={onKeyDown}>
      <Text size='sm' fw={500}>
        {label}
      </Text>
      {description && (
        <Text size='xs' c='dimmed'>
          {description}
        </Text>
      )}
      <div className={`grid gap-2 mt-1.5 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {choices.map((choice, index) => {
          const selected = choice.value === value;
          return (
            <UnstyledButton
              key={choice.value}
              role='radio'
              aria-checked={selected}
              tabIndex={selected || (current < 0 && index === 0) ? 0 : -1}
              onClick={() => onChange(choice.value)}
              className='flex flex-col gap-1 text-left'
            >
              <div
                className={`h-16 overflow-hidden rounded-md border p-2 flex items-center justify-center bg-(--mantine-color-body) transition-colors ${
                  selected
                    ? 'border-(--mantine-color-blue-filled) ring-1 ring-(--mantine-color-blue-filled)'
                    : 'border-(--mantine-color-default-border) hover:border-(--mantine-color-dimmed)'
                }`}
              >
                {choice.preview}
              </div>
              <Text size='xs' fw={selected ? 600 : 400} c={selected ? undefined : 'dimmed'}>
                {choice.label}
              </Text>
            </UnstyledButton>
          );
        })}
      </div>
    </div>
  );
}
