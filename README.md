# Unnamed AMOLED Theme

Pure black (`#000000`) themes for VS Code and Cursor with neon accents. Every surface — editor, sidebar, panels, title bar — is true black, so pixels stay off on OLED screens. Each variant uses its accent for keywords and UI highlights, and a varied palette for the rest of the syntax.

| Theme | Accent | Notes |
|-------|--------|-------|
| Unnamed AMOLED Neon Red | `#ff1a3c` | Default |
| Unnamed AMOLED Laser | `#ff0033` | Brightest red, highest contrast |
| Unnamed AMOLED Crimson | `#e0103a` | Slightly warmer red |
| Unnamed AMOLED Blood | `#c8102e` | Dimmer text and accents, low glare |
| Unnamed AMOLED Green | `#00ff88` | Neon green |
| Unnamed AMOLED Blue | `#3d9bff` | Electric blue |
| Unnamed AMOLED Cyan | `#00e5ff` | Ice cyan |
| Unnamed AMOLED Purple | `#c04dff` | Neon violet |
| Unnamed AMOLED Pink | `#ff2e97` | Hot pink |
| Unnamed AMOLED Orange | `#ff8c1a` | Amber orange |
| Unnamed AMOLED Gold | `#ffd60a` | Bright yellow |
| Unnamed AMOLED White | `#ffffff` | Monochrome UI, pastel syntax, bold keywords |

## Install

Build, package and install in one step:

```sh
npm run install-cursor   # Cursor
npm run install-code     # VS Code
```

Then run **Developer: Reload Window**, open **Preferences: Color Theme** (`Ctrl+K` `Ctrl+T`) and pick one of the themes above.

To install on another machine or editor, copy `unnamed-amoled-theme-1.0.0.vsix` and use **Extensions: Install from VSIX...**, or run `<editor> --install-extension unnamed-amoled-theme-1.0.0.vsix --force` (`code`, `code-insiders`, `codium`, `cursor`, `windsurf`).

To try changes without installing, press `F5` in this folder to open an Extension Development Host with the themes loaded.

## Tweaking colors

All colors come from `theme.config.json`; the files in `themes/` are generated. After editing, rebuild and reinstall with `npm run install-cursor` (or `npm run install-code` for VS Code), then reload the window. To only regenerate the theme files without installing, run `npm run build`.

- `base` holds colors shared by every variant (background, borders, text, git colors).
- Each entry in `themes` overrides any of those and sets its syntax colors. Add an entry to create a new variant.
- `options` applies to all variants; a theme can override it with its own `options` object.

| Option | Values |
|--------|--------|
| `tabStyle` | `both`, `underline`, `top`, `fill` |
| `selection` | `high` (solid, contrast-checked accent shade), or translucent `subtle`, `medium`, `strong` |
| `statusBar` | `black`, `neon` |
| `neonBorders` | `true` for accent-colored panel borders, `false` for grey |
| `lineHighlight` | Tint the current line |
| `italicComments` | Italic comments |
| `boldKeywords` | Bold keywords |

For a one-off change without rebuilding, override single colors in your user `settings.json`:

```json
"workbench.colorCustomizations": {
  "[Unnamed AMOLED Neon Red]": {
    "statusBar.background": "#ff1a3c"
  }
}
```
