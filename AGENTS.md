# Working on this theme

Mint is a Calagopus Panel extension (`dev.caloptreyx.mint`). It needs panel **1.2.0 or newer**.
Up to 1.2.1 it was `dev.s4way.nebula`; the migration in `migrations/` copies that ID's saved theme and
announcement buttons to the new one. Names nobody sees keep the old name on purpose: `NebulaTheme`,
`--nebula-*`, `nebula:` browser storage keys, the `nebula::account_banner` user setting and the
`publicdata/nebula/banners` path (renaming the last two would lose every user's banner).
Everything visible uses the new name: the editor is `/admin/mint`, its login preview `/mint/login-preview`,
the public theme route `/mint/theme`, activity events `mint:*`.
An extension is a Rust crate plus a TypeScript frontend that the panel compiles into itself.

## Layout

```
Metadata.toml              package name, display name, panel version range
backend/src/lib.rs         Extension impl: mounts the routers, hands over the settings deserializer
backend/src/settings.rs    four opaque settings: `theme` (the editor's JSON), `announcement_ctas`, `presets`, `theme_history`
backend/src/routes.rs      GET /mint/theme (public) and PUT /api/admin/.../theme (settings.update)
backend/src/banner.rs      per user account banner upload/remove (client API)
backend/src/cta.rs         announcement call to action buttons: GET (client API) and PUT (admin API)
backend/src/presets.rs     custom presets and user selectable presets: GET/POST/PATCH/DELETE (admin API)
backend/src/history.rs     the last 10 replaced themes (written by the theme PUT), GET (admin API)
backend/src/updates.rs     check_for_updates: GitHub releases of Caloptreyx/Mint-Theme, cached an hour
frontend/src/index.ts      entry point: hooks, route interceptors, Mantine theme
frontend/src/lib/theme.ts  the theme model, normalizeTheme() and buildCss()
frontend/src/lib/apply.ts  applies CSS (the site theme or the user's pick), caches it, preview bridge, useNebulaTheme()
frontend/src/lib/library.ts  presets, users' theme choices and history: ids, normalizers, resolveUserTheme()
frontend/src/pages/        ServerHome, ServerConsole, ServerList (dashboard), ThemeEditor
frontend/src/elements/     account/, home/, dashboard/, editor/, files/ (phone editor keys), library/ (presets, history, theme choice), sidebar/, page/ pieces
frontend/src/app.css       static CSS: @font-face, flush sidebar, active link, sidebar sections, keyframes
frontend/src/translations.ts  every user facing string
tests/theme.test.ts        node:test cases for normalizeTheme() and buildCss() (not shipped)
tests/library.test.ts      node:test cases for lib/library.ts and the per user fields (not shipped)
scripts/package.py         builds the release zip; .github/workflows/release.yml runs it on v* tags
```

## How the theming works

The look is **not** baked in at startup. `buildCss(theme)` turns the saved JSON into CSS custom
properties and `applyTheme()` injects them into one `<style id="nebula-theme">`. That is why the
editor can repaint the panel live without a reload.

- Selectors use `html:root` (and `html:root[data-mantine-color-scheme="dark"]`) so they outrank both
  Mantine's own `:root` output and the panel's pinned scheme overrides in its `app.css`.
- Palettes are generated from five colours (accent, highlight, background, surface, text). Everything
  else is optional and falls back to a derived value; `derivedColors()` returns those fallbacks so the
  editor can show the colour actually in use.
- `contrastIssues()` checks the pairs actually painted (derived values included, links in their anchor shade,
  light mode's own text, surface and dimmed text, button text only for solid buttons (text on accent when only
  that is set), text on accent for the solid menu styles, 3:1 for iconPill's icon) and returns those below
  WCAG AA. The Colours section lists them on top and under each input (`ContrastWarnings.tsx`); they never
  block saving. Keep the pairs in step with `buildCss` when a colour moves.
- `favicon` is not CSS: `applyTheme()` parks core's icon links (`.app-icon`, whose href core's App sets from
  `settings.app.icon`) under another rel and adds its own `icon` and `apple-touch-icon` links, so core can keep
  updating its links and clearing the option restores them. The public theme route covers logged out pages.
- Button styles (solid, tinted, outline, glass) are CSS rules keyed off `--button-bg`, the per-colour
  value Mantine sets inline. That keeps red and green buttons their own colour.
