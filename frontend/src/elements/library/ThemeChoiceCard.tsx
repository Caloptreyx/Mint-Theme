import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { z } from 'zod';
import { savedTheme, useThemeChoices } from '../../lib/apply.ts';
import { TitleCard, useUserSetting } from '../../lib/core.ts';
import { THEME_CHOICE_KEY } from '../../lib/library.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from '../editor/ChoiceCards.tsx';
import Swatches from './Swatches.tsx';

/**
 * The account page's theme picker, a card in core's account grid: the panel default plus every preset an
 * admin offers. The pick is a core user setting, so it follows the user across devices; `lib/apply.ts`
 * repaints as soon as it changes. Hidden while nothing is offered.
 */
export default function ThemeChoiceCard({ requireTwoFactorActivation }: { requireTwoFactorActivation?: boolean }) {
  const { t } = useExtTranslations();
  const choices = useThemeChoices();
  const [picked, setPicked] = useUserSetting(THEME_CHOICE_KEY, z.string(), '');

  if (choices.length === 0) return null;

  // a pick that is no longer offered shows (and paints) the panel default
  const value = choices.some((choice) => choice.id === picked) ? picked : '';
  const site = savedTheme();

  return (
    <TitleCard
      title={t('library.choice.title', {})}
      icon={<FontAwesomeIcon icon={faPalette} />}
      // after core's cards, which order themselves up to 60; blurred like them until 2FA is set up
      className={`h-full order-70${requireTwoFactorActivation ? ' blur-xs pointer-events-none select-none' : ''}`}
    >
      <ChoiceCards
        label={t('library.choice.label', {})}
        description={t('library.choice.description', {})}
        value={value}
        onChange={setPicked}
        choices={[
          { value: '', label: t('library.choice.default', {}), preview: <Swatches theme={site} /> },
          ...choices.map((choice) => ({
            value: choice.id,
            label: choice.name,
            preview: <Swatches theme={{ ...site, ...choice.theme }} />,
          })),
        ]}
      />
    </TitleCard>
  );
}
