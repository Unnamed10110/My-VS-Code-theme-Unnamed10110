# Unnamed AMOLED Theme

Pure black (`#000000`) themes for VS Code and Cursor with neon red accents. Every surface — editor, sidebar, panels, title bar — is true black, so pixels stay off on OLED screens.

| Theme | Accent | Notes |
|-------|--------|-------|
| Unnamed AMOLED Neon Red | `#ff1a3c` | Default |
| Unnamed AMOLED Laser | `#ff0033` | Brightest, highest contrast |
| Unnamed AMOLED Crimson | `#e0103a` | Slightly warmer |
| Unnamed AMOLED Blood | `#c8102e` | Dimmer text and accents, low glare |

## Install

```sh
npm run install-cursor   # or: npm run install-code
```

Then run **Preferences: Color Theme** and pick one of the themes above.

To try changes without installing, press `F5` in this folder to open an Extension Development Host with the themes loaded.

## Tweaking colors

All colors come from `theme.config.json`; the files in `themes/` are generated. After editing, run:

```sh
npm run build
```

- `base` holds colors shared by every variant (background, borders, text, git colors).
- Each entry in `themes` overrides any of those and sets its syntax colors. Add an entry to create a new variant.
- `options` applies to all variants; a theme can override it with its own `options` object.

| Option | Values |
|--------|--------|
| `tabStyle` | `both`, `underline`, `top`, `fill` |
| `selection` | `subtle`, `medium`, `strong` |
| `statusBar` | `black`, `neon` |
| `neonBorders` | `true` for red panel borders, `false` for grey |
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
