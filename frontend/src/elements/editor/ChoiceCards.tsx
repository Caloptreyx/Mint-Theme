import Text from '@/elements/Text.tsx';
import UnstyledButton from '@/elements/UnstyledButton.tsx';

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
  return (
    <div role='radiogroup' aria-label={label}>
      <Text size='sm' fw={500}>
        {label}
      </Text>
      {description && (
        <Text size='xs' c='dimmed'>
          {description}
        </Text>
      )}
      <div className={`grid gap-2 mt-1.5 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <UnstyledButton
              key={choice.value}
              role='radio'
              aria-checked={selected}
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
