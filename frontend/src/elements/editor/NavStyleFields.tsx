import { faFolder, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Radio } from '@mantine/core';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import { NAV_HOVERS, type NavHover, type NebulaTheme, SEARCH_COMPONENTS } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

/**
 * Tile classes per style, after navHoverCss in lib/theme.ts: the current link and its icon, and the second row's
 * hover look, which shows while the tile is hovered.
 */
const HOVER_MOCKS: Record<NavHover, { current: string; icon?: string; hover: string; hoverIcon?: string }> = {
  default: {
    current:
      'bg-(--mantine-color-blue-filled)/32 text-(--mantine-color-text) light:ring-1 light:ring-inset light:ring-(--mantine-color-blue-outline)',
    hover: 'group-hover/nav:bg-(--mantine-color-default-hover)',
  },
  filled: {
    current: 'bg-(--mantine-color-blue-filled) text-(--mantine-primary-color-contrast)',
    hover: 'group-hover/nav:bg-(--mantine-color-blue-light) group-hover/nav:text-(--mantine-color-text)',
  },
  filledSecondary: {
    current:
      'bg-(--mantine-color-default-hover) light:bg-(--mantine-color-gray-2) text-(--mantine-color-blue-light-color)',
    hover:
      'group-hover/nav:bg-(--mantine-color-default-hover)/60 light:group-hover/nav:bg-(--mantine-color-gray-2)/60 group-hover/nav:text-(--mantine-color-text)',
  },
  iconPill: {
    current: 'text-(--mantine-color-text)',
    icon: 'bg-(--mantine-color-blue-filled) text-(--mantine-primary-color-contrast)',
    hover: '',
    hoverIcon:
      'group-hover/nav:bg-(--mantine-color-blue-light) group-hover/nav:text-(--mantine-color-blue-light-color)',
  },
  pill: {
    current: 'rounded-full! bg-(--mantine-color-blue-filled) text-(--mantine-primary-color-contrast)',
    hover: 'rounded-full! group-hover/nav:bg-(--mantine-color-blue-light) group-hover/nav:text-(--mantine-color-text)',
  },
  pillSecondary: {
    current:
      'rounded-full! bg-(--mantine-color-default-hover) light:bg-(--mantine-color-gray-2) text-(--mantine-color-text)',
    icon: 'text-(--mantine-color-blue-light-color)',
    hover:
      'rounded-full! group-hover/nav:bg-(--mantine-color-default-hover)/60 light:group-hover/nav:bg-(--mantine-color-gray-2)/60 group-hover/nav:text-(--mantine-color-text)',
  },
};

/** Two menu rows: the current link, then one that takes the hover look while the tile is hovered. */
function NavHoverMock({ hover, label }: { hover: NavHover; label: string }) {
  const mock = HOVER_MOCKS[hover];
  const row = 'flex h-5 items-center gap-1.5 rounded-(--mantine-radius-sm) px-1.5 text-[10px] leading-none';
  const icon = 'flex h-4 w-4 shrink-0 items-center justify-center rounded-(--mantine-radius-xs) text-[8px]';

  return (
    <div className='group/nav flex w-full flex-col gap-1'>
      <div className={`${row} ${mock.current}`}>
        <span className={`${icon} ${mock.icon ?? ''}`}>
          <FontAwesomeIcon icon={faTerminal} />
        </span>
        <span className='truncate'>{label}</span>
      </div>
      <div className={`${row} text-(--mantine-color-dimmed) ${mock.hover}`}>
        <span className={`${icon} ${mock.hoverIcon ?? ''}`}>
          <FontAwesomeIcon icon={faFolder} />
        </span>
        <span className='h-1 w-10 rounded-full bg-current opacity-60' />
      </div>
    </div>
  );
}

/** Navigation section: how menu links react, and what search sits under the logo. */
export default function NavStyleFields({ theme, set }: Props) {
  const { t } = useExtTranslations();

  return (
    <Stack gap='md'>
      <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
        {t('editor.navStyle.title', {})}
      </Text>
      <ChoiceCards
        label={t('editor.navStyle.hover', {})}
        description={t('editor.navStyle.hoverDescription', {})}
        value={theme.navHover}
        choices={NAV_HOVERS.map((hover) => ({
          value: hover,
          label: t(`editor.navStyle.hovers.${hover}`, {}),
          preview: <NavHoverMock hover={hover} label={t('editor.navStyle.mockLink', {})} />,
        }))}
        onChange={(navHover) => set({ navHover })}
      />
      <Radio.Group
        label={t('editor.navStyle.search', {})}
        description={t('editor.navStyle.searchDescription', {})}
        value={theme.searchComponent}
        onChange={(value) => {
          const searchComponent = SEARCH_COMPONENTS.find((search) => search === value);
          if (searchComponent) set({ searchComponent });
        }}
      >
        <Stack gap='sm' mt='xs'>
          {SEARCH_COMPONENTS.map((search) => (
            <Radio
              key={search}
              value={search}
              label={t(`editor.navStyle.searches.${search}`, {})}
              description={t(`editor.navStyle.searchHints.${search}`, {})}
            />
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