- `buttonColor` redefines the accent variables **on the button element**, so the inline
  `var(--mantine-color-blue-filled)` reference resolves to it without touching anything else.
- `textOnAccent`: core and Mantine pin `--mantine-primary-color-contrast` on `:root[data-mantine-color-scheme]`,
  which the plain `html:root` block loses to, so a set colour goes in both scheme blocks. Mantine gives filled
  buttons, action icons and badges white text through inline `--button-color`/`--ai-color`/`--badge-color`, so
  those are replaced (`!important`) where the inline fill is `var(--mantine-color-blue-filled)`; a badge with no
  colour or variant has no inline style and is the accent. Only the variable changes, so tinted, outline and
  glass buttons and `buttonText` (they set `color`) still win. Empty emits nothing: core's white.
- "Blocks" are Mantine cards (the sidebar is one) and bordered papers. `blockOpacity` turns
  `--nebula-card` into an rgba colour and paints cards with it, so treat `--nebula-card` as possibly
  translucent; overlays (modals, menus, popovers, dialogs, the fixed bulk action bar) are never matched and
  stay solid. Styles that match nothing by default are only emitted when an option leaves its default, so
  an older saved theme builds the same CSS. The default `clickEffect`, 'drop', is Mantine's own
  `.mantine-active:active` 1px nudge.
- `boxStyle` restyles the title row of titled cards: core's `TitleCard` (`#title-card-header`, which the Home
  cards use too; its divider is an inline style, hence `!important`) and `ChartBlock` (a `border-b` header
  holding an h3). Admin Settings (1.2.0 to 1.2.3) has no titled cards, only flat FormEngine grids, so there it
  styles the section structure instead, scoped by `:has()` to the content after core's tab list with the
  `/admin/settings/webauthn` tab: each tab's heading row, an open `CollapsibleSection` header (User; open when
  the collapse after the button has `aria-hidden="false"`), the Mail templates panes' header bands (a
  `bg-(--mantine-color-default)` div before a `Divider`) and card titles (Ratelimits). The ratelimit endpoint
  cards only carry a `Code` label, no title. `statStyle` reshapes core's `StatCard`, which is not hookable, by
  its structure: a card whose row holds a `ThemeIcon` then the label column. Custom tiles only follow it if they
  render `StatCard`.
- `navHover` restyles core's menu links (`Sidebar.Link`: a NavLink around a subtle `Button` that gets `active`)
  in `#sidebar-content`, the top bar's `.nebula-topnav` and its portaled `.nebula-topnav-menu` dropdowns, hovered
  (inside `@media (hover:hover)`) and current.
  The accent is captured on the link (`--nebula-nav-accent`), not the button, so `buttonColor` leaves the menu
  alone; 'iconPill' pads FontAwesome's content-box svg into a tile. 'default' is `app.css`'s tint, no rules.
- Light mode has its own palette (`lightBase()`): the dark background becomes the ink, the surfaces are
  near white with a hint of accent, and Mantine's `gray` scale plus `white`/`black` are repainted,
  because that is what Mantine's light styles draw cards, inputs, borders and hovers from. The dark only
  overrides (raised, overlay, muted, faint, hairline) are ignored there; `lightBackground`,
  `lightSurface` and `lightText` override the three base colours. It also repaints what core hardcodes for
  a white page: xterm's viewport (core's light terminal theme paints `#ffffff` inline on
  `.xterm-scrollable-element`, which core's xterm.css misses) goes transparent and its default text takes the
  theme's, the chart tick grey becomes the dimmed colour, and so do core's Tailwind greys (`text-neutral-400`,
  `text-gray-400/500/600`, bare, `!` and `light:`). Those are `!important` utilities in a layer, which nothing
  unlayered beats, so `buildCss` redefines the `--color-*` variable they read on those elements.
- A first visit has no cached theme (`nebula:theme`): `applyCachedTheme()` paints nothing and sets
  `data-nebula-pending` on html, which `app.css` turns into a hidden body, until `loadTheme()` settles (the
  fetched theme, or the default if it failed) or 1.5s pass; `repaint()` does nothing meanwhile. The trade off is
  a blank page in core's background for one small request instead of the default look switching to the real
  one. A cached theme never waits.
