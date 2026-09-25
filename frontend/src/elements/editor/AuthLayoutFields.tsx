import { faImage, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Button from '@/elements/Button.tsx';
import Card from '@/elements/Card.tsx';
import Group from '@/elements/Group.tsx';
import Select from '@/elements/input/Select.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import {
  AUTH_LAYOUTS,
  AUTH_POSITIONS,
  type AuthLayout,
  type AuthPosition,
  MAX_SUPPORT_LINK_LABEL,
  MAX_SUPPORT_LINKS,
  type NebulaTheme,
  SUPPORT_LINK_ICONS,
  type SupportLink,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import { SUPPORT_ICONS } from '../auth/AuthLayout.tsx';
import ChoiceCards from './ChoiceCards.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

// Tiny auth pages for the tiles, drawn with the panel's live variables so they follow the draft.

/** The page the form sits on. */
function Screen({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`relative flex size-full overflow-hidden rounded-sm border border-(--mantine-color-default-border) bg-(--mantine-color-body) ${className}`}
    >
      {children}
    </div>
  );
}

/** The 'Login' heading, two inputs and the button; `card` draws core's card around them. */
function FormMock({ title, card, compact = false }: { title: string; card: boolean; compact?: boolean }) {
  return (
    <div
      className={`flex w-full max-w-9 flex-col gap-0.5 ${
        card ? 'rounded-[3px] border border-(--mantine-color-default-border) bg-(--nebula-card) p-1' : ''
      }`}
    >
      <span className='truncate text-[6px] font-semibold leading-none text-(--mantine-color-text)'>{title}</span>
      <span className='h-1 rounded-full bg-(--mantine-color-dimmed)/50' />
      {!compact && <span className='h-1 rounded-full bg-(--mantine-color-dimmed)/50' />}
      <span className='h-1.5 rounded-[2px] bg-(--mantine-color-blue-filled)' />
    </div>
  );
}

