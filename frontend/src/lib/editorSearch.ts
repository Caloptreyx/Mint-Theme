import type { Section } from '../elements/editor/Sections.tsx';
import type { ExtTranslationKey as Key } from '../translations.ts';
import type { NebulaTheme } from './theme.ts';

/** A translation key, or a prefix ending in `.` that stands for every key under it. */
type Term = Key | `editor.${string}.`;

export type ColorKey = keyof Pick<
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

export const COLOR_GROUPS: { group: ColorGroup; keys: ColorKey[]; optional?: boolean }[] = [
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

/**
 * One setting the editor's search finds: its section, its label (the text the editor scrolls to, so it must be
 * rendered in that section exactly like this) and more text that also finds it: descriptions, headings, options.
 */
export interface Setting {
  section: Section;
  label: Key;
  also?: Term[];
}

export const SETTINGS: Setting[] = [
  { section: 'presets', label: 'library.saveAsPreset', also: ['library.saveAsPresetDescription'] },
  {
    section: 'presets',
    label: 'library.custom',
    also: ['library.rename', 'library.delete', 'library.overwrite'],
  },
  { section: 'presets', label: 'library.builtin', also: ['library.users'] },

  ...COLOR_GROUPS.flatMap(({ group, keys, optional }) =>
    keys.map(
      (key): Setting => ({
        section: 'colours',
        label: `editor.${key}`,
        also: optional ? [`editor.group.${group}`] : [`editor.group.${group}`, `editor.${key}Description` as Key],
      }),
    ),
  ),

  {
    section: 'style',
    label: 'editor.font',
    also: ['editor.fontExo', 'editor.fontMontserrat', 'editor.fontOutfit', 'editor.fontJakarta', 'editor.fontSpace'],
  },
  {
    section: 'style',
    label: 'editor.monoFont',
    also: ['editor.monoFontDescription', 'editor.monoFontJetbrains', 'editor.monoFontFira'],
  },
  { section: 'style', label: 'editor.buttonStyle', also: ['editor.buttons.'] },
  { section: 'style', label: 'editor.radius', also: ['editor.blocks.title'] },
  {
    section: 'style',
    label: 'editor.blocks.opacity',
    also: ['editor.blocks.title', 'editor.blocks.opacityDescription'],
  },
  { section: 'style', label: 'editor.blocks.glass', also: ['editor.blocks.glassHint', 'editor.blocks.glassOn'] },
  { section: 'style', label: 'editor.blocks.border', also: ['editor.blocks.title'] },
  { section: 'style', label: 'editor.elementRadius', also: ['editor.elements.title'] },
  { section: 'style', label: 'editor.elements.inputBorder', also: ['editor.elements.title'] },
  {
    section: 'style',
    label: 'editor.elements.clickEffect',
    also: ['editor.elements.clickEffectDescription', 'editor.elements.click.'],
  },

  {
    section: 'interface',
    label: 'editor.interface.toastStyle',
    also: ['editor.interface.toastStyleDescription', 'editor.interface.toasts.'],
  },
  {
    section: 'interface',
    label: 'editor.interface.pageTransition',
    also: ['editor.interface.pageTransitionDescription', 'editor.interface.transitions.'],
  },
  { section: 'interface', label: 'editor.interface.pageTitles', also: ['editor.interface.pageTitlesDescription'] },
  {
    section: 'interface',
    label: 'editor.interface.mobileEditor',
    also: ['editor.interface.mobileEditorDescription'],
  },

  {
    section: 'navigation',
    label: 'editor.navLayout.layout',
    also: ['editor.navLayout.title', 'editor.navLayout.layoutDescription', 'editor.navLayout.layouts.'],
  },
  {
    section: 'navigation',
    label: 'editor.navLayout.dock',
    also: ['editor.navLayout.dockDescription', 'editor.navLayout.dockHorizontal', 'editor.navLayout.docks.'],
  },
  {
    section: 'navigation',
    label: 'editor.mobileNav.label',
    also: ['editor.mobileNav.description', 'editor.mobileNav.options.'],
  },
  {
    section: 'navigation',
    label: 'editor.navStyle.hover',
    also: ['editor.navStyle.title', 'editor.navStyle.hoverDescription', 'editor.navStyle.hovers.'],
  },
  {
    section: 'navigation',
    label: 'editor.navStyle.search',
    also: ['editor.navStyle.searchDescription', 'editor.navStyle.searches.', 'editor.navStyle.searchHints.'],
  },
  {
    section: 'navigation',
    label: 'editor.navOrder.userArrange',
    also: ['editor.navOrder.userArrangeDescription', 'editor.navOrder.menus.'],
  },
  {
    section: 'navigation',
    label: 'editor.navOrder.label',
    also: ['editor.navOrder.title', 'editor.navOrder.description'],
  },

  {
    section: 'components',
    label: 'editor.serverCards.cardStyle',
    also: ['editor.serverCards.title', 'editor.serverCards.cardStyleDescription', 'editor.serverCards.styles.'],
  },
  {
    section: 'components',
    label: 'editor.serverCards.tableStyle',
    also: ['editor.serverCards.tablesTitle', 'editor.serverCards.tableStyleDescription', 'editor.serverCards.tables.'],
  },
  {
    section: 'components',
    label: 'editor.boxes.boxStyle',
    also: ['editor.boxes.title', 'editor.boxes.boxStyleDescription', 'editor.boxes.styles.'],
  },
  {
    section: 'components',
    label: 'editor.boxes.statStyle',
    also: ['editor.boxes.statsTitle', 'editor.boxes.statStyleDescription', 'editor.boxes.stats.'],
  },

  {
    section: 'console',
    label: 'editor.consoleLayout.title',
    also: [
      'editor.consoleLayout.description',
      'editor.consoleLayout.terminal',
      'editor.consoleLayout.slot.',
      'editor.consoleLayout.widget.',
    ],
  },

  { section: 'background', label: 'editor.backgroundImage', also: ['editor.backgroundImageDescription'] },
  { section: 'background', label: 'editor.backgroundDim' },
  { section: 'background', label: 'editor.favicon.label', also: ['editor.favicon.description'] },

  { section: 'home', label: 'editor.homeBanner', also: ['editor.homeBannerDescription'] },
  {
    section: 'home',
    label: 'editor.eggImages',
    also: ['editor.eggImagesDescription', 'editor.egg', 'editor.eggBanner', 'editor.eggIcon'],
  },

  { section: 'articles', label: 'editor.articles', also: ['editor.articlesDescription', 'editor.addArticle'] },

  { section: 'layout', label: 'editor.sidebarGroups', also: ['editor.sidebarGroupsDescription'] },
  {
    section: 'layout',
    label: 'editor.column.left',
    also: ['editor.layoutDescription', 'editor.column.right', 'editor.card.', 'editor.hideCard'],
  },

  {
    section: 'login',
    label: 'editor.authLayout.layout',
    also: ['editor.authLayout.layoutDescription', 'editor.authLayout.layouts.'],
  },
  { section: 'login', label: 'editor.authLayout.logoPosition', also: ['editor.authLayout.positions.'] },
  {
    section: 'login',
    label: 'editor.login.background',
    also: ['editor.authLayout.appearanceTitle', 'editor.login.backgroundDescription'],
  },
  { section: 'login', label: 'editor.login.dim' },
  { section: 'login', label: 'editor.login.logo', also: ['editor.login.logoDescription'] },
  {
    section: 'login',
    label: 'editor.authLayout.linksTitle',
    also: ['editor.authLayout.linksDescription', 'editor.authLayout.icons.', 'editor.authLayout.addLink'],
  },
  { section: 'login', label: 'editor.authLayout.linksPosition', also: ['editor.authLayout.positions.'] },
];

/** The keys a setting's `also` stands for, prefixes expanded against every key there is. */
export function expandTerms(terms: readonly string[], keys: readonly string[]): string[] {
  return terms.flatMap((term) => (term.endsWith('.') ? keys.filter((key) => key.startsWith(term)) : [term]));
}

/** A setting with its text in the current language. */
export interface SearchDoc {
  label: string;
  section: string;
  also: string[];
}

export interface SearchHit<T extends SearchDoc> {
  doc: T;
  /** The text that matched, when the label and section alone did not. */
  hint: string | null;
}

/** Lower case, accents folded. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Settings holding every word of the query anywhere in their text, best first: label starting with the query,
 * every word in the label, every word in label and section, the rest. Ties keep the editor's order.
 */
export function searchSettings<T extends SearchDoc>(docs: readonly T[], query: string): SearchHit<T>[] {
  const phrase = fold(query).trim().replace(/\s+/g, ' ');
  const words = phrase.split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const scored: { hit: SearchHit<T>; score: number }[] = [];
  for (const doc of docs) {
    const label = fold(doc.label);
    const head = `${label} ${fold(doc.section)}`;
    const also = doc.also.map(fold);
    if (!words.every((word) => head.includes(word) || also.some((text) => text.includes(word)))) continue;

    const inLabel = words.every((word) => label.includes(word));
    const inHead = words.every((word) => head.includes(word));
    const score = label.startsWith(phrase) ? 0 : inLabel ? 1 : inHead ? 2 : 3;
    const missing = words.find((word) => !head.includes(word));
    const hintIndex = missing === undefined ? -1 : also.findIndex((text) => text.includes(missing));
    scored.push({ hit: { doc, hint: hintIndex < 0 ? null : doc.also[hintIndex] }, score });
  }

  return scored.sort((a, b) => a.score - b.score).map(({ hit }) => hit);
}