- The editor's light/dark toggle only affects the preview frame. `listenForPreview()` sets the
  attribute and fires a synthetic `storage` event so Mantine's React state follows (terminal colours,
  logos), and blocks the frame's writes of `mantine-color-scheme-value`: the frame shares localStorage
  with the editor, and a write there would switch the admin's own scheme.

**`normalizeTheme()` is the security boundary.** The saved JSON is operator supplied and ends up in a
stylesheet served to every visitor, including the login page. Colours must match a hex pattern,
numbers are clamped, URLs must be http(s) or root relative with no quotes, parens, semicolons or
braces, and unknown fields are dropped. Never interpolate a raw value into CSS without it.

## How it hooks into the panel

No `overrides.ts`. Build time overrides ignore the extension's enable toggle, clash with other themes
and break silently when core moves a file. Everything here is runtime:

- `Sidebar.addPropsInterceptor` wraps the menu in `GroupedNav`, which turns the panel's own **labelled
  dividers** into collapsible sections. Labels come from the egg's route order, so operators name them
  in the panel. Unlabelled dividers stay plain rules.
- A second `Sidebar.addPropsInterceptor` (`withNavSearch`, `elements/sidebar/NavSearch.tsx`) walks the routers'
  header and footer fragments and swaps core's `QuickActionsTrigger` and footer `ServerSwitcher` in place (by
  identity) for `NavSearch` and `NavSearchFooter`, which read `searchComponent` live. 'palette' renders core's
  own elements, 'serverSelector' moves core's switcher to the top, 'searchBar' is a combobox over the user's
  servers (in the admin area every server and user the admin may read) whose last row opens core's palette
  with the query (`useQuickActionsStore` `setQuery`/`setOpen`). The palette registers its own shortcut, so it
  works in every mode. In the slim rail both fold to an icon that opens the palette (`#` is its server search).
