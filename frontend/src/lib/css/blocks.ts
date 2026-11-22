// Cards and papers (opacity, glass, borders), inputs, and the styles of titled cards, stat tiles, tables and titles.
import type { NebulaTheme } from '../theme.ts';

export function blockCss(t: NebulaTheme): string[] {
  const css: string[] = [];
  // blocks are Mantine cards (the sidebar is one) and bordered papers; overlays (modals, menus, popovers,
  // dialogs, core's PreviewCard hover copy) are left alone so they stay solid, and so is a card floating in a
  // fixed bar (the bulk action bar)
  const CARD = 'html:root .mantine-Card-root';
  const PAPER =
    'html:root .mantine-Paper-root[data-with-border]:not(.mantine-Card-root,.mantine-Dialog-root,.mantine-ActionBar-root)';
  const BLOCK = `${CARD}:not(.fixed > *,.z-20[class~="top-1/2"] > *)`;
  const SEE_THROUGH = `${BLOCK},${PAPER}`;
  if (t.blockOpacity < 100) {
    css.push(
      `${BLOCK}{background-color:var(--nebula-card);}`,
      `${PAPER}{background-color:color-mix(in srgb,var(--mantine-color-body) ${t.blockOpacity}%,transparent);}`,
    );
    const blur = 'blur(14px) saturate(160%)';
    if (t.glass) css.push(`${SEE_THROUGH}{-webkit-backdrop-filter:${blur};backdrop-filter:${blur};}`);
  }
  if (!t.blockBorder) css.push(`${CARD},${PAPER}{border-color:transparent;}`);

  // borderless inputs take Mantine's `filled` background so they still stand out; errors keep their red border
  if (!t.inputBorder) {
    const INPUT = '.mantine-Input-wrapper[data-variant="default"]';
    css.push(
      `html:root[data-mantine-color-scheme="dark"] ${INPUT}{--input-bg:var(--mantine-color-dark-5);}`,
      `html:root[data-mantine-color-scheme="light"] ${INPUT}{--input-bg:var(--mantine-color-gray-1);}`,
      `html:root ${INPUT}:not([data-error],[data-success]){--input-bd:transparent;}`,
    );
  }

  return css;
}

