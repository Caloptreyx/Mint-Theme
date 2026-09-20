# Nebula Theme for Calagopus

A dark navy theme for Calagopus Panel with a built-in visual theme editor.

## Preview

| Server list | Server home |
| --- | --- |
| ![Server list](docs/dashboard.png) | ![Server home](docs/server-home.png) |

| Grid view | Theme editor |
| --- | --- |
| ![Grid view](docs/dashboard-grid.png) | ![Theme editor](docs/theme-editor.png) |

## Requirements

Calagopus Panel 1.2.0 or newer.

## Install

1. Download `dev_s4way_nebula.c7s.zip` from the [latest release](../../releases/latest).
2. In the panel go to Admin, then Extensions, and install the file.
3. Restart the panel when it asks you to.

## What it changes

- Colours, corner rounding and bundled fonts (Exo 2, Montserrat), with four button styles.
- Server list as a table or a grid, with search, a status filter and per egg artwork.
- A server home page: banner, server information, installed game, console, usage and network cards.
- Sidebar sections that collapse, named from the panel's own route order.

## Theme editor

Admin, then Theme Editor (the extension's configure button opens the same page). It covers presets,
the full colour palette, fonts and corners, the background image, per egg banners and icons, the
getting started links and which cards the home page shows, with a live preview of the real panel.
Saving applies the theme for everyone, including the login page.

## Credits

Built by wrrfsub, co-authored with Claude (Anthropic). The whole theme was written with Claude.

## Support

This is provided as is. I do not promise updates, fixes, or support for future panel versions.

## Licence

The code is covered by [LICENSE](LICENSE). The bundled fonts are licensed under the SIL Open Font
License; their licences ship next to them in `frontend/src/fonts/`.
