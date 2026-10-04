#!/usr/bin/env node
// Generates themes/*.json from theme.config.json and keeps package.json's
// contributes.themes in sync. Run with `npm run build`.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "theme.config.json"), "utf8"));

const PALETTE_KEYS = [
  "bg", "surface", "elevated", "border", "fg", "muted", "accent", "accentText",
  "keyword", "string", "func", "number", "constant", "type", "comment", "variable",
  "parameter", "property", "operator", "added", "modified", "error",
];

const DEFAULT_OPTIONS = {
  tabStyle: "both",
  selection: "high",
  neonBorders: true,
  statusBar: "black",
  lineHighlight: true,
  italicComments: true,
  boldKeywords: false,
};

const OPTION_VALUES = {
  tabStyle: ["underline", "top", "both", "fill"],
  selection: ["subtle", "medium", "strong", "high"],
  statusBar: ["black", "neon"],
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function rgb(hex) {
  const h = hex.replace("#", "").slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function toHex(v) {
  return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
}

function alpha(hex, a) {
  return hex.slice(0, 7) + toHex(a * 255);
}

function mix(a, b, t) {
  const x = rgb(a);
  const y = rgb(b);
  return "#" + x.map((v, i) => toHex(v + (y[i] - v) * t)).join("");
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Solid, partly desaturated accent shade. Picks the darkness that best balances
// three targets: syntax colors on it >= 3:1, the selection itself >= 2:1 against
// the background, and foreground on it >= 5:1.
function solidSelection(p) {
  const syntax = [p.keyword, p.string, p.func, p.type, p.number, p.constant, p.variable, p.parameter, p.property, p.operator];
  const tint = mix(p.accent, "#808080", 0.35);
  let best = { sel: tint, score: -1 };
  for (let t = 0.2; t <= 0.9; t += 0.01) {
    const sel = mix(tint, "#000000", t);
    const minSyntax = Math.min(...syntax.map((c) => contrast(c, sel)));
    const score = Math.min(minSyntax / 3, contrast(sel, p.bg) / 2, contrast(p.fg, sel) / 5);
    if (score > best.score) best = { sel, score };
  }
  return best.sel;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function resolvePalette(theme) {
  const p = { ...config.base, ...theme.palette };
  const problems = [];
  for (const key of PALETTE_KEYS) {
    if (!(key in p)) problems.push(`missing "${key}"`);
    else if (!HEX.test(p[key])) problems.push(`"${key}" must be #rrggbb, got ${JSON.stringify(p[key])}`);
    else p[key] = p[key].toLowerCase();
  }
  for (const key of Object.keys(p)) {
    if (!PALETTE_KEYS.includes(key)) problems.push(`unknown palette key "${key}"`);
  }
  if (problems.length) throw new Error(`Theme "${theme.label}": ${problems.join("; ")}`);
  return p;
}

function resolveOptions(theme) {
  const o = { ...DEFAULT_OPTIONS, ...config.options, ...theme.options };
  for (const [key, allowed] of Object.entries(OPTION_VALUES)) {
    if (!allowed.includes(o[key])) {
      throw new Error(`Theme "${theme.label}": option "${key}" must be one of ${allowed.join(", ")}`);
    }
  }
  return o;
}

function buildColors(p, o) {
  const sel = { subtle: 0.2, medium: 0.32, strong: 0.2, high: 0 }[o.selection];
  const highSel = o.selection === "high";
  const selBg = highSel ? solidSelection(p) : alpha(p.accent, sel);
  const selInactive = highSel ? mix(selBg, p.bg, 0.35) : alpha(p.accent, sel * 0.6);
  const line = o.neonBorders ? alpha(p.accent, 0.45) : p.border;
  const none = "#00000000";
  const tabBottom = o.tabStyle === "underline" || o.tabStyle === "both" ? p.accent : none;
  const tabTop = o.tabStyle === "top" || o.tabStyle === "both" ? p.accent : none;
  const tabActiveBg = o.tabStyle === "fill" ? alpha(p.accent, 0.16) : p.bg;
  const sbBg = o.statusBar === "neon" ? p.accent : p.bg;
  const sbFg = o.statusBar === "neon" ? p.accentText : p.muted;

  return {
    focusBorder: p.accent,
    foreground: p.fg,
    descriptionForeground: p.muted,
    errorForeground: p.error,
    "icon.foreground": p.muted,
    "selection.background": selBg,
    "widget.shadow": none,
    "widget.border": line,
    "sash.hoverBorder": p.accent,
    "textLink.foreground": p.accent,
    "textLink.activeForeground": p.property,
    "textPreformat.foreground": p.string,
    "window.activeBorder": line,
    "window.inactiveBorder": p.border,

    "titleBar.activeBackground": p.bg,
    "titleBar.activeForeground": p.fg,
    "titleBar.inactiveBackground": p.bg,
    "titleBar.inactiveForeground": p.muted,
    "titleBar.border": line,
    "menubar.selectionBackground": alpha(p.accent, 0.2),
    "menubar.selectionForeground": p.fg,
    "menubar.selectionBorder": p.accent,
    "menu.background": p.elevated,
    "menu.foreground": p.fg,
    "menu.selectionBackground": alpha(p.accent, 0.45),
    "menu.selectionForeground": p.fg,
    "menu.separatorBackground": line,
    "menu.border": line,

    "activityBar.background": p.bg,
    "activityBar.foreground": p.accent,
    "activityBar.inactiveForeground": p.muted,
    "activityBar.activeBorder": p.accent,
    "activityBar.border": line,
    "activityBarBadge.background": p.accent,
    "activityBarBadge.foreground": p.accentText,

    "sideBar.background": p.surface,
    "sideBar.foreground": p.fg,
    "sideBar.border": line,
    "sideBarTitle.foreground": p.muted,
    "sideBarSectionHeader.background": p.surface,
    "sideBarSectionHeader.foreground": p.accent,
    "sideBarSectionHeader.border": line,

    "list.activeSelectionBackground": alpha(p.accent, 0.45),
    "list.activeSelectionForeground": p.fg,
    "list.inactiveSelectionBackground": alpha(p.accent, 0.28),
    "list.inactiveSelectionForeground": p.fg,
    "list.hoverBackground": alpha(p.fg, 0.06),
    "list.hoverForeground": p.fg,
    "list.focusOutline": p.accent,
    "list.focusBackground": alpha(p.accent, 0.4),
    "list.highlightForeground": p.accent,
    "list.errorForeground": p.error,
    "list.warningForeground": p.modified,
    "tree.indentGuidesStroke": alpha(p.accent, 0.35),

    "editorGroupHeader.tabsBackground": p.bg,
    "editorGroupHeader.tabsBorder": line,
    "editorGroup.border": line,
    "editorGroup.dropBackground": alpha(p.accent, 0.15),
    "tab.activeBackground": tabActiveBg,
    "tab.activeForeground": p.fg,
    "tab.activeBorder": tabBottom,
    "tab.activeBorderTop": tabTop,
    "tab.inactiveBackground": p.bg,
    "tab.inactiveForeground": p.muted,
    "tab.hoverBackground": alpha(p.accent, 0.08),
    "tab.hoverForeground": p.fg,
    "tab.border": line,
    "tab.unfocusedActiveBorder": tabBottom === none ? none : alpha(p.accent, 0.5),
    "tab.unfocusedActiveBorderTop": tabTop === none ? none : alpha(p.accent, 0.5),
    "tab.unfocusedActiveForeground": p.muted,
    "tab.activeModifiedBorder": p.accent,
    "breadcrumb.background": p.bg,
    "breadcrumb.foreground": p.muted,
    "breadcrumb.focusForeground": p.fg,
    "breadcrumb.activeSelectionForeground": p.accent,

    "editor.background": p.bg,
    "editor.foreground": p.fg,
    "editorLineNumber.foreground": p.muted,
    "editorLineNumber.activeForeground": p.accent,
    "editorCursor.foreground": p.accent,
    "editor.selectionBackground": selBg,
    "editor.inactiveSelectionBackground": selInactive,
    "editor.selectionHighlightBorder": highSel ? alpha(p.accent, 0.8) : "#00000000",
    "editor.selectionHighlightBackground": alpha(p.accent, 0.32),
    "editor.wordHighlightBackground": alpha(p.accent, 0.28),
    "editor.wordHighlightStrongBackground": alpha(p.accent, 0.45),
    "editor.findMatchBackground": alpha(p.accent, 0.7),
    "editor.findMatchBorder": p.accent,
    "editor.findMatchHighlightBackground": alpha(p.accent, 0.4),
    "editor.lineHighlightBackground": o.lineHighlight ? alpha(p.accent, 0.12) : none,
    "editor.lineHighlightBorder": o.lineHighlight ? alpha(p.accent, 0.2) : none,
    "editorIndentGuide.background1": alpha(p.fg, 0.18),
    "editorIndentGuide.activeBackground1": alpha(p.accent, 0.5),
    "editorWhitespace.foreground": alpha(p.fg, 0.12),
    "editorRuler.foreground": alpha(p.fg, 0.08),
    "editorBracketMatch.background": alpha(p.accent, 0.5),
    "editorBracketMatch.border": p.accent,
    "editorBracketHighlight.foreground1": p.accent,
    "editorBracketHighlight.foreground2": p.property,
    "editorBracketHighlight.foreground3": p.func,
    "editorBracketHighlight.foreground4": p.type,
    "editorBracketHighlight.foreground5": p.string,
    "editorBracketHighlight.foreground6": p.constant,
    "editorBracketHighlight.unexpectedBracket.foreground": p.error,
    "editorBracketPairGuide.activeBackground1": p.accent,
    "editorBracketPairGuide.activeBackground2": p.property,
    "editorBracketPairGuide.activeBackground3": p.func,
    "editorBracketPairGuide.activeBackground4": p.type,
    "editorBracketPairGuide.activeBackground5": p.string,
    "editorBracketPairGuide.activeBackground6": p.constant,
    "editorBracketPairGuide.background1": alpha(p.accent, 0.3),
    "editorBracketPairGuide.background2": alpha(p.property, 0.3),
    "editorBracketPairGuide.background3": alpha(p.func, 0.3),
    "editorBracketPairGuide.background4": alpha(p.type, 0.3),
    "editorBracketPairGuide.background5": alpha(p.string, 0.3),
    "editorBracketPairGuide.background6": alpha(p.constant, 0.3),
    "editorCursor.background": p.bg,
    "editorOverviewRuler.errorForeground": p.error,
    "editorOverviewRuler.warningForeground": p.modified,
    "editorOverviewRuler.findMatchForeground": p.accent,
    "editorOverviewRuler.selectionHighlightForeground": p.accent,
    "editorOverviewRuler.wordHighlightForeground": alpha(p.accent, 0.7),
    "editorOverviewRuler.bracketMatchForeground": p.accent,
    "editorLink.activeForeground": p.property,
    "editorUnnecessaryCode.opacity": "#000000a0",
    "editorGutter.background": p.bg,
    "editorGutter.addedBackground": p.added,
    "editorGutter.modifiedBackground": p.modified,
    "editorGutter.deletedBackground": p.error,
    "editorError.foreground": p.error,
    "editorWarning.foreground": p.modified,
    "editorInfo.foreground": p.property,
    "editorWidget.background": p.elevated,
    "editorWidget.border": line,
    "editorSuggestWidget.background": p.elevated,
    "editorSuggestWidget.border": line,
    "editorSuggestWidget.foreground": p.fg,
    "editorSuggestWidget.selectedBackground": alpha(p.accent, 0.45),
    "editorSuggestWidget.highlightForeground": p.accent,
    "editorHoverWidget.background": p.elevated,
    "editorHoverWidget.border": line,
    "peekView.border": p.accent,
    "peekViewEditor.background": p.bg,
    "peekViewResult.background": p.surface,
    "peekViewTitle.background": p.elevated,
    "peekViewEditor.matchHighlightBackground": alpha(p.accent, 0.3),
    "peekViewResult.matchHighlightBackground": alpha(p.accent, 0.3),
    "minimap.background": p.bg,
    "minimap.selectionHighlight": alpha(p.accent, 0.5),
    "minimapSlider.background": alpha(p.fg, 0.06),
    "minimapSlider.hoverBackground": alpha(p.accent, 0.2),
    "scrollbar.shadow": none,
    "scrollbarSlider.background": alpha(p.fg, 0.08),
    "scrollbarSlider.hoverBackground": alpha(p.accent, 0.3),
    "scrollbarSlider.activeBackground": alpha(p.accent, 0.5),

    "panel.background": p.surface,
    "panel.border": line,
    "panelTitle.activeForeground": p.fg,
    "panelTitle.activeBorder": p.accent,
    "panelTitle.inactiveForeground": p.muted,
    "terminal.background": p.surface,
    "terminal.foreground": p.fg,
    "terminalCursor.foreground": p.accent,
    "terminal.selectionBackground": selBg,
    "terminal.inactiveSelectionBackground": selInactive,
    "terminal.ansiBlack": "#000000",
    "terminal.ansiRed": p.error,
    "terminal.ansiGreen": p.added,
    "terminal.ansiYellow": p.modified,
    "terminal.ansiBlue": "#7a8cff",
    "terminal.ansiMagenta": p.type,
    "terminal.ansiCyan": "#6fd3df",
    "terminal.ansiWhite": p.fg,
    "terminal.ansiBrightBlack": p.muted,
    "terminal.ansiBrightRed": mix(p.error, "#ffffff", 0.25),
    "terminal.ansiBrightGreen": mix(p.added, "#ffffff", 0.25),
    "terminal.ansiBrightYellow": mix(p.modified, "#ffffff", 0.25),
    "terminal.ansiBrightBlue": "#a3b0ff",
    "terminal.ansiBrightMagenta": p.constant,
    "terminal.ansiBrightCyan": "#a0e6ee",
    "terminal.ansiBrightWhite": "#ffffff",

    "statusBar.background": sbBg,
    "statusBar.foreground": sbFg,
    "statusBar.border": line,
    "statusBar.noFolderBackground": sbBg,
    "statusBar.debuggingBackground": p.modified,
    "statusBar.debuggingForeground": "#000000",
    "statusBarItem.hoverBackground": alpha(p.fg, 0.1),
    "statusBarItem.remoteBackground": o.statusBar === "neon" ? p.bg : p.accent,
    "statusBarItem.remoteForeground": o.statusBar === "neon" ? p.accent : p.accentText,

    "input.background": p.bg,
    "input.foreground": p.fg,
    "input.border": line,
    "input.placeholderForeground": p.muted,
    "inputOption.activeBorder": p.accent,
    "inputOption.activeBackground": alpha(p.accent, 0.25),
    "inputValidation.errorBorder": p.error,
    "inputValidation.errorBackground": p.elevated,
    "dropdown.background": p.elevated,
    "dropdown.border": line,
    "dropdown.foreground": p.fg,
    "button.background": p.accent,
    "button.foreground": p.accentText,
    "button.hoverBackground": mix(p.accent, "#ffffff", 0.15),
    "button.secondaryBackground": p.elevated,
    "button.secondaryForeground": p.fg,
    "button.secondaryHoverBackground": alpha(p.accent, 0.2),
    "checkbox.background": p.bg,
    "checkbox.border": line,
    "checkbox.foreground": p.accent,
    "badge.background": p.accent,
    "badge.foreground": p.accentText,
    "progressBar.background": p.accent,

    "notifications.background": p.elevated,
    "notifications.border": line,
    "notificationCenterHeader.background": p.elevated,
    "notificationToast.border": line,
    "quickInput.background": p.elevated,
    "quickInputList.focusBackground": alpha(p.accent, 0.25),
    "quickInputList.focusForeground": p.fg,
    "pickerGroup.foreground": p.accent,
    "pickerGroup.border": line,
    "keybindingLabel.background": p.elevated,
    "keybindingLabel.border": line,
    "keybindingLabel.foreground": p.fg,
    "settings.headerForeground": p.accent,
    "settings.modifiedItemIndicator": p.accent,
    "debugToolBar.background": p.elevated,

    "gitDecoration.addedResourceForeground": p.added,
    "gitDecoration.untrackedResourceForeground": p.added,
    "gitDecoration.modifiedResourceForeground": p.modified,
    "gitDecoration.deletedResourceForeground": p.error,
    "gitDecoration.conflictingResourceForeground": p.accent,
    "gitDecoration.ignoredResourceForeground": mix(p.muted, p.bg, 0.4),
    "diffEditor.insertedTextBackground": alpha(p.added, 0.14),
    "diffEditor.removedTextBackground": alpha(p.error, 0.18),
  };
}

function buildTokenColors(p, o) {
  return [
    { name: "Comments", scope: ["comment", "punctuation.definition.comment"], settings: { foreground: p.comment, fontStyle: o.italicComments ? "italic" : "" } },
    { name: "Keywords", scope: ["keyword", "keyword.control", "storage.type", "storage.modifier"], settings: { foreground: p.keyword, fontStyle: o.boldKeywords ? "bold" : "" } },
    { name: "Operators", scope: ["keyword.operator", "punctuation.separator.key-value", "storage.type.function.arrow"], settings: { foreground: p.operator, fontStyle: "" } },
    { name: "Strings", scope: ["string", "string.template", "punctuation.definition.string"], settings: { foreground: p.string } },
    { name: "Regular expressions", scope: ["string.regexp"], settings: { foreground: p.number } },
    { name: "Escape characters", scope: ["constant.character.escape", "constant.other.placeholder"], settings: { foreground: p.property } },
    { name: "Template expressions", scope: ["punctuation.definition.template-expression", "punctuation.section.embedded"], settings: { foreground: p.keyword } },
    { name: "Numbers", scope: ["constant.numeric", "keyword.other.unit"], settings: { foreground: p.number } },
    { name: "Constants", scope: ["constant.language", "constant.character", "support.constant", "variable.other.constant", "variable.other.enummember", "entity.name.constant"], settings: { foreground: p.constant } },
    { name: "Functions", scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function", "variable.function"], settings: { foreground: p.func } },
    { name: "Decorators and annotations", scope: ["meta.decorator", "entity.name.function.decorator", "punctuation.decorator", "storage.type.annotation"], settings: { foreground: p.constant } },
    { name: "Types and classes", scope: ["entity.name.type", "entity.name.class", "entity.name.namespace", "support.type", "support.class", "entity.other.inherited-class", "storage.type.primitive", "storage.type.built-in"], settings: { foreground: p.type } },
    { name: "Variables", scope: ["variable", "variable.other.readwrite", "meta.definition.variable"], settings: { foreground: p.variable } },
    { name: "Parameters", scope: ["variable.parameter", "meta.parameter"], settings: { foreground: p.parameter } },
    { name: "this / self", scope: ["variable.language", "variable.language.this", "variable.language.self"], settings: { foreground: p.keyword, fontStyle: "italic" } },
    { name: "Properties", scope: ["variable.other.property", "variable.other.object.property", "support.variable.property", "meta.object-literal.key", "support.type.property-name", "support.type.property-name.json"], settings: { foreground: p.property } },
    { name: "Tags", scope: ["entity.name.tag"], settings: { foreground: p.keyword } },
    { name: "Attributes", scope: ["entity.other.attribute-name"], settings: { foreground: p.func } },
    { name: "CSS values", scope: ["support.constant.property-value", "support.constant.color", "constant.other.color"], settings: { foreground: p.constant } },
    { name: "Punctuation", scope: ["punctuation", "meta.brace"], settings: { foreground: mix(p.fg, p.muted, 0.5) } },
    { name: "Markdown headings", scope: ["markup.heading", "entity.name.section"], settings: { foreground: p.accent, fontStyle: "bold" } },
    { name: "Markdown bold", scope: ["markup.bold"], settings: { fontStyle: "bold" } },
    { name: "Markdown italic", scope: ["markup.italic"], settings: { fontStyle: "italic" } },
    { name: "Markdown code", scope: ["markup.inline.raw", "markup.fenced_code"], settings: { foreground: p.string } },
    { name: "Links", scope: ["markup.underline.link"], settings: { foreground: p.accent } },
    { name: "Invalid", scope: ["invalid", "invalid.illegal"], settings: { foreground: p.error } },
  ];
}

function buildSemanticTokenColors(p) {
  return {
    namespace: p.type,
    class: p.type,
    interface: p.type,
    enum: p.type,
    enumMember: p.constant,
    typeParameter: p.type,
    function: p.func,
    method: p.func,
    decorator: p.constant,
    macro: p.constant,
    property: p.property,
    parameter: p.parameter,
    variable: p.variable,
    "variable.readonly": p.constant,
    "property.readonly": p.property,
    keyword: p.keyword,
  };
}

const themesDir = join(root, "themes");
mkdirSync(themesDir, { recursive: true });
for (const file of readdirSync(themesDir)) {
  if (file.endsWith("-color-theme.json")) rmSync(join(themesDir, file));
}

const ids = new Set();
const contributes = [];
for (const theme of config.themes) {
  const id = theme.id ?? slugify(theme.label);
  if (ids.has(id)) throw new Error(`Duplicate theme id "${id}"`);
  ids.add(id);

  const p = resolvePalette(theme);
  const o = resolveOptions(theme);
  const file = `${id}-color-theme.json`;
  const json = {
    $schema: "vscode://schemas/color-theme",
    name: theme.label,
    type: "dark",
    semanticHighlighting: true,
    colors: buildColors(p, o),
    tokenColors: buildTokenColors(p, o),
    semanticTokenColors: buildSemanticTokenColors(p),
  };
  writeFileSync(join(themesDir, file), JSON.stringify(json, null, 2) + "\n");
  contributes.push({ label: theme.label, uiTheme: "vs-dark", path: `./themes/${file}` });
  console.log(`  wrote themes/${file}  (${Object.keys(json.colors).length} colors)`);
}

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.contributes = { ...pkg.contributes, themes: contributes };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`  synced ${contributes.length} themes into package.json`);
