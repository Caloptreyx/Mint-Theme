<div align="center">

# Mint Theme for Calagopus

A dark theme for [Calagopus Panel](https://calagopus.com) with a live, built-in theme editor.

[![Calagopus 1.2.0+](https://img.shields.io/badge/Calagopus-1.2.0%2B-3b6cde)](https://calagopus.com)
[![Latest release](https://img.shields.io/github/v/release/Caloptreyx/Mint-Theme?label=release)](https://github.com/Caloptreyx/Mint-Theme/releases/latest)
[![License: MIT](https://img.shields.io/github/license/Caloptreyx/Mint-Theme)](LICENSE)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-D97757?logo=claude&logoColor=white)](https://claude.com/claude-code)

<img src="docs/server-home.png" alt="Server home page" width="100%">

</div>

## Features

- **Server list**: a table with game, status, location, CPU, RAM and uptime, or a grid of cards with
  each game's banner and icon. Search and a status filter included. Tick servers (or select all in the
  table header) in either view to start, restart or stop them together from the bulk action bar. On
  phones the table keeps the name and status, and the columns come back as the screen widens. The grid's
  cards come as the default art header, a banner strip, flat, linear rows, minimal or compact tiles, and
  a table style turns every row of the panel's tables (files, backups, databases, admin lists, this list)
  into a card of its own.
- **Server home**: a new landing page with a banner header, power controls, server info, image switcher,
  console preview, usage and network. Admins choose which cards show and in what order.
- **Console**: by default the banner with live stats on top, a full width terminal, then the charts. Admins
  arrange the banner, stat tiles, server info, each chart and other extensions' cards above, beside or below
  the terminal.
- **Account page**: a profile header with a banner each user uploads themselves. Click the avatar to
  change it.
- **Sidebar**: optional collapsible sections, named from each egg's own menu dividers. On desktop the menu
  sits flush, floats as a card or a rounded pill with a slim top bar, shrinks to an icon rail with
  tooltips, or turns into a top bar with the sections as dropdowns. The logo, search and server block
  (name, status, power buttons) can move out of it into a header or a floating bar above the pages.
- **Menu links and search**: menu links can highlight filled, as a pill, or with just the icon in a tile, and
  the top of the menu can hold Quick actions, a server selector or a search bar for servers (and users, for
  admins).
- **Announcement buttons**: give any panel announcement a call to action button with its own text and
  link, shown under the announcement on the dashboard and server pages.
- **Login pages**: login, registration and password pages in core's card, flat, beside a full height or
  floating image banner, or in one panel with the banner, with the logo in a top bar or above the form and
  up to four support links (Discord, GitHub, docs, status and more).
- **Theme editor**: a full screen editor with a live preview of the real panel, in dark or light mode.
  Presets, the full colour palette with its own light mode colours, fonts (plus a monospace font for
  code and the console), corner radius, button styles, block transparency with an optional glass blur,
  block and input borders, a click effect, a glassy toast style, page transitions, optional server page
  titles, card title styles (line, fill, pill), stat card styles, server card and table styles, background
  image, a login page background
  and logo, per game artwork, getting started links and
  the home layout. Undo, redo, import and export.

## Screenshots

| Server list | Grid view |
| --- | --- |
| ![Server list](docs/dashboard.png) | ![Grid view](docs/dashboard-grid.png) |

| Console | Theme editor |
| --- | --- |
| ![Console](docs/console.png) | ![Theme editor](docs/theme-editor.png) |

## Installation

> [!NOTE]
> Requires Calagopus Panel **1.2.0** or newer.

1. Download `dev_s4way_nebula.c7s.zip` from the [latest release](https://github.com/Caloptreyx/Mint-Theme/releases/latest).
2. In the panel, open **Admin → Extensions** and install the file.
3. Restart the panel.

The extension is listed as **Mint Theme** (`dev.s4way.nebula`). The ID keeps the project's original name
so existing installs update in place.

## Usage

Open **Admin → Theme Editor**. Every change previews live, and **Save** applies it for all users,
including on the login page.

To add a button to an announcement, open **Admin → Announcements**, pick one and switch to its
**Call to Action** tab.

The theme changes the panel at runtime and never overrides core files, so disabling the extension
brings back the stock panel.

## Contributing

[AGENTS.md](AGENTS.md) explains how the theme is built, how it hooks into the panel and how to test a
change. It is written for people and AI assistants alike.

## Notes

Built with Claude Code. Provided as is, with no promise of updates.

## License

Code is [MIT](LICENSE). The bundled fonts (Exo 2, Montserrat, Outfit, Plus Jakarta Sans, Space Grotesk,
JetBrains Mono, Fira Code) are under the SIL Open Font License 1.1;
their licence texts are in [`frontend/src/fonts`](frontend/src/fonts).
