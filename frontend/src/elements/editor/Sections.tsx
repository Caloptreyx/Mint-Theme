import { faPlus, faRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ColorInput, Slider } from '@mantine/core';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Button from '@/elements/Button.tsx';
import Card from '@/elements/Card.tsx';
import Group from '@/elements/Group.tsx';
import Select from '@/elements/input/Select.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import {
  type Article,
  BUTTON_STYLES,
  type ButtonStyle,
  CLICK_EFFECTS,
  derivedColors,
  type Font,
  MAX_ARTICLES,
  type MonoFont,
  type NebulaTheme,
  PRESETS,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import AuthLayoutFields, { SupportLinksFields } from './AuthLayoutFields.tsx';
import BoxFields from './BoxFields.tsx';
import ChoiceCards from './ChoiceCards.tsx';
import ConsoleLayoutField from './ConsoleLayoutField.tsx';
import EggImagesField from './EggImagesField.tsx';
import InterfaceField from './InterfaceField.tsx';
import LayoutField from './LayoutField.tsx';
import NavStyleFields from './NavStyleFields.tsx';
import ServerCardFields from './ServerCardFields.tsx';
import SidebarLayoutFields from './SidebarLayoutFields.tsx';
import { BlockMock, ClickMock, GlassMock, InputMock } from './StyleMocks.tsx';

export type Section =
  | 'presets'
  | 'colours'
  | 'style'
  | 'interface'
  | 'navigation'
  | 'components'
  | 'console'
  | 'background'
  | 'home'
  | 'articles'
  | 'layout'
  | 'login';

type ColorKey = keyof Pick<
  NebulaTheme,
  | 'accent'
  | 'highlight'
  | 'background'
  | 'surface'
  | 'text'
  | 'surfaceRaised'
  | 'surfaceOverlay'
  | 'textMuted'
  | 'textFaint'
  | 'textOnAccent'
  | 'line'
  | 'buttonColor'
  | 'buttonText'
  | 'success'
  | 'warning'
  | 'danger'
  | 'offline'
  | 'chartOne'
  | 'chartTwo'
  | 'lightBackground'
  | 'lightSurface'
  | 'lightText'
>;

/** Groups shown in the Colours section; the optional ones fall back to a derived value when cleared. */
type ColorGroup =
  | 'accents'
  | 'surfaces'
  | 'surfacesExtra'
  | 'text'
  | 'textExtra'
  | 'lines'
  | 'buttons'
  | 'status'
  | 'charts'
  | 'light';

const COLOR_GROUPS: { group: ColorGroup; keys: ColorKey[]; optional?: boolean }[] = [
  { group: 'accents', keys: ['accent', 'highlight'] },
  { group: 'surfaces', keys: ['background', 'surface'] },
  { group: 'surfacesExtra', keys: ['surfaceRaised', 'surfaceOverlay'], optional: true },
  { group: 'text', keys: ['text'] },
  { group: 'textExtra', keys: ['textMuted', 'textFaint', 'textOnAccent'], optional: true },
  { group: 'lines', keys: ['line'], optional: true },
  { group: 'buttons', keys: ['buttonColor', 'buttonText'], optional: true },
  { group: 'status', keys: ['success', 'warning', 'danger', 'offline'], optional: true },
  { group: 'charts', keys: ['chartOne', 'chartTwo'], optional: true },
  { group: 'light', keys: ['lightBackground', 'lightSurface', 'lightText'], optional: true },
];