- `sidebarLayout` and `dockPosition` (`elements/sidebar/SidebarShell.tsx`). `Sidebar.addRenderInterceptor` runs
  after every props interceptor, so the shell sees the final header, footer and menu. With the defaults it
  returns core's element untouched. Otherwise core still renders its drawer and desktop card from the same
  props, and the shell adds a `.nebula-bar` card after it: the dock (the header minus its `Sidebar.Link`s and
  dividers, which stay in the menu), the pill layout's account (`Sidebar.Footer`) or page title, or the
  horizontal layout's whole menu (`TopNav`: core's links in a scrolling row, each labelled divider's links in
  a core `Menu`). A moved dock is wrapped in `.nebula-dock-origin` in the header, hidden in the desktop card
  only, so the drawer below `lg` keeps everything. app.css makes the router's root a grid while a bar exists and
  puts the bar in the content column's cell, so it sticks; the column is pushed down by `--nebula-bar-h`, which
  the bar measures with a ResizeObserver. `buildCss` reshapes `#sidebar-desktop`, scoped to the one beside
  `#dashboard-root`, `#server-root` or `#admin-root` (the setup wizard's sidebar holds its steps). The slim rail
  gets `RailTip` (a `Sidebar.Link` render interceptor, a tooltip only inside the desktop card) and `RailLogo`
  (an `AppIcon` one, the square icon), and GroupedNav renders every section's links there under a rule.
  `applyTheme()` mirrors both options onto html as `data-nebula-layout` and `data-nebula-dock` for static CSS.
- `mobileNav: 'bottomBar'` (`elements/sidebar/BottomNav.tsx`), a second `Sidebar.addRenderInterceptor` registered after
  the shell: below `lg` a fixed bottom bar (safe area aware) with up to four links taken from the menu the Sidebar
  received, wrappers kept, so a `ServerCan` without access renders nothing and the next link fills in (the nav hides
  children past the fifth, Menu included). Server pages prefer Home, Console, Files, Backups, Settings; the admin area
  Back, Overview, Servers, Users; the dashboard Servers, Account, Admin. Core keeps the drawer's open state inside the
  Sidebar, so Menu clicks core's own floating menu button: the bar renders a hidden
  `[data-nebula-bottom-nav-marker]` just before core's element, whose first node is that button's card, and app.css
  hides the card after it. The bar uses core's `lg:` variant (a container query since 1.2.2), measures itself into
  `--nebula-bottom-nav-h` on html and sets `data-nebula-bottom-nav` while displayed, which app.css turns into bottom
  padding for the content column and a lift for core's `ActionBar`, bottom toasts and the uploads card. 'drawer' returns
  core's element untouched.
- `routes.addServerRouteInterceptor` puts Home at `/` and moves the console to `/console`, swapping its
  element for `ServerConsole`: core's terminal with the `consoleLayout` widgets (`elements/console/`) in rows
  above and below it and in columns beside it, which stack under it below `lg` (`xl` when both are used).
  Core's `ServerStats` only exports all three charts together, so `ConsoleChartsProvider` runs core's
  `useStreamChart` for each and feeds them the same way, and `ChartsWidget` renders core's `ChartBlock`/`StreamChart`
  from that context. The provider wraps the whole page, above the slots, so a chart moved to another slot (a
  remount) keeps its history. Core's `statBlocks` slot follows the last chart run, or the extension cards when no
  chart is placed. The default is the page from before.
- `pages.dashboard.account.container` hides the account title and prepends `ProfileCard`. The banner is
  uploaded to `PUT/DELETE /api/client/extensions/dev.caloptreyx.mint/banner` (`backend/src/banner.rs`, the
  avatar route's checks, re-encoded to a 1500x500 JPEG at `publicdata/nebula/banners/<user>.jpg`, the
  storage prefix core serves for extensions). Its URL sits in core's synced user settings
  (`nebula::account_banner`) and is still checked with `SAFE_URL` before use. The avatar opens core's
  `AvatarContainer` in a modal; `app.css` hides the grid copy (`.order-60`).
- Presets, users' own themes and the theme history (`backend/src/presets.rs`, `history.rs`, `lib/library.ts`,
  `elements/library/`). Custom presets are full normalized themes in the `presets` setting
  (`{ custom: [{ id, name, theme, users }], builtin: [id] }`, at most 20, each theme under the theme PUT's
  64 KiB and all four times that; built-in ones are only ids, `builtinId()` slugs of `PRESETS` names).
  Admin API under `/api/admin/extensions/dev.caloptreyx.mint/presets`: GET (`settings.read`), POST, and
  PATCH/DELETE `/{id}` (`settings.update`, activity `mint:preset.create|update|delete`); a built-in id can
  only toggle `users`. Applying a preset in the editor lays its **look** over the draft (`pickUserTheme()`).
  The public `GET /mint/theme` also returns `choices` (the user selectable ones, custom ones with their
  theme); users pick one in `ThemeChoiceCard`, appended to core's account grid through
  `pages.dashboard.account.accountContainers`, stored in core's synced user setting `nebula::theme_choice`.
  `apply.ts` paints `withUserTheme(site, pick)`: the site theme with only `USER_THEME_FIELDS` (theme.ts)
  taken from the pick, so content, layouts, auth pages and every field not listed stay site wide; a pick no
  longer offered is the site theme. `watchUserTheme()` follows core's user settings store (live, other tabs,
  sign out), and `holdSiteTheme()` forces the site theme on auth pages (`AuthScope`), in the editor and in
  its preview frame (which then shows the draft). Every theme PUT that changes the theme moves the replaced
  one into `theme_history` with who saved it and when (last 10); the editor's clock icon lists them
  (`GET .../history`, `settings.read`) and loads one into the draft.
- `routes.addAdminRoute` adds the editor; it is also the extension's `cardConfigurationPage`.
- `pages.dashboard.home.enterContainerAll(...).addPropsInterceptor` replaces the servers list. The
  list route is hardcoded in the panel's router, so this props interceptor (it can replace `children`
  and `title`) is the only runtime way in. Its sort and grouping (`elements/dashboard/serverOrder.ts`,
  tested in `tests/serverOrder.test.ts`) order the loaded page only: core's servers API has no sort
  parameter. CPU, RAM and uptime come from core's user store (`serverResourceUsage`, filled by each row's
  `useServerStats`), read only while sorting by one of them; status comes from the rows' `onStatus`.
  Group headings are siblings of the rows (grid: `col-span-full`), so a row changing group moves, not
  remounts. Sort, group and view persist as `nebula:server-sort`, `nebula:server-group`, `nebula:server-view`.
