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
backend/src/routes.rs      GET /mint/theme (public, `{ theme, version }` with an ETag) and PUT /api/admin/.../theme (settings.update or mint-theme.update)
backend/src/permissions.rs the `mint-theme.update` admin permission and the checks every theme, preset and history route uses
backend/src/banner.rs      per user account banner GET/upload/remove (client API), removal on user deletion
backend/src/cta.rs         announcement call to action buttons: GET (client API) and PUT (admin API)
backend/src/presets.rs     custom presets and user selectable presets: GET/POST/PATCH/DELETE (admin API), theme-choices GET (client API)
backend/src/history.rs     the last 10 replaced themes (written by the theme PUT), GET (admin API)
backend/src/updates.rs     check_for_updates: GitHub releases of Caloptreyx/Mint-Theme, cached 10 min in memory, ETag revalidated
frontend/src/index.ts      entry point: hooks, route interceptors, Mantine theme
frontend/src/lib/core.ts   the one module that re-exports every core import (see the end of "How it hooks into the panel")
frontend/src/lib/theme.ts  the theme model, normalizeTheme() and buildCss()
frontend/src/lib/apply.ts  applies CSS (the site theme or the user's pick), caches it, preview bridge, useNebulaTheme(), the local theme
frontend/src/lib/localTheme.ts  'Apply in this browser': parseLocalTheme() and paintedTheme() (local ?? saved, then the user's pick)
frontend/src/lib/navOrder.ts  side menu orders: NavOrder, normalizeNavOrder(), arrange(), mergeOrder(), link and section ids
frontend/src/lib/permissions.ts  useCanSaveTheme(): settings.update or mint-theme.update
frontend/src/lib/library.ts  presets, users' theme choices and history: ids, normalizers, resolveUserTheme()
frontend/src/lib/editorSearch.ts  the editor's settings index (SETTINGS, COLOR_GROUPS) and searchSettings()
frontend/src/lib/editorDraft.ts   checks on the editor's raw draft: urlValid, invalidUrls, isThemeFile, toHexColor
frontend/src/lib/redact.ts  core's 'Hide server addresses' setting: useRedactAddresses(), shownAddress(), maskAddress()
frontend/src/pages/        ServerHome, ServerConsole, ServerList (dashboard), ThemeEditor
frontend/src/elements/     account/, home/, dashboard/, editor/, files/ (phone editor keys), library/ (presets, history, theme choice), sidebar/, page/ pieces
frontend/src/app.css       static CSS: @font-face, flush sidebar, active link, sidebar sections, keyframes
frontend/src/translations.ts  every user facing string
tests/theme.test.ts        node:test cases for normalizeTheme() and buildCss() (not shipped)
tests/library.test.ts      node:test cases for lib/library.ts and the per user fields (not shipped)
tests/editorSearch.test.ts node:test cases for the editor search's matching and ranking (not shipped)
tests/editorDraft.test.ts  node:test cases for lib/editorDraft.ts (not shipped)
tests/localTheme.test.ts   node:test cases for lib/localTheme.ts (not shipped)
tests/navOrder.test.ts     node:test cases for lib/navOrder.ts (not shipped)
tests/cta.test.ts, serverOrder.test.ts, routeOrder.test.ts  node:test cases for lib/cta.ts, the servers list ordering and lib/routeOrder.ts (not shipped)
scripts/package.py         builds the release zip; .github/workflows/release.yml runs it on v* tags
.github/workflows/check.yml  CI on every push: the org's shared extension check (see "Verifying a change")
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
  light mode's own text, surface and dimmed text) and returns those below WCAG AA. Text on accent is always
  checked at 3:1 (role `accentFills`: badges, checkboxes, switches, filled action icons) and at 4.5:1 under the
  'filled' and 'pill' menu styles. Button text is checked on solid buttons (text on accent when only that is
  set); a set `buttonText` with a tinted, glass or outline style is checked against that fill
  (`mix(buttonColor || accent, surface, …)`) over both the dark surface and `lightSurface` (the two `bg` values
  keep the warnings' keys unique). The Colours section lists them on top and under each input
  (`ContrastWarnings.tsx`); they never block saving. Keep the pairs in step with `buildCss` when a colour moves.
- Status, offline and chart colours: the 0-9 scales go in plain `html:root` (the server-status variables too,
  since core defines them in Tailwind's `@theme`), while the `-filled`, `-filled-hover`, `-light`,
  `-light-hover`, `-light-color`, `-outline`, `-outline-hover` and `-text` variants of green, yellow, red (and
  gray when `offline` is set) and `--chart-series-1/2` go in both scheme blocks, because core and Mantine pin
  them on `:root[data-mantine-color-scheme]`. Light mode's `-light-color` and `-text` are made readable on the
  light surface. Unset colours emit nothing.
- `scrollbar`: app.css paints the page scrollbar in dark mode with `var(--nebula-scrollbar, var(--mantine-color-dark-4))`
  (dark-4 is 14% text over the background, also the hairline's fallback); `buildCss` sets `--nebula-scrollbar` in the
  dark block only when the colour is set. Like the other dark only overrides, light mode keeps `gray-4`. Core's own
  scrollers (the file tree) use `--mantine-color-default-border`, so `line` reaches those.
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
  glass buttons and `buttonText` (they set `color`) still win. Empty emits nothing: core's white. Built-in
  presets always set `textOnAccent` (Mint `#0b1314`, the others `''`), so applying one over another resets it.
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
  one. A cached theme never waits. The guard covers only the site theme: a user's pick needs the choices, which
  arrive after sign-in.
- `applyTheme()` rewrites the style text and the html attributes only when they change, and keeps `current`
  (no listeners fired) for a JSON-equal theme. `watchUserTheme()` follows other tabs' `nebula:theme` and
  `nebula:theme-choices` writes through `storage` events (not while previewing).
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
  in the panel. Unlabelled dividers stay plain rules. Closed sections (`nebula:sidebar-closed`) are one
  page-wide store read through `useSyncExternalStore`, shared by the drawer and desktop copies and other tabs
  (`storage`); navigating to a page inside a closed section opens and saves it.
- Menu order (`lib/navOrder.ts`, `elements/sidebar/nav.ts`, `ArrangeMenu.tsx`, `NavArranger.tsx`,
  `elements/editor/NavOrderField.tsx`, `tests/navOrder.test.ts`). Core already orders the server menu (each egg
  configuration's route order) and the dashboard menu (Admin settings, User), not the admin menu and nothing per user.
  Mint lays orders over what core renders: the theme's `adminNavOrder` on the admin menu (site wide, not in
  `USER_THEME_FIELDS`), then the user's own order for the page's menu (`navMenuOf`: server, dashboard or admin; the
  setup wizard never) in core's synced user setting `nebula::nav_order` (`{ server?, dashboard?, admin? }`, each a
  `NavOrder`; an empty one is removed). A `NavOrder` is `{ top, sections }`: the top level's ids (links outside a
  section and `section:` ids) and per section its links' ids. Link ids are the link's `to` without a server's id
  (`/server/files`, `/admin/servers/:server`), so one order fits every server. Section ids are the admin category key
  (read from the key the category's fragment gives the divider once flattened, since its label is translated) or the
  divider's label elsewhere. `arrange()` puts known ids in the saved order, an unknown id after the entry core shows
  before it, and leaves entries without an id (plain rules) in their slot, so routes added later or hidden by a role
  never vanish. `arrangeMenu()` applies the orders to the flat nodes before GroupedNav groups them, and closes a
  section with a plain rule when a loose link follows it (it would join the section once grouped again). GroupedNav,
  the top bar (`SidebarShell`) and the bottom bar use it. 'Arrange menu' (a copy of core's link button at the end of
  the menu, an icon in the top bar, a `RailTip` style tooltip in the slim rail) opens a modal with core's drag and
  drop kit: links and whole sections at the top level, links inside their section (nested `DndContainer`s).
  Core keeps links the user may not open in the menu inside `ServerCan`, which renders nothing, so the modal renders
  each link's wrappers with a marker in a hidden probe first and lists only links that left one; the list is read once
  per open. A save is merged into the previous order (`mergeNavOrder`), so ids not on screen (another egg's links)
  keep their place. The editor's Menu order section arranges `adminNavOrder` over the admin menu GroupedNav publishes
  beside the editor (`publishAdminMenu`), as core renders it for the signed in admin. Above it, `userArrange` (theme,
  site wide, `{ server, dashboard, admin }` booleans, all true by default) turns users' arranging off per menu, admins
  included: `useNavOrders()` reports `arrangeable`, ArrangeMenu renders nothing and the user's saved order is ignored,
  not deleted, so turning it back on restores it. The menu is drawn in the browser, so writing `nebula::nav_order`
  through core's settings API cannot get around it.
- A second `Sidebar.addPropsInterceptor` (`withNavSearch`, `elements/sidebar/NavSearch.tsx`) walks the routers'
  header and footer fragments and swaps core's `QuickActionsTrigger` and footer `ServerSwitcher` in place (by
  identity) for `NavSearch` and `NavSearchFooter`, which read `searchComponent` live. 'palette' renders core's
  own elements, 'serverSelector' moves core's switcher to the top, 'searchBar' is a combobox over the user's
  servers (in the admin area every server and user the admin may read) whose last row opens core's palette
  with the query (`useQuickActionsStore` `setQuery`/`setOpen`). The palette registers its own shortcut, so it
  works in every mode. In the slim rail both fold to an icon that opens the palette (`#` is its server search).
  The search box is a `role=combobox` with `aria-expanded`; its three result lists use `useQuery` with a 150 ms
  debounce, and the first row (announced through `aria-activedescendant`) is auto-selected only once the
  results belong to the current term and none is loading or placeholder data, so Enter never opens a stale
  result. Escape on a closed list clears the query.
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
  received, wrappers kept, so a `ServerCan` without access renders nothing and the next link fills in. Links come
  first and Menu last in the DOM; links past the fourth are hidden (`[&>a:nth-of-type(n+5)]:hidden`). Both get a
  focus-visible outline, with `!` because core's `button:focus` reset is unlayered. Server pages prefer Home, Console,
  Files, Backups, Settings; the admin area Back, Overview, Servers, Users; the dashboard Servers, Account, Admin. A menu
  with an order (the site's or the user's, see Menu order) gives its own first links instead, after the header's. Core
  keeps the drawer's open state inside the Sidebar, so Menu clicks core's own floating menu button: the bar renders a
  hidden `[data-nebula-bottom-nav-marker]` just before core's element, Menu looks for
  `.mantine-Card-root > .mantine-ActionIcon-root` among the nodes between the marker and the bar (one console warning
  if none), and app.css hides that card. The bar uses core's `lg:` variant (a container query since 1.2.2), measures itself into
  `--nebula-bottom-nav-h` on html and sets `data-nebula-bottom-nav` while displayed, which app.css turns into bottom
  padding for the content column and a lift for core's `ActionBar`, bottom toasts and the uploads card. 'drawer' returns
  core's element untouched.
- `routes.addServerRouteInterceptor` puts Home at `/` and replaces the console route with a copy
  (`{ ...route, path: '/console', element: ServerConsole }`), never changing it in place: core runs server route
  interceptors on its shared route objects in ServerRouter, the quick actions palette and the egg configuration
  editor. `ServerConsole` is core's terminal with the `consoleLayout` widgets (`elements/console/`) in rows
  above and below it and in columns beside it, which stack under it below `lg` (`xl` when both are used).
  Core's `ServerStats` only exports all three charts together, so `ConsoleChartsProvider` runs core's
  `useStreamChart` for each and feeds them the same way, and `ChartsWidget` renders core's `ChartBlock`/`StreamChart`
  from that context. The provider wraps the whole page, above the slots, so a chart moved to another slot (a
  remount) keeps its history. Core's `statBlocks` slot follows the last chart run, or the extension cards when no
  chart is placed. The default is the page from before. `PowerButtons` (in `HeroCard`, so on Home and the
  console's banner widget) renders core's `pages.server.console.powerButtonComponents` prepended and appended
  slots as core's `ServerPowerControls` does, and closes the kill confirmation when the server goes offline.
  Paths are also the keys of an egg configuration's `routeOrder`, and core hides (sidebar and router) every named
  route the order leaves out. `ConsoleRouteOrder` (`pages.global.prependComponent`, inside core's server store
  provider) subscribes to the server store and, inside `setServer`, fixes such orders both ways
  (`withConsoleRoute` in `lib/routeOrder.ts`, `tests/routeOrder.test.ts`): an order with `/` but no `/console`
  (saved without Mint) gets `/console` right after `/`, and one with `/console` but no `/` gets `/` right before
  `/console`, because Home is the server root that core's links and its `ServerStateGuard` send users to. Orders
  with both or neither come back unchanged (same reference). So Home and the console can only be hidden together
  through the route order.
  While a server installs, restores or transfers (`server.status !== null || server.isTransferring`), core's
  `ServerStateGuard` blocks every page except the server root, so Home always shows its console card then
  (whatever the Home layout says; `normalizeTheme` keeps every card in the layout) and hides the 'Full log' link
  (a Mantine `Anchor component={Link}`). `elements/console/ConsoleFallback.tsx` sends the console there meanwhile:
  core's `isConflictingState` (which also covers a suspended server for non admins), minus node maintenance and
  failed installs or restores, which block the root too. A `Sidebar.Link` render interceptor (registered before
  `RailTip`, so it gets core's element; only links to a `/server/<id>/console` path read the server store) points
  the open server's Console link to the server root with `end`, so it lights up with Home there only.
  `ConsoleRedirect` (`pages.server.prependComponent`, which core's ServerRouter renders beside its `<Routes>`, whose
  layout route is `ServerStateGuard`, not under it) replaces a visit to the open server's exact console path (uuid
  or short id) with the root via `useNavigate` in a layout effect; core's `HistoryRouter` applies it in a transition,
  so the block screen may show for a frame.
  Home's Information and Network cards, `HeroCard`'s allocation pill, the console's `InfoWidget` and
  `ServerCard` mask allocation and SFTP addresses with `shownAddress(value, useRedactAddresses())`
  (`lib/redact.ts`), following core's 'Hide server addresses' user setting (`app::redact_addresses`, read directly
  because core's own helper only exists from 1.2.3; never set on older panels). `CopyOnClick` still copies the
  raw value.
- `pages.dashboard.account.container` hides the account title and prepends `ProfileCard`. The banner
  (`backend/src/banner.rs`) is `GET/PUT/DELETE /api/client/extensions/dev.caloptreyx.mint/banner` (GET needs
  `settings.read`; PUT and DELETE the avatar route's checks, `account.avatar`; activity `mint:banner.update|delete`).
  Each upload is re-encoded to a 1500x500 JPEG (cropped to 3:1 around the centre, transparency laid over grey 128)
  at a new `publicdata/nebula/banners/<user>/<random>.jpg` (the storage prefix core serves for extensions), and the
  previous file is removed. The backend writes the file's absolute URL plus `?v=<millis>` into core's user setting
  `nebula::account_banner` itself (under core's settings lock; a failed save removes the new file): the format 2.0
  wrote and reads, so rolling back keeps every banner. GET and the cleanup use only the value's path suffix
  (`publicdata/nebula/banners/<user>/<name>.jpg` or legacy `<user>.jpg`, any host or prefix; a bare path from
  2.1 pre-releases too), and GET rebuilds the URL from the current storage settings. Only the user's own files
  are ever deleted (`owned()`),
  since users can write their own settings through core's API. A User after-delete handler removes the user's
  banners in a background task (failures only logged). `ProfileCard` fetches GET whenever the setting changes, shows
  no default banner while it loads, still checks the URL with `SAFE_URL`, and after an upload sets the returned URL
  and `setSaved(value)` to keep core's synced store in step; nothing else reads the stored format. The avatar opens core's
  `AvatarContainer` in a modal; `app.css` hides the grid copy (`.order-60`).
- Presets, users' own themes and the theme history (`backend/src/presets.rs`, `history.rs`, `lib/library.ts`,
  `elements/library/`). Custom presets are full normalized themes in the `presets` setting
  (`{ custom: [{ id, name, theme, users }], builtin: [id] }`, at most 20, each theme under the theme PUT's
  64 KiB and all four times that; built-in ones are only ids, `builtinId()` slugs of `PRESETS` names).
  Admin API under `/api/admin/extensions/dev.caloptreyx.mint/presets`: GET (`settings.read` or `mint-theme.update`), POST,
  and PATCH/DELETE `/{id}` (`settings.update` or `mint-theme.update`, activity `mint:preset.create|update|delete`); a built-in id can
  only toggle `users` (a `theme` gets 400). PATCH on a custom preset may also replace its `theme` (checked like
  POST, id kept so users' picks follow it); the editor's custom preset cards offer 'Save draft into this preset'
  with a confirmation, sending `{ theme: normalizeTheme(draft) }`. Applying a preset in the editor lays its
  **look** over the draft (`pickUserTheme()`); the card's name and swatches are one 'Apply {name}' button.
  The user selectable ones (custom ones with their theme) come from
  `GET /api/client/extensions/dev.caloptreyx.mint/theme-choices` (any signed in user, so visitors never get preset
  themes): `watchUserTheme()` fetches them through axiosInstance at startup when a user is signed in and on each
  sign-in or user switch, drops answers that arrive after sign-out or a switch, and caches them in
  `nebula:theme-choices` (kept when the fetch fails or nobody is signed in). `setChoicesFromLibrary()` refreshes
  them after every preset change in the editor. Users pick one in `ThemeChoiceCard`, appended to core's account grid through
  `pages.dashboard.account.accountContainers`, stored in core's synced user setting `nebula::theme_choice`.
  `apply.ts` paints `withUserTheme(site, pick)`: the site theme with only `USER_THEME_FIELDS` (theme.ts)
  taken from the pick, so content, layouts, auth pages and every field not listed stay site wide; a pick no
  longer offered is the site theme. `watchUserTheme()` follows core's user settings store (live, other tabs,
  sign out), and `holdSiteTheme()` forces the site theme on auth pages (`AuthScope`), in the editor and in
  its preview frame (which then shows the draft). Every theme PUT that changes the theme moves the replaced
  one into `theme_history` with who saved it and when (the last 10, and at most 4 × 64 KiB in total, oldest
  dropped first); the editor's clock icon lists them (`GET .../history`, `settings.read` or `mint-theme.update`) and loads one into the draft.
- Theme version and conflicts. `GET /mint/theme` returns `{ theme, version }` (`version` = sha256 hex of the stored
  string, `""` for none), built once per stored string, with `ETag`, `Cache-Control: no-cache` and 304 on a matching
  `If-None-Match`; `loadTheme()` resolves to `{ theme, version }` (or null) and relies on the browser's revalidation.
  The theme PUT body is `{ theme, base? }`: `theme` is required (null resets, missing is 400); a `base` that is not
  the current version gives 409 and saves nothing; success returns `{ version }`. The logic is `routes::store_theme`,
  tested with cargo. `updateTheme(theme | null, base?)` returns that version.
- The editor's layout (`pages/ThemeEditor.tsx`). A top bar holds close, the title with the draft's state (unsaved or
  saved), undo, redo, history, a 'More actions' menu (import, export, Discord support, Reset to default), then 'Apply
  in this browser' (and its Stop while a local theme is active), 'Discard changes' (only while dirty) and Save. Below
  it: the section menu (`elements/editor/EditorNav.tsx`: the settings search on top, then the sections under four
  foldable groups, Look, Navigation, Pages and Interface; a folded group holding the open section keeps its heading
  in the accent colour), the settings panel (the section's title and description, the load and permission notices,
  then `Sections`), the resize handle (`elements/editor/PanelResizer.tsx`: drag, arrow keys, Home/End, double click
  for the default; 320 to 720px, kept per browser in `nebula:editor-width`; the preview frame ignores the pointer
  while it drags) and the preview with its own toolbar. Opening Login, Server home, Console or Servers list points
  the preview at that page. A new section needs its id in `Section` (`Sections.tsx`), an entry in
  `SECTION_GROUPS` (`EditorNav.tsx`) and `editor.section.<id>` plus `<id>Description` keys.
- The editor (`pages/ThemeEditor.tsx`) only saves once `loadTheme()` has returned the stored theme; until then it
  shows a loader, or an error with Retry. It keeps the loaded version and sends it as `base`; a 409 opens a modal to
  reload the stored theme or overwrite it (resent without `base`). A load only replaces the draft if the draft has not
  changed since the request started, and a save only if the draft is the one sent. Unsaved drafts are guarded by
  core's `useBlocker` (in-app navigation, with a confirmation) and react-router's `useBeforeUnload`. Shortcuts
  (core's `useKeyboardShortcuts`): Mod+S saves, also inside inputs; Mod+Z and Mod+Shift+Z undo and redo outside
  text fields, and flush the pending draft first. 'Discard changes' returns to the saved theme; 'Reset to default'
  asks first. `lib/editorDraft.ts` checks the raw draft: URL fields use `elements/editor/UrlInput.tsx`, which flags
  values `SAFE_URL` refuses, and Save is off while any are left; colour inputs convert `#fff`, `rgb()`, `hsl()` and
  the like to `#rrggbb` on blur (not on change, which would break typing) and flag what is still not hex; an import
  needs at least one theme field. Derived colours and contrast warnings use the last valid normalized draft
  (`Sections`' `valid` prop), not the half-typed one.
- `routes.addAdminRoute` adds the editor (`permission: ['settings.read', 'mint-theme.update']`, any of them; core's
  `AdminGuard` lets every role with an admin permission into `/admin`); it is also the extension's
  `cardConfigurationPage`, which core's extensions page gates with `extensions.*`. The close button goes back to
  `/admin/extensions`, or `/admin` without `extensions.*`.
- Permissions (`backend/src/permissions.rs`, `lib/permissions.ts`). `initialize_permissions` adds the admin group
  `mint-theme` with `update` (core's `add_admin_permission_group`, since 1.2.0; core's role editor shows it as MINT
  THEME with the palette icon from `enterPermissionIcons`). `can_update()` (theme PUT, preset POST/PATCH/DELETE)
  takes `settings.update` or `mint-theme.update`, `can_read()` (presets and history GET) `settings.read` or
  `mint-theme.update`; both refuse with the first one's core error (`... this action: settings.update`), so a role
  can save the theme without being able to change panel settings. The editor asks `useCanSaveTheme()` (core's
  `useAdminCan`, true for admins): without it Save (Mod+S too), the conflict's Overwrite and every preset change
  ('Save as preset', save into, rename, delete, the users toggles) are off with `editor.noPermission` as their
  tooltip and as a line in the Presets section and above the settings panel; drafts, presets applied to the draft,
  history loads, import and export still work.
- 'Apply in this browser' (`localTheme.*`). The editor's top bar button stores `normalizeTheme(draft, saved)` in
  `nebula:local-theme`; `apply.ts` paints `paintedTheme(saved, local, choices, pick)`: the local theme stands in for
  the site theme in this browser only (auth pages included, `holdSiteTheme()` holds it too), users' picks still go
  over it. It is read with `parseLocalTheme()` (normalizeTheme, the security boundary) at startup, where it also
  skips the first visit guard, and from other tabs' `storage` events (removal included). The preview frame keeps
  painting drafts. `LocalThemeNotice` (`global.appendComponent`) shows a card in the bottom right corner while one
  is active, with Stop (`clearLocalTheme()`); z-80 keeps it under core's ActionBar and toasts, app.css lifts it over
  the bottom bar, and it never renders in the preview frame. The editor shows the same state with its own Stop.
  `siteTheme()` (local ?? saved) is what the account page's theme choice shows as the panel default.
- The editor's search (`elements/editor/SettingsSearch.tsx`, `lib/editorSearch.ts`) runs over `SETTINGS`, a
  hand kept index: each setting's section, its label key and the keys of its descriptions, headings and options
  (a key ending in `.` takes every key under it), searched in the current language and in English. A result
  opens the section and `revealLabel()` scrolls to the innermost element whose text is exactly the label and
  flashes it (`data-nebula-search-hit`, app.css), so the label must render as is; it retries for 2s for
  sections that fetch first; it then focuses the matching control (with `preventScroll`; the scroll is instant
  under reduced motion). A new editor field goes into `SETTINGS` too.
- `pages.dashboard.home.enterContainerAll(...).addPropsInterceptor` replaces the servers list. The
  list route is hardcoded in the panel's router, so this props interceptor (it can replace `children`
  and `title`) is the only runtime way in. Its sort, grouping and status filter (`elements/dashboard/serverOrder.ts`,
  tested in `tests/serverOrder.test.ts`) take each server's status from `rowStatus(server, usage)`: suspended
  first, then the panel's `server.status`, then the node's live state from core's `serverResourceUsage` (null
  until reported). The list reads that usage only when `needsUsage(sort, group, filter)` and passes it in as an
  argument (React Compiler), and while it needs it subscribes the loaded servers' nodes itself (`subscribeToNode`).
  Core's servers API has no sort parameter, so while an ordering is active and the list has 2 to 10 API pages
  (`FETCH_ALL_MAX_PAGES`) every page is fetched in parallel and paged in the browser (changing an ordering goes back
  to page 1); above that, or if the fetch fails, only the loaded page is ordered and `servers.pageOnly` says so.
  Row and card badges come from `StatusBadge.tsx`. `ServerRow` is a real `NavLink` on the name with an
  `after:absolute after:inset-0` overlay (as `ServerCard`), with the checkbox above it. `ServerCard`'s power menu
  copies core `ServerItem`'s permission (`control.*`) and state checks, including Kill (confirmed) while stopping.
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
  setting. A user only ever receives buttons of announcements core shows them: the client GET
  `/api/client/extensions/dev.caloptreyx.mint/announcement-ctas` (any signed in user, since announcements only show
  in the signed in layout) returns those of `Announcement::all_by_active` (enabled, in their window, not scoped to a
  location, node, backup configuration or egg), and `/api/client/servers/{server}/extensions/dev.caloptreyx.mint/announcement-ctas`
  (`add_client_server_api_router`, so core's server access middleware runs, which is all core's server announcements
  route asks for) those of `all_by_active_server`. Both use core's query under core's cache key (60 s), so they follow
  exactly what core serves; `only_shown()` is the cargo tested filter. Admin side: `GET .../announcement-ctas/{announcement}`
  (`announcements.read`, the stored button whatever its announcement's state) and `PUT .../announcement-ctas`
  (`announcements.update`, same checks as `SAFE_URL`, URL up to 500 UTF-16 units on both sides); the PUT prunes
  buttons of deleted announcements by looking up only the stored uuids on the write pool. The admin
  side is a tab added with `pages.admin.announcements.view.subNavigation.addItemInterceptor`
  (`elements/announcements/AnnouncementCtaTab.tsx`). Users see announcements through core's
  `DismissibleAnnouncementAlert`, which is not hookable, but the `Alert` it renders is: `Alert.addPropsInterceptor`
  appends `AnnouncementCtaButton` to alerts with a string title and a markdown body, and that matches the
  alert back to its announcement (`lib/cta.ts` `matchAnnouncement()`: title, content and colour in the current
  language; two identical announcements get no button). Server scoped announcements live in the server store,
  which throws outside the server router, so a `ServerContentContainer` render interceptor provides them and the
  server's uuid through a context. An alert matching a global announcement takes its button from the global map, one
  matching a server scoped announcement from that server's map. `lib/ctaStore.ts` fetches each once per page load (a
  failed fetch is forgotten, so the next caller retries); only the global map is cached in localStorage and follows
  other tabs' `nebula:announcement-ctas` writes, server maps stay in memory. A save in the admin tab refetches the
  global map and drops the server maps instead of writing the button in. The admin tab is locked after a failed load
  (switch, inputs and Save disabled) until 'Try again' succeeds.
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
action bar, stats hooks and the drag and drop kit. Every core import goes through `frontend/src/lib/core.ts`,
a single re-export module, so the paths Mint depends on are in one place and a core move is one edit. It uses
the nested paths where they exist in 1.2.0; the flat deprecated shim paths remain only where the nested path
does not exist in 1.2.0. Check a path against the floor with `git show release-1.2.0:<path>` in a panel
checkout. Page level imports (`@/pages/server/console/...`) are why the floor is 1.2.0.

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
in `tests/cta.test.ts`, presets, user choices and history in `tests/library.test.ts`, the editor search in
`tests/editorSearch.test.ts`, the editor's draft checks in `tests/editorDraft.test.ts`, the local theme in
`tests/localTheme.test.ts`, the side menu orders in `tests/navOrder.test.ts`, the servers list
ordering in `tests/serverOrder.test.ts` and the route order fix in `tests/routeOrder.test.ts` (plain `node:test`, no
dependencies, kept outside `frontend/src` so the panel never compiles them). Run them with
`node --test "tests/*.test.ts"` (Node 24 strips the types; a bare `tests/` is not accepted as a path). Add a
case there whenever a theme field or a validation helper changes; a new theme field that users should get
from a picked preset also goes into `USER_THEME_FIELDS`.

Everything else needs the panel: stage the extension into a panel checkout and run the real
toolchain; there is no standalone build. CI does this on every push (`.github/workflows/check.yml` calls
`Caloptreyx/.github/.github/workflows/extension-check.yml`, shared by every extension repo): on a
Blacksmith runner it stages the extension into the newest `release-*` tag of `calagopus/panel` and runs the
node tests, `pnpm typecheck`, `biome check`, `pnpm build` and `cargo test -p dev_caloptreyx_mint`. Push and
read that run to verify a change; build by hand only when CI can't answer (a running panel, CI down), since
builds are kept off the development VM:

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

Pushing a `v*` tag runs `.github/workflows/release.yml`: the shared extension check (the same job as CI),
then a check that the tag is `v` + `version` in `backend/Cargo.toml` (it fails otherwise, so bump that
first), the packaging script, then it creates the GitHub release `Mint Theme <version>` with generated
notes if missing and uploads the zip (`gh release upload --clobber`).

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