/** The image banner, or the accent gradient it falls back to. */
function BannerMock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-linear-to-br from-(--mantine-color-blue-filled) to-(--nebula-highlight) ${className}`}
    >
      <FontAwesomeIcon icon={faImage} className='text-[9px] text-white/80' />
    </div>
  );
}

function LayoutMock({ layout, title }: { layout: AuthLayout; title: string }) {
  const flatForm = (
    <div className='flex flex-1 items-center justify-center px-1'>
      <FormMock title={title} card={false} />
    </div>
  );

  switch (layout) {
    case 'default':
    case 'flat':
      return (
        <Screen className='items-center justify-center'>
          <FormMock title={title} card={layout === 'default'} />
        </Screen>
      );
    case 'sideBanner':
      return (
        <Screen>
          {flatForm}
          <BannerMock className='h-full w-1/2' />
        </Screen>
      );
    case 'floatingBanner':
      return (
        <Screen>
          {flatForm}
          <div className='h-full w-1/2 p-0.5'>
            <BannerMock className='size-full rounded-[3px]' />
          </div>
        </Screen>
      );
    case 'panels':
      return (
        <Screen className='items-center justify-center'>
          <div className='flex h-4/5 w-[88%] overflow-hidden rounded-[3px] border border-(--mantine-color-default-border) bg-(--nebula-card)'>
            {flatForm}
            <BannerMock className='h-full w-1/2' />
          </div>
        </Screen>
      );
  }
}

/** The logo: an icon square and the panel's name. */
function LogoMock() {
  return (
    <span className='flex items-center gap-0.5'>
      <span className='size-1.5 rounded-[2px] bg-(--mantine-color-blue-filled)' />
      <span className='h-1 w-3 rounded-full bg-(--mantine-color-text)' />
    </span>
  );
}

function LinksMock() {
  return (
    <span className='flex gap-0.5'>
      {[0, 1, 2].map((i) => (
        <span key={i} className='h-1 w-2 rounded-full bg-(--mantine-color-dimmed)' />
      ))}
    </span>
  );
}

/** A default login page with `mark` in the top bar (logo left, links right) or centred above the form. */
function PositionMock({ position, mark, title }: { position: AuthPosition; mark: 'logo' | 'links'; title: string }) {
  const item = mark === 'logo' ? <LogoMock /> : <LinksMock />;

  return (
    <Screen className='flex-col'>
      {position === 'header' && (
        <div className={`flex px-1 pt-1 ${mark === 'logo' ? 'justify-start' : 'justify-end'}`}>{item}</div>
      )}
      <div className='flex flex-1 flex-col items-center justify-center gap-1'>
        {position === 'aboveForm' && item}
        <FormMock title={title} card compact />
      </div>
    </Screen>
  );
}

/** The layout of every auth page and where its logo sits. */
export default function AuthLayoutFields({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const title = t('editor.authLayout.mockTitle', {});

  return (
    <Stack gap='md'>
      <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
        {t('editor.authLayout.layoutTitle', {})}
      </Text>
      <ChoiceCards
        label={t('editor.authLayout.layout', {})}
        description={t('editor.authLayout.layoutDescription', {})}
        value={theme.authLayout}
        columns={3}
        choices={AUTH_LAYOUTS.map((layout) => ({
          value: layout,
          label: t(`editor.authLayout.layouts.${layout}`, {}),
          preview: <LayoutMock layout={layout} title={title} />,
        }))}
        onChange={(authLayout) => set({ authLayout })}
      />
      <ChoiceCards
        label={t('editor.authLayout.logoPosition', {})}
        value={theme.authLogoPosition}
        choices={AUTH_POSITIONS.map((position) => ({
          value: position,
          label: t(`editor.authLayout.positions.${position}`, {}),
          preview: <PositionMock position={position} mark='logo' title={title} />,
        }))}
        onChange={(authLogoPosition) => set({ authLogoPosition })}
      />
    </Stack>
  );
}

/** Up to four links shown on every auth page, in the top bar or above the form. */
export function SupportLinksFields({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const links = theme.supportLinks;

  const setLink = (index: number, patch: Partial<SupportLink>) =>
    set({ supportLinks: links.map((link, i) => (i === index ? { ...link, ...patch } : link)) });

  // 'none' stands for no icon, which the saved link leaves out entirely
  const setIcon = (index: number, value: string | null) => {
    const icon = SUPPORT_LINK_ICONS.find((name) => name === value);
    set({
      supportLinks: links.map((link, i) =>
        i !== index ? link : icon ? { ...link, icon } : { label: link.label, url: link.url },
      ),
    });
  };

  return (
    <Stack gap='md'>
      <div>
        <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
          {t('editor.authLayout.linksTitle', {})}
        </Text>
        <Text size='xs' c='dimmed' mt={4}>
          {t('editor.authLayout.linksDescription', { max: MAX_SUPPORT_LINKS })}
        </Text>
      </div>
      {links.map((link, index) => (
        <Card key={index} p='sm'>
          <Stack gap='xs'>
            <Group gap='xs' wrap='nowrap' align='flex-end'>
              <TextInput
                className='flex-1'
                label={t('editor.authLayout.linkLabel', {})}
                maxLength={MAX_SUPPORT_LINK_LABEL}
                value={link.label}
                onChange={(e) => setLink(index, { label: e.target.value })}
              />
              <ActionIcon
                size='lg'
                color='red'
                variant='subtle'
                aria-label={t('editor.authLayout.removeLink', {})}
                onClick={() => set({ supportLinks: links.filter((_, i) => i !== index) })}
              >
                <FontAwesomeIcon icon={faTrash} />
              </ActionIcon>
            </Group>
            <TextInput
              label={t('editor.authLayout.linkUrl', {})}
              placeholder='https://'
              value={link.url}
              onChange={(e) => setLink(index, { url: e.target.value.trim() })}
            />
            <Select
              label={t('editor.authLayout.linkIcon', {})}
              data={[
                { value: 'none', label: t('editor.authLayout.noIcon', {}) },
                ...SUPPORT_LINK_ICONS.map((icon) => ({ value: icon, label: t(`editor.authLayout.icons.${icon}`, {}) })),
              ]}
              value={link.icon ?? 'none'}
              leftSection={link.icon && <FontAwesomeIcon icon={SUPPORT_ICONS[link.icon]} />}
              onChange={(value) => setIcon(index, value)}
            />
          </Stack>
        </Card>
      ))}
      {links.length < MAX_SUPPORT_LINKS && (
        <Button
          variant='default'
          leftSection={<FontAwesomeIcon icon={faPlus} />}
          onClick={() => set({ supportLinks: [...links, { label: '', url: '' }] })}
        >
          {t('editor.authLayout.addLink', {})}
        </Button>
      )}
      <ChoiceCards
        label={t('editor.authLayout.linksPosition', {})}
        value={theme.supportLinksPosition}
        choices={AUTH_POSITIONS.map((position) => ({
          value: position,
          label: t(`editor.authLayout.positions.${position}`, {}),
          preview: <PositionMock position={position} mark='links' title={t('editor.authLayout.mockTitle', {})} />,
        }))}
        onChange={(supportLinksPosition) => set({ supportLinksPosition })}
      />
    </Stack>
  );
}