- `pages.server.console.xterm` init, after open and unmount handlers (`lib/terminal.ts`) hand the
  theme's `monoFont` to xterm, which sizes its cell grid from its `fontFamily` option, not the CSS. The font
  is only set once `document.fonts` has loaded it, because xterm measures its cells when the option changes;
  a font still loading leaves the grid sized for the fallback. Its colours are core's `getXtermTheme()`, reset
  on every scheme change; xterm 6 draws with DOM spans, so light mode fixes them in `buildCss` instead.
- `mobileEditor` (`lib/mobileEditor.ts`, `elements/files/EditorKeys.tsx`). `elements.monacoEditor.addOnMountHandler`
  runs for every Monaco editor (file editor, tree pane, database console, logs; not diff editors): on a touch device
  whose editor node is under 768px wide it swaps in phone options (wrap, no minimap, folding, gutter extras or
  popups, font at least 16px so iOS doesn't zoom) and restores them when a layout change (rotation) or the option
  says so. `@monaco-editor/react` hands core's `options` prop (wordWrap, minimap, fontSize from the file manager's
  editor settings) to `updateOptions` on every render, so the handler wraps that editor's `updateOptions` while the
  phone options are on: a repeated value keeps the phone value, a changed one is the user's and stands (fonts only
  from 16px up). The handler keeps a registry of mounted editors, most recently focused last.
  `pages.server.files.editorContainer.appendContentComponent(EditorKeys)` adds the key row to the file editor
  page: the editor it drives is the registry's latest one inside the same content div, shown only for the
  'monaco' engine (core defaults touch devices to 'pierre', left alone) and editable editors, `lg:hidden!`. It is
  fixed above the on-screen keyboard (core's `useVisualViewportBottomInset`), else app.css puts it on the bottom
  edge or on `--nebula-bottom-nav-h`; it reserves the strip it covers with Monaco's `padding.bottom` and
  `cursorSurroundingLines`. Keys `preventDefault` pointer and mouse down so the editor keeps focus.
- `pages.auth.prependComponent(AuthScope)` (`elements/auth/AuthScope.tsx`) puts `nebula-auth` on html
  while any auth page is mounted; `buildCss` scopes `loginBackground` to it. `AppIcon.addRenderInterceptor`
  wraps core's logo in `AuthLogo`, which shows `loginLogo` instead only while that scope is active.
  Auth routes redirect signed in users, so `routes.addGlobalRoute` serves core's real `Login` page at
  `/mint/login-preview` for the editor's preview.
  Every auth page renders through core's hookable `AuthWrapper` (a scroller sized to the window below its
  top edge, the logo, the form in a `Card`, the copyright). `AuthWrapper.addRenderInterceptor` wraps it in
  `AuthLayout` (`elements/auth/AuthLayout.tsx`), which returns it untouched for the defaults and otherwise
  puts it in a column: `[&>div]:h-full!` sizes core's scroller to that column so a top bar fits above it,
  the form's `Card` is flattened by class, and the banner (`loginBackground`, else `backgroundImage`, each
  under its own dim via `dimmedImage()`, else an accent gradient) sits beside it from `lg` up; the banner
  layouts cover the page, so there the dim only reaches the image through the banner. With `authLogoPosition: 'header'` the top bar renders
  its own `AppIcon` inside the `HeaderLogo` context and `AuthLogo` hides core's copy. Support links placed
  above the form come from `AuthWrapper.addPropsInterceptor(withFormLinks)`, first in the page's children.
- Announcement call to action buttons. Core's `announcements` table has no room for them, so
  `backend/src/cta.rs` keeps a map `announcement uuid -> { title, url }` in the `announcement_ctas`
  setting: `GET /api/client/extensions/dev.caloptreyx.mint/announcement-ctas` (any signed in user, since
  announcements only show in the signed in layout) and `PUT /api/admin/extensions/dev.caloptreyx.mint/announcement-ctas`
  (`announcements.update`, same checks as `SAFE_URL`, prunes buttons of deleted announcements). The admin
  side is a tab added with `pages.admin.announcements.view.subNavigation.addItemInterceptor`
  (`elements/announcements/AnnouncementCtaTab.tsx`). Users see announcements through core's
  `DismissibleAnnouncementAlert`, which is not hookable, but the `Alert` it renders is: `Alert.addPropsInterceptor`
  appends `AnnouncementCtaButton` to alerts with a string title and a markdown body, and that matches the
  alert back to its announcement (`lib/cta.ts` `matchAnnouncement()`: title, content and colour in the current
  language; two identical announcements get no button). Server scoped announcements live in the server store,
  which throws outside the server router, so a `ServerContentContainer` render interceptor provides them
  through a context. `lib/ctaStore.ts` fetches the map once per page load and caches it in localStorage.