interface Props {
  section: Section;
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

function Labelled({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <Group justify='space-between' mb={6}>
        <Text size='sm' fw={500}>
          {label}
        </Text>
        {value && (
          <Text size='xs' c='dimmed'>
            {value}
          </Text>
        )}
      </Group>
      {children}
    </div>
  );
}

export default function Sections({ section, theme, set }: Props) {
  const { t } = useExtTranslations();
  const derived = derivedColors(theme) as Record<string, string>;

  const setArticle = (index: number, patch: Partial<Article>) =>
    set({ articles: theme.articles.map((a, i) => (i === index ? { ...a, ...patch } : a)) });

  switch (section) {
    case 'presets':
      return (
        <Stack gap='xs'>
          {PRESETS.map((preset) => (
            <Card key={preset.name} hoverable p='sm' onClick={() => set(preset.theme)}>
              <Group justify='space-between' wrap='nowrap'>
                <Text fw={600}>{preset.name}</Text>
                <Group gap={4} wrap='nowrap'>
                  {[preset.theme.background, preset.theme.surface, preset.theme.accent, preset.theme.highlight].map(
                    (swatch) => (
                      <span
                        key={swatch}
                        className='size-5 rounded-full border border-(--mantine-color-default-border)'
                        style={{ background: swatch }}
                      />
                    ),
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      );
    case 'colours':
      return (
        <Stack gap='lg'>
          {COLOR_GROUPS.map(({ group, keys, optional }) => (
            <Stack gap='xs' key={group}>
              <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
                {t(`editor.group.${group}`, {})}
              </Text>
              {keys.map((key) => (
                <ColorInput
                  key={key}
                  label={t(`editor.${key}`, {})}
                  description={optional && !theme[key] ? t('editor.derived', {}) : undefined}
                  value={theme[key] || derived[key] || ''}
                  onChange={(value) => set({ [key]: value })}
                  rightSection={
                    optional && theme[key] ? (
                      <ActionIcon
                        variant='subtle'
                        color='gray'
                        aria-label={t('editor.clearColor', {})}
                        onClick={() => set({ [key]: '' })}
                      >
                        <FontAwesomeIcon icon={faRotateLeft} />
                      </ActionIcon>
                    ) : undefined
                  }
                />
              ))}
            </Stack>
          ))}
        </Stack>
      );
    case 'style':
      return (
        <Stack gap='lg'>
          <Select
            label={t('editor.font', {})}
            data={[
              { value: 'exo', label: t('editor.fontExo', {}) },
              { value: 'montserrat', label: t('editor.fontMontserrat', {}) },
              { value: 'outfit', label: t('editor.fontOutfit', {}) },
              { value: 'jakarta', label: t('editor.fontJakarta', {}) },
              { value: 'space', label: t('editor.fontSpace', {}) },
              { value: 'panel', label: t('editor.fontPanel', {}) },
            ]}
            value={theme.font}
            onChange={(value) => value && set({ font: value as Font })}
          />
          <Select
            label={t('editor.monoFont', {})}
            description={t('editor.monoFontDescription', {})}
            data={[
              { value: 'jetbrains', label: t('editor.monoFontJetbrains', {}) },
              { value: 'fira', label: t('editor.monoFontFira', {}) },
              { value: 'panel', label: t('editor.fontPanel', {}) },
            ]}
            value={theme.monoFont}
            onChange={(value) => value && set({ monoFont: value as MonoFont })}
          />
          <Select
            label={t('editor.buttonStyle', {})}
            data={BUTTON_STYLES.map((value) => ({ value, label: t(`editor.buttons.${value}`, {}) }))}
            value={theme.buttonStyle}
            onChange={(value) => value && set({ buttonStyle: value as ButtonStyle })}
          />
          <Stack gap='md'>
            <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
              {t('editor.blocks.title', {})}
            </Text>
            <Labelled label={t('editor.radius', {})} value={`${theme.radius}px`}>
              <Slider min={0} max={24} value={theme.radius} onChange={(radius) => set({ radius })} />
            </Labelled>
            <div>
              <Labelled label={t('editor.blocks.opacity', {})} value={`${theme.blockOpacity}%`}>
                <Slider
                  min={0}
                  max={100}
                  value={theme.blockOpacity}
                  onChange={(blockOpacity) => set({ blockOpacity })}
                />
              </Labelled>
              <Text size='xs' c='dimmed' mt={6}>
                {t('editor.blocks.opacityDescription', {})}
              </Text>
            </div>
            <ChoiceCards
              label={t('editor.blocks.glass', {})}
              description={t('editor.blocks.glassHint', {})}
              value={theme.glass ? 'on' : 'off'}
              choices={[
                { value: 'off', label: t('editor.blocks.glassOff', {}), preview: <GlassMock glass={false} /> },
                { value: 'on', label: t('editor.blocks.glassOn', {}), preview: <GlassMock glass /> },
              ]}
              onChange={(value) => set({ glass: value === 'on' })}
            />
            <ChoiceCards
              label={t('editor.blocks.border', {})}
              value={theme.blockBorder ? 'on' : 'off'}
              choices={[
                { value: 'on', label: t('editor.blocks.withBorder', {}), preview: <BlockMock border /> },
                { value: 'off', label: t('editor.blocks.withoutBorder', {}), preview: <BlockMock border={false} /> },
              ]}
              onChange={(value) => set({ blockBorder: value === 'on' })}
            />
          </Stack>
          <Stack gap='md'>
            <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
              {t('editor.elements.title', {})}
            </Text>
            <Labelled label={t('editor.elementRadius', {})} value={`${theme.elementRadius}px`}>
              <Slider
                min={0}
                max={20}
                value={theme.elementRadius}
                onChange={(elementRadius) => set({ elementRadius })}
              />
            </Labelled>
            <ChoiceCards
              label={t('editor.elements.inputBorder', {})}
              value={theme.inputBorder ? 'on' : 'off'}
              choices={[
                { value: 'on', label: t('editor.elements.withBorder', {}), preview: <InputMock border /> },
                {
                  value: 'off',
                  label: t('editor.elements.withoutBorder', {}),
                  preview: <InputMock border={false} />,
                },
              ]}
              onChange={(value) => set({ inputBorder: value === 'on' })}
            />
            <ChoiceCards
              label={t('editor.elements.clickEffect', {})}
              description={t('editor.elements.clickEffectDescription', {})}
              value={theme.clickEffect}
              choices={CLICK_EFFECTS.map((effect) => ({
                value: effect,
                label: t(`editor.elements.click.${effect}`, {}),
                preview: <ClickMock effect={effect} label={t('editor.elements.create', {})} />,
              }))}
              onChange={(clickEffect) => set({ clickEffect })}
            />
          </Stack>
        </Stack>
      );
    case 'background':
      return (
        <Stack gap='lg'>
          <TextInput
            label={t('editor.backgroundImage', {})}
            description={t('editor.backgroundImageDescription', {})}
            placeholder='https://'
            value={theme.backgroundImage}
            onChange={(e) => set({ backgroundImage: e.target.value.trim() })}
          />
          <Labelled label={t('editor.backgroundDim', {})} value={`${theme.backgroundDim}%`}>
            <Slider
              min={0}
              max={100}
              disabled={!theme.backgroundImage}
              value={theme.backgroundDim}
              onChange={(backgroundDim) => set({ backgroundDim })}
            />
          </Labelled>
        </Stack>
      );
    case 'login':
      return (
        <Stack gap='xl'>
          <AuthLayoutFields theme={theme} set={set} />
          <Stack gap='md'>
            <Text size='xs' fw={600} tt='uppercase' c='dimmed' className='tracking-wider'>
              {t('editor.authLayout.appearanceTitle', {})}
            </Text>
            <TextInput
              label={t('editor.login.background', {})}
              description={t('editor.login.backgroundDescription', {})}
              placeholder='https://'
              value={theme.loginBackground}
              onChange={(e) => set({ loginBackground: e.target.value.trim() })}
            />
            <Labelled label={t('editor.login.dim', {})} value={`${theme.loginDim}%`}>
              <Slider
                min={0}
                max={100}
                disabled={!theme.loginBackground}
                value={theme.loginDim}
                onChange={(loginDim) => set({ loginDim })}
              />
            </Labelled>
            <TextInput
              label={t('editor.login.logo', {})}
              description={t('editor.login.logoDescription', {})}
              placeholder='https://'
              value={theme.loginLogo}
              onChange={(e) => set({ loginLogo: e.target.value.trim() })}
            />
          </Stack>
          <SupportLinksFields theme={theme} set={set} />
          <Text size='xs' c='dimmed'>
            {t('editor.login.preview', {})}
          </Text>
        </Stack>
      );
    case 'articles':
      return (
        <Stack gap='lg'>
          <Stack gap='xs'>
            <div>
              <Text size='sm' fw={600}>
                {t('editor.articles', {})}
              </Text>
              <Text size='xs' c='dimmed'>
                {t('editor.articlesDescription', { max: MAX_ARTICLES })}
              </Text>
            </div>
            {theme.articles.map((article, index) => (
              <Card key={index} p='sm'>
                <Stack gap='xs'>
                  <Group gap='xs' wrap='nowrap' align='flex-end'>
                    <TextInput
                      className='flex-1'
                      label={t('editor.articleTitle', {})}
                      value={article.title}
                      onChange={(e) => setArticle(index, { title: e.target.value })}
                    />
                    <ActionIcon
                      size='lg'
                      color='red'
                      variant='subtle'
                      aria-label={t('editor.removeArticle', {})}
                      onClick={() => set({ articles: theme.articles.filter((_, i) => i !== index) })}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </ActionIcon>
                  </Group>
                  <TextInput
                    label={t('editor.articleDescription', {})}
                    value={article.description}
                    onChange={(e) => setArticle(index, { description: e.target.value })}
                  />
                  <TextInput
                    label={t('editor.articleUrl', {})}
                    placeholder='https://'
                    value={article.url}
                    onChange={(e) => setArticle(index, { url: e.target.value.trim() })}
                  />
                </Stack>
              </Card>
            ))}
            {theme.articles.length < MAX_ARTICLES && (
              <Button
                variant='default'
                leftSection={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => set({ articles: [...theme.articles, { title: '', description: '', url: '' }] })}
              >
                {t('editor.addArticle', {})}
              </Button>
            )}
          </Stack>
        </Stack>
      );
    case 'layout':
      return <LayoutField theme={theme} set={set} />;
    case 'interface':
      return <InterfaceField theme={theme} set={set} />;
    case 'navigation':
      return (
        <Stack gap='xl'>
          <SidebarLayoutFields theme={theme} set={set} />
          <NavStyleFields theme={theme} set={set} />
        </Stack>
      );
    case 'components':
      return (
        <Stack gap='xl'>
          <ServerCardFields theme={theme} set={set} />
          <BoxFields theme={theme} set={set} />
        </Stack>
      );
    case 'console':
      return <ConsoleLayoutField theme={theme} set={set} />;
    case 'home':
      return (
        <Stack gap='lg'>
          <TextInput
            label={t('editor.homeBanner', {})}
            description={t('editor.homeBannerDescription', {})}
            placeholder='https://'
            value={theme.homeBanner}
            onChange={(e) => set({ homeBanner: e.target.value.trim() })}
          />

          <EggImagesField theme={theme} set={set} />
        </Stack>
      );
  }
}
