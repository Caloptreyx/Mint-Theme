import { ColorInput } from '@mantine/core';
import { Stack, Text } from '../../lib/core.ts';
import { toHexColor } from '../../lib/editorDraft.ts';
import { TERMINAL_PALETTES } from '../../lib/presets.ts';
import { CORE_TERMINAL_COLORS, type NebulaTheme, TERMINAL_COLOR_COUNT, TERMINAL_COLOR_NAMES } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';

const HEX = /^#[0-9a-f]{6}$/i;

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

/** A palette's 16 colours in two rows, normal over bright. */
function PaletteMock({ colors }: { colors: readonly string[] }) {
  return (
    <div className='grid w-full grid-cols-8 gap-0.5'>
      {colors.map((color, index) => (
        <span
          key={index}
          className='aspect-square rounded-[2px] border border-(--mantine-color-default-border)'
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

/**
 * Console section: the terminal's ANSI palette. A tile patches the draft and is selected while the draft has exactly
 * its colours (Core: none stored); the inputs show core's colours until one is edited, which stores all 16.
 */
export default function TerminalColorsField({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const custom = theme.terminalColors.length === TERMINAL_COLOR_COUNT;
  const shown = custom ? theme.terminalColors : CORE_TERMINAL_COLORS;
  const stored = JSON.stringify(custom ? theme.terminalColors : []);
  const setColor = (index: number, value: string) =>
    set({ terminalColors: shown.map((color, i) => (i === index ? value : color)) });

  return (
    <Stack gap='md'>
      <ChoiceCards
        label={t('editor.console.terminalPalette', {})}
        description={t('editor.console.terminalPaletteDescription', {})}
        value={TERMINAL_PALETTES.find((palette) => JSON.stringify(palette.colors) === stored)?.id ?? null}
        columns={3}
        choices={TERMINAL_PALETTES.map((palette) => ({
          value: palette.id,
          label: palette.colors.length ? palette.name : t('editor.console.terminalPaletteCore', {}),
          preview: <PaletteMock colors={palette.colors.length ? palette.colors : CORE_TERMINAL_COLORS} />,
        }))}
        onChange={(id) => {
          const palette = TERMINAL_PALETTES.find((entry) => entry.id === id);
          if (palette) set({ terminalColors: palette.colors });
        }}
      />
      {[0, TERMINAL_COLOR_NAMES.length].map((offset) => {
        const group = t(offset ? 'editor.console.terminalBright' : 'editor.console.terminalNormal', {});
        return (
          <div key={offset} role='group' aria-label={group}>
            <Text size='sm' fw={500}>
              {group}
            </Text>
            <div className='mt-1.5 grid grid-cols-2 gap-2'>
              {TERMINAL_COLOR_NAMES.map((name, i) => {
                const index = offset + i;
                const value = shown[index];
                return (
                  <ColorInput
                    key={name}
                    size='xs'
                    label={t(`editor.console.terminalColorNames.${name}`, {})}
                    value={value}
                    error={HEX.test(value) ? undefined : t('editor.colorInvalid', {})}
                    onChange={(next) => setColor(index, next)}
                    // Mantine also takes #fff, rgb() and hsl(); the theme only stores #rrggbb
                    onBlur={() => {
                      const hex = toHexColor(value);
                      if (hex && hex !== value) setColor(index, hex);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </Stack>
  );
}