- Toasts, page transitions and page titles. Core's toast stack (`providers/ToastProvider.tsx`, the one
  `.fixed.z-999` element) has no hook, but the `Notification` it renders does: `Notification.addPropsInterceptor`
  exposes the Mantine colour as `data-nebula-tone` (green success, red error, yellow warning, teal info), and
  for `toastStyle: 'glassy'` `buildCss` restyles only notifications inside that stack. Mantine's colour bar
  (`::before`) becomes the icon tile with a data URI glyph per tone, and `::after` counts down core's 7.5s
  `toastTimeout` (not on progress toasts, not under reduced motion).
  `global.prependComponent(PageTransition)` (`elements/page/PageTransition.tsx`) renders a hidden marker
  just before core's routes; on a pathname change it finds the content column after it (`#server-root`,
  `#dashboard-root` or `#admin-root`, the sidebar's sibling) and sets `data-nebula-page-enter` on the div
  core's `Container` holds the page in. `buildCss` animates that div's children, not an ancestor: a transform
  there would pin fixed pages (the editor) to the column while it runs. The attribute goes once no page
  animation is running and there is no fill mode, so nothing lingers for xterm's fit. The keyframes are
  static in `app.css` because the editor's option tiles play them too.
  `ServerContentContainer.addPropsInterceptor(hidePageTitle)` (`elements/page/PageTitles.tsx`) sets
  `hideTitleComponent` when `pageTitles` is off and puts the search box and `contentRight` buttons back in
  a right aligned row. Both read `currentTheme()` when they run, so the preview shows a change on its next
  navigation. Core's Files page hides the container title and draws its own heading beside its settings
  and view buttons, so `buildCss` hides just that heading (`[data-file-manager-page]`). Detail pages that
  show an item's name (a schedule, a database, the file editor) keep it.
- Server cards and table style. `serverCardStyle` is read by the servers grid itself (`ServerCard.tsx`,
  its `GRID_CLASS` sets the grid's columns per style), so it adds no CSS. `tableStyle: 'cards'` restyles
  core's `Table` (`elements/Table.tsx`: a div with an inline border and fill around Mantine's
  `TableScrollContainer`) from `buildCss`: the wrapper goes transparent (`!important`, it is inline), the
  table switches to `border-collapse: separate` with row spacing, and each body row gets the card fill with
  the end cells rounding it. The fill sits on the row, not its cells, and without `!important`, so the
  fills core sets inline on a row (a selected file, a drop target) and the file manager's
  `.selection-area-preview` still win; Chrome clips a row's fill to its cells' radii. The file list's
  virtual padding rows (one empty cell) are excluded. The extension's own list view renders each
  `ServerRow` as a core `Card` instead, so it follows block opacity, glass and borders.

Core components are reused wherever possible: the console terminal, power controls, charts, bulk
action bar, stats hooks and the drag and drop kit. Import them from the **flat** paths
(`@/elements/Card.tsx`, `@/lib/server.ts`), which exist across releases; the nested paths do not
exist in older ones. Page level imports (`@/pages/server/console/...`) are why the floor is 1.2.0.

## Constraints

- The panel's CSP allows fonts from `'self'` only, so fonts ship in `frontend/src/fonts` (OFL, licence
  text beside them). Do not link Google Fonts.
- Extension frontends may only import the panel's direct dependencies.
- Every user facing string goes through `translations.ts`; keys are type checked and throw at runtime
  if missing.
- Other languages live in `frontend/public/translations/<lang>/dev.caloptreyx.mint.json` (same keys as the
  English in `translations.ts`); add, rename or remove keys there too whenever the English keys change.
- Keep custom CSS minimal; use panel components and Tailwind utilities with Mantine variables.

## Verifying a change

