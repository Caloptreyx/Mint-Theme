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
  derivedColors,
  type Font,
  MAX_ARTICLES,
  type NebulaTheme,
  PRESETS,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import EggImagesField from './EggImagesField.tsx';
import LayoutField from './LayoutField.tsx';

export type Section = 'presets' | 'colours' | 'style' | 'background' | 'home' | 'articles' | 'layout';

type ColorKey = {
  [K in keyof NebulaTheme]: NebulaTheme[K] extends string ? K : never;
}[keyof NebulaTheme];

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
  | 'charts';

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
              { value: 'panel', label: t('editor.fontPanel', {}) },
            ]}
            value={theme.font}
            onChange={(value) => value && set({ font: value as Font })}
          />
          <Select
            label={t('editor.buttonStyle', {})}
            data={BUTTON_STYLES.map((value) => ({ value, label: t(`editor.buttons.${value}`, {}) }))}
            value={theme.buttonStyle}
            onChange={(value) => value && set({ buttonStyle: value as ButtonStyle })}
          />
          <Labelled label={t('editor.radius', {})} value={`${theme.radius}px`}>
            <Slider min={0} max={24} value={theme.radius} onChange={(radius) => set({ radius })} />
          </Labelled>
          <Labelled label={t('editor.elementRadius', {})} value={`${theme.elementRadius}px`}>
            <Slider min={0} max={20} value={theme.elementRadius} onChange={(elementRadius) => set({ elementRadius })} />
          </Labelled>
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