export function cardStyleCss(t: NebulaTheme): string[] {
  const css: string[] = [];
  // most server page titles go through `hidePageTitle` (elements/page/PageTitles.tsx); core's Files page draws
  // its own beside its settings and view buttons, so only that heading is hidden here and the buttons stay
  if (!t.pageTitles) {
    css.push(
      'html:root [data-file-manager-page] > .mantine-Group-root > .mantine-Group-root > .mantine-Title-root{display:none;}',
    );
  }

  // titled cards: core's TitleCard header (`#title-card-header`, the extension's Home cards too) and core's
  // chart cards (ChartBlock, a bordered header row holding an h3); TitleCard's divider is an inline style
  if (t.boxStyle !== 'default') {
    const TITLE_CARD = 'html:root .mantine-Card-root > #title-card-header';
    const CHART_CARD = 'html:root .mantine-Card-root > .border-b:first-child:has(> div > h3)';
    const HEAD = `${TITLE_CARD},${CHART_CARD}`;
    const TITLE = `${TITLE_CARD} > .mantine-Title-root,${CHART_CARD} > div > h3`;
    const line = 'var(--mantine-color-default-border)';
    if (t.boxStyle === 'line') css.push(`${HEAD}{background:transparent;border-bottom:1px solid ${line}!important;}`);
    if (t.boxStyle === 'fill') {
      css.push(
        `${HEAD}{background:var(--mantine-color-blue-light);border-bottom-color:transparent!important;}`,
        `${TITLE}{color:var(--mantine-color-blue-light-color);}`,
      );
    }
    if (t.boxStyle === 'pill') {
      css.push(
        `${HEAD}{background:transparent;border-bottom-color:transparent!important;padding-bottom:0;}`,
        `${TITLE}{padding:4px 12px;border-radius:999px;background:var(--mantine-color-blue-light);color:var(--mantine-color-blue-light-color);}`,
      );
    }

    // admin Settings has no titled cards (flat FormEngine grids), so there it restyles each tab's heading row (the
    // header right after core's tab list, found by its Webauthn tab), open CollapsibleSection headers (User: route
    // order; open when the collapse after the button is), the Mail templates panes' header bands (a band, then a
    // Divider) and card titles (Ratelimits: exemptions). `!important` colours beat Mantine's inline `c='dimmed'`.
    const SETTINGS = 'html:root .mantine-Tabs-root:has(a[href$="/admin/settings/webauthn"]) ~';
    const HEADING = `${SETTINGS} div:has(> h2.mantine-Title-root:first-child)`;
    const HEADING_ROW = `${SETTINGS} .mantine-Group-root:has(> div:first-child > h2.mantine-Title-root:first-child)`;
    const CARD_TITLE = `${SETTINGS} form .mantine-Card-root > .mantine-Stack-root > h3.mantine-Title-root:first-child`;
    const SECTION = `${SETTINGS} form .mantine-UnstyledButton-root:first-child:has(+ [aria-hidden="false"]:last-child)`;
    const BAND = `${SETTINGS} * .mantine-Paper-root > div[class~="bg-(--mantine-color-default)"]:has(+ .mantine-Divider-root)`;
    const ROWS = `${HEADING},${HEADING_ROW},${CARD_TITLE}`;
    const TITLES = `${HEADING} > h2,${HEADING_ROW} > div > h2,${CARD_TITLE},${SECTION} > .mantine-Text-root,${BAND} .mantine-Text-root`;
    const accent = 'color:var(--mantine-color-blue-light-color)!important;';
    if (t.boxStyle === 'line') {
      css.push(
        `${ROWS}{padding-bottom:var(--mantine-spacing-xs);border-bottom:1px solid ${line};}`,
        `${SECTION}{border-bottom:1px solid ${line};}`,
        `${BAND}{background:transparent;}`,
      );
    }
    if (t.boxStyle === 'fill') {
      css.push(
        `${ROWS}{padding:var(--mantine-spacing-xs) var(--mantine-spacing-md);border-radius:var(--mantine-radius-md);background:var(--mantine-color-blue-light);}`,
        `${SECTION},${BAND}{background:var(--mantine-color-blue-light);}`,
        `${BAND} + .mantine-Divider-root{border-top-color:transparent;}`,
        `${TITLES}{${accent}}`,
      );
    }
    if (t.boxStyle === 'pill') {
      css.push(
        `${BAND}{background:transparent;}`,
        `${BAND} + .mantine-Divider-root{border-top-color:transparent;}`,
        `${SECTION} > .mantine-Text-root{flex:0 1 auto!important;margin-right:auto;}`,
        `${TITLES}{width:fit-content;padding:4px 12px;border-radius:999px;background:var(--mantine-color-blue-light);${accent}}`,
      );
    }
  }

  // core's StatCard: a card holding a row of a filled ThemeIcon square, then the label and value (`ml-4`)
  if (t.statStyle !== 'default') {
    const ROW = 'html:root .mantine-Card-root > .flex.flex-row.items-center:has(> .mantine-ThemeIcon-root + .flex-col)';
    const reversed = t.statStyle === 'reversed' || t.statStyle === 'minimalReversed';
    if (reversed) css.push(`${ROW}{flex-direction:row-reverse;}${ROW} > .flex-col{margin-left:0;margin-right:1rem;}`);
    if (t.statStyle === 'minimal' || t.statStyle === 'minimalReversed') {
      // the bare glyph in the tile's colour, next to the label instead of centred on the whole tile
      css.push(
        `${ROW} > .mantine-ThemeIcon-root{width:auto;height:auto;min-width:0;min-height:0;align-self:flex-start;margin-top:2px;background:transparent;border-color:transparent;color:var(--ti-bg,var(--mantine-primary-color-filled));font-size:0.75rem;}`,
        `${ROW} > .flex-col{${reversed ? 'margin-right' : 'margin-left'}:0.75rem;}`,
      );
    }
  }

  // core's Table (elements/Table.tsx): a div with an inline border and fill around Mantine's scroll container.
  // The rows are painted rather than their cells, so the fills core puts inline on a row (a selected or dragged
  // over file) and the file manager's drag selection still win; the end cells round the corners, which clips the
  // row's fill. The file list's virtual padding rows hold one empty cell and stay invisible.
  if (t.tableStyle === 'cards') {
    const TABLE = '.mantine-TableScrollContainer-scrollContainer .mantine-Table-table';
    const ROW = `html:root ${TABLE} > .mantine-Table-tbody > tr:not(:has(> td:only-child:empty))`;
    const edge = t.blockBorder ? 'var(--mantine-color-default-border)' : 'transparent';
    const radius = 'var(--mantine-radius-md)';
    css.push(
      'html:root div[style]:has(> .mantine-TableScrollContainer-scrollContainer){background:none!important;border-color:transparent!important;}',
      `html:root ${TABLE}{border-collapse:separate;border-spacing:0 6px;--nebula-row:var(--nebula-card);}`,
      // inside a card the rows take the raised fill, so they still stand apart from it
      `html:root .mantine-Card-root ${TABLE}{--nebula-row:var(--mantine-color-default);}`,
      `html:root ${TABLE} > .mantine-Table-thead > tr > th{box-shadow:none;color:var(--mantine-color-dimmed);}`,
      `${ROW}{background-color:var(--nebula-row);}`,
      `@media (hover:hover){${ROW}[data-hover]:hover{background-color:color-mix(in srgb,var(--mantine-color-text) 5%,var(--nebula-row));}}`,
      `${ROW} > td{border-block:1px solid ${edge};}`,
      `${ROW} > td:first-child{border-inline-start:1px solid ${edge};border-start-start-radius:${radius};border-end-start-radius:${radius};}`,
      `${ROW} > td:last-child{border-inline-end:1px solid ${edge};border-start-end-radius:${radius};border-end-end-radius:${radius};}`,
    );
  }

  return css;
}
