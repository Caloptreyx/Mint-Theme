# Working on this theme

Nebula is a Calagopus Panel extension (`dev.s4way.nebula`). It needs panel **1.2.0 or newer**.
An extension is a Rust crate plus a TypeScript frontend that the panel compiles into itself.

## Layout

```
Metadata.toml              package name, display name, panel version range
backend/src/lib.rs         Extension impl: mounts the routers, hands over the settings deserializer
backend/src/settings.rs    one opaque setting, `theme`, holding the editor's JSON
backend/src/routes.rs      GET /nebula/theme (public) and PUT /api/admin/.../theme (settings.update)
backend/src/banner.rs      per user account banner upload/remove (client API)
frontend/src/index.ts      entry point: hooks, route interceptors, Mantine theme
frontend/src/lib/theme.ts  the theme model, normalizeTheme() and buildCss()
frontend/src/lib/apply.ts  applies CSS, caches it, live preview bridge, useNebulaTheme()
frontend/src/pages/        ServerHome, ServerConsole, ServerList (dashboard), ThemeEditor
frontend/src/elements/     account/, home/, dashboard/, editor/, sidebar/ pieces
frontend/src/app.css       static CSS: @font-face, flush sidebar, active link, sidebar sections
frontend/src/translations.ts  every user facing string
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
- Button styles (solid, tinted, outline, glass) are CSS rules keyed off `--button-bg`, the per-colour
  value Mantine sets inline. That keeps red and green buttons their own colour.
- `buttonColor` redefines the accent variables **on the button element**, so the inline
  `var(--mantine-color-blue-filled)` reference resolves to it without touching anything else.

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
- `routes.addServerRouteInterceptor` puts Home at `/` and moves the console to `/console`, swapping its
  element for `ServerConsole`: the Home banner with live stat pills, then core's terminal and charts.
- `pages.dashboard.account.container` hides the account title and prepends `ProfileCard`. The banner is
  uploaded to `PUT/DELETE /api/client/extensions/dev.s4way.nebula/banner` (`backend/src/banner.rs`, the
  avatar route's checks, re-encoded to a 1500x500 JPEG at `publicdata/nebula/banners/<user>.jpg`, the
  storage prefix core serves for extensions). Its URL sits in core's synced user settings
  (`nebula::account_banner`) and is still checked with `SAFE_URL` before use. The avatar opens core's
  `AvatarContainer` in a modal; `app.css` hides the grid copy (`.order-60`).
- `routes.addAdminRoute` adds the editor; it is also the extension's `cardConfigurationPage`.
- `pages.dashboard.home.enterContainerAll(...).addPropsInterceptor` replaces the servers list. The
  list route is hardcoded in the panel's router, so this props interceptor (it can replace `children`
  and `title`) is the only runtime way in.

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
- Keep custom CSS minimal; use panel components and Tailwind utilities with Mantine variables.

## Verifying a change

Stage the extension into a panel checkout and run the real toolchain; there is no standalone build.

```
cp -r frontend/.  <panel>/frontend/extensions/dev_s4way_nebula/
cp -r backend/.   <panel>/backend-extensions/dev_s4way_nebula/
cp Metadata.toml  <panel>/backend-extensions/dev_s4way_nebula/
cd <panel>/frontend && pnpm typecheck && pnpm exec biome check --write extensions/dev_s4way_nebula && pnpm build
cd <panel> && SQLX_OFFLINE=true cargo test -p dev_s4way_nebula
```

Sync any biome fixes back, then clean the panel checkout (remove the staged folders,
`frontend/public/translations/en`, and `git checkout -- Cargo.lock frontend/pnpm-lock.yaml`).

To run it: the backend extension must be registered with `panel-rs extensions resync` (it rewrites
`backend-extensions/internal-list`), then `pnpm build`, `touch shared/src/lib.rs`, `cargo build`,
restart. The frontend is embedded into the binary at compile time, so a `pnpm build` alone changes
nothing.

Package for release with a zip of the source (directory entries first, then files, excluding
`node_modules`, `target`, `dist`, `docs`, `README.md`, `.gitignore`) named `*.c7s.zip`, and check it
with `panel-rs extensions inspect`.

## Gotchas found the hard way

- `Progress` shows an hourglass and a label inside the bar by default and forces `size='xl'`; pass
  `hourglass={false} withLabel={false}` for a plain bar.
- `CopyOnClick` renders a `<button>`, which centres its text. Pass `className='text-left!'` in a grid.
- Calling `stopPropagation()` on a click around a checkbox also swallows React's synthetic change
  event. Let the click bubble and ignore it by target instead (`closest('[data-row-select]')`).
- `Children.toArray` does not flatten fragments, and the routers wrap menus in them; flatten yourself.
- A table header and its rows must share one grid definition (`ROW_GRID`) or the columns drift.

## Known issue

Ticking a row checkbox on the dashboard updates the selection, but the floating bulk action bar does
not appear yet.