`normalizeTheme()` and `buildCss()` have tests in `tests/theme.test.ts`, the announcement button checks
in `tests/cta.test.ts`, presets, user choices and history in `tests/library.test.ts` (plain `node:test`, no
dependencies, kept outside `frontend/src` so the panel never compiles them). Run them with
`node --test "tests/*.test.ts"` (Node 24 strips the types; a bare `tests/` is not accepted as a path). Add a
case there whenever a theme field or a validation helper changes; a new theme field that users should get
from a picked preset also goes into `USER_THEME_FIELDS`.

Everything else needs the panel: stage the extension into a panel checkout and run the real
toolchain; there is no standalone build.

```
cp -r frontend/.  <panel>/frontend/extensions/dev_caloptreyx_mint/
cp -r backend/.   <panel>/backend-extensions/dev_caloptreyx_mint/
cp Metadata.toml  <panel>/backend-extensions/dev_caloptreyx_mint/
cd <panel>/frontend && pnpm typecheck && pnpm exec biome check --write extensions/dev_caloptreyx_mint && pnpm build
cd <panel> && SQLX_OFFLINE=true cargo test -p dev_caloptreyx_mint
```

Sync any biome fixes back, then clean the panel checkout (remove the staged folders,
`frontend/public/translations/en`, and `git checkout -- Cargo.lock frontend/pnpm-lock.yaml`).

To run it: the backend extension must be registered with `panel-rs extensions resync` (it rewrites
`backend-extensions/internal-list`), then `pnpm build`, `touch shared/src/lib.rs`, `cargo build`,
restart. The frontend is embedded into the binary at compile time, so a `pnpm build` alone changes
nothing.

Package for release with `python3 scripts/package.py`. It writes `dist/dev_caloptreyx_mint.c7s.zip`:
directory entries first, then files, in sorted walk order, skipping `.git`, `node_modules`, `target`
and `dist` anywhere and `docs`, `tests`, `scripts`, `.github`, `README.md`, `.gitignore` at the root
(`AGENTS.md`, `LICENSE` and `migrations/` ship). Check it with `panel-rs extensions inspect`.

Pushing a `v*` tag runs `.github/workflows/release.yml`: the tests, a check that the tag is
`v` + `version` in `backend/Cargo.toml` (it fails otherwise, so bump that first), the packaging
script, then it creates the GitHub release `Mint Theme <version>` with generated notes if missing
and uploads the zip (`gh release upload --clobber`).

Installed panels see a release through `check_for_updates` (`backend/src/updates.rs`) once it is
published, not a draft or prerelease, and has the zip attached. Its changelog on **Admin → Updates** is the
`- ` bullet lines of every newer release's notes, so write the notes as bullets (the generated notes are
replaced by hand today).

## Gotchas found the hard way

- `Progress` shows an hourglass and a label inside the bar by default and forces `size='xl'`; pass
  `hourglass={false} withLabel={false}` for a plain bar.
- `CopyOnClick` renders a `<button>`, which centres its text. Pass `className='text-left!'` in a grid.
- Calling `stopPropagation()` on a click around a checkbox also swallows React's synthetic change
  event. Let the click bubble and ignore it by target instead (`closest('[data-row-select]')`).
- `Children.toArray` does not flatten fragments, and the routers wrap menus in them; flatten yourself.
- A table header and its rows must share one grid definition (`ROW_GRID`) or the columns drift; hide
  columns with the same `COLUMN_CLASS` on both.
- The panel's `sm`/`md`/`lg`/`xl` (and `max-*`) are container queries on the page content beside the
  sidebar (`@container page`, see core's `breakpoints.css`), not the window, so the same class switches
  at a wider window when the sidebar is showing. Check layouts at real window sizes.
- The panel builds with the React Compiler, which caches a component's calls by their arguments. A call that
  reads a module level store must take that store's `useSyncExternalStore` value as an argument, or the
  component keeps the first answer (see `activeEditorIn(scope, version)` in `lib/mobileEditor.ts`).
- Tailwind utilities live in a CSS layer and Mantine's styles do not, so Mantine wins over a plain
  utility on its own components (a card's `outline-2` computes to none). Add `!` (`outline-2!`).
- Core pins the desktop sidebar's `display`, `position` and width with Tailwind `!` utilities. A layered
  `!important` beats every unlayered one, whatever its specificity, so nothing in `buildCss` or app.css can
  change those; the rail and the hidden sidebar cap the size with `max-width`/`max-height` instead.
