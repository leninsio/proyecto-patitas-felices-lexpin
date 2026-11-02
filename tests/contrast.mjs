#!/usr/bin/env node
/**
 * WCAG AA contrast audit for the Patitas Felices design tokens.
 *
 * Parses site/assets/css/tokens.css, resolves the light and dark semantic
 * palettes, and checks every foreground/background pair the UI actually uses.
 * Exits with code 1 when any pair is below its required ratio or when the two
 * dark theme declarations drift apart.
 *
 * Run with: node tests/contrast.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokensPath = path.join(projectRoot, "site", "assets", "css", "tokens.css");

/** Every pair below is rendered by the components in this project. */
const PAIRS = [
  { fg: "--color-text", bg: "--color-bg", min: 4.5, label: "Body text on page background" },
  { fg: "--color-text", bg: "--color-surface", min: 4.5, label: "Body text on surface" },
  { fg: "--color-text", bg: "--color-surface-muted", min: 4.5, label: "Body text on muted surface" },
  { fg: "--color-text", bg: "--color-primary-soft", min: 4.5, label: "Text on selected radio card" },
  { fg: "--color-text", bg: "--color-input-bg", min: 4.5, label: "Input value text" },
  { fg: "--color-text-muted", bg: "--color-bg", min: 4.5, label: "Muted text on page background" },
  { fg: "--color-text-muted", bg: "--color-surface", min: 4.5, label: "Muted text on surface" },
  { fg: "--color-text-muted", bg: "--color-surface-muted", min: 4.5, label: "Muted text on muted surface" },
  { fg: "--color-text-muted", bg: "--color-input-bg", min: 4.5, label: "Placeholder text" },
  { fg: "--color-text-muted", bg: "--color-primary-soft", min: 4.5, label: "Muted text on selected radio card" },
  { fg: "--color-text-subtle", bg: "--color-bg", min: 3, label: "Subtle large text on page background" },
  { fg: "--color-text-subtle", bg: "--color-surface", min: 3, label: "Subtle large text on surface" },
  { fg: "--color-primary-ink", bg: "--color-bg", min: 4.5, label: "Link / eyebrow on page background" },
  { fg: "--color-primary-ink", bg: "--color-surface", min: 4.5, label: "Link / eyebrow on surface" },
  { fg: "--color-primary-ink", bg: "--color-surface-muted", min: 4.5, label: "Link on muted surface" },
  { fg: "--color-primary-ink", bg: "--color-primary-soft", min: 4.5, label: "Link on primary soft surface" },
  { fg: "--color-primary-ink", bg: "--color-header-bg", min: 4.5, label: "Header link and active nav" },
  { fg: "--color-primary-hover", bg: "--color-bg", min: 4.5, label: "Link hover on page background" },
  { fg: "--color-primary-hover", bg: "--color-surface", min: 4.5, label: "Link hover on surface" },
  { fg: "--color-primary-soft-text", bg: "--color-primary-soft", min: 4.5, label: "Active nav and primary badge" },
  { fg: "--color-on-primary", bg: "--color-primary", min: 4.5, label: "Primary button / selected day" },
  { fg: "--color-on-primary", bg: "--color-primary-hover", min: 4.5, label: "Primary button hover" },
  { fg: "--color-on-primary", bg: "--color-primary-active", min: 4.5, label: "Primary button active" },
  { fg: "--color-accent-ink", bg: "--color-bg", min: 4.5, label: "Accent text on page background" },
  { fg: "--color-accent-ink", bg: "--color-surface", min: 4.5, label: "Accent text on surface" },
  { fg: "--color-on-accent", bg: "--color-accent", min: 4.5, label: "Accent button resting" },
  { fg: "--color-on-accent", bg: "--color-accent-hover", min: 4.5, label: "Accent button hover" },
  { fg: "--color-on-accent", bg: "--color-accent-active", min: 4.5, label: "Accent button active" },
  { fg: "--color-accent-soft-text", bg: "--color-accent-soft", min: 4.5, label: "Accent badge / soft alert" },
  { fg: "--color-emergency-ink", bg: "--color-bg", min: 4.5, label: "Emergency text on page background" },
  { fg: "--color-emergency-ink", bg: "--color-surface", min: 4.5, label: "Required marker on surface" },
  { fg: "--color-on-emergency", bg: "--color-emergency", min: 4.5, label: "Emergency button / dock" },
  { fg: "--color-on-emergency", bg: "--color-emergency-hover", min: 4.5, label: "Emergency button hover" },
  { fg: "--color-on-emergency", bg: "--color-emergency-active", min: 4.5, label: "Emergency button active" },
  { fg: "--color-emergency-soft-text", bg: "--color-emergency-soft", min: 4.5, label: "Emergency soft badge" },
  { fg: "--color-emergency", bg: "--color-on-emergency", min: 4.5, label: "Dock call button (inverted)" },
  { fg: "--color-on-success", bg: "--color-success", min: 4.5, label: "Success button / icon chip" },
  { fg: "--color-success-text", bg: "--color-success-soft", min: 4.5, label: "Success alert" },
  { fg: "--color-success-text", bg: "--color-surface", min: 4.5, label: "Success text on surface" },
  { fg: "--color-on-warning", bg: "--color-warning", min: 4.5, label: "Warning button" },
  { fg: "--color-warning-text", bg: "--color-warning-soft", min: 4.5, label: "Warning alert" },
  { fg: "--color-warning-text", bg: "--color-surface", min: 4.5, label: "Warning text on surface" },
  { fg: "--color-on-error", bg: "--color-error", min: 4.5, label: "Error button / icon chip" },
  { fg: "--color-error-text", bg: "--color-error-soft", min: 4.5, label: "Error alert" },
  { fg: "--color-error-text", bg: "--color-surface", min: 4.5, label: "Error message on surface" },
  { fg: "--color-error-text", bg: "--color-bg", min: 4.5, label: "Error message on page background" },
  { fg: "--color-on-info", bg: "--color-info", min: 4.5, label: "Info button / icon chip" },
  { fg: "--color-info-text", bg: "--color-info-soft", min: 4.5, label: "Info alert" },
  { fg: "--color-info-text", bg: "--color-surface", min: 4.5, label: "Info text on surface" },
  { fg: "--color-badge-text", bg: "--color-badge-bg", min: 4.5, label: "Neutral badge" },
  { fg: "--color-header-text", bg: "--color-header-bg", min: 4.5, label: "Header text" },
  { fg: "--color-footer-text", bg: "--color-footer-bg", min: 4.5, label: "Footer text" },
  { fg: "--color-footer-muted", bg: "--color-footer-bg", min: 4.5, label: "Footer muted text" },
  { fg: "--color-footer-link", bg: "--color-footer-bg", min: 4.5, label: "Footer links and focus ring" },
  { fg: "--color-hero-text", bg: "--color-hero-bg", min: 4.5, label: "Hero text" },
  { fg: "--color-hero-muted", bg: "--color-hero-bg", min: 4.5, label: "Hero muted text" },
  { fg: "--color-hero-bg", bg: "--color-hero-muted", min: 4.5, label: "Inverse button active" },
  { fg: "--color-disabled-text", bg: "--color-disabled-bg", min: 3, label: "Disabled controls (exempt, checked at 3:1)" },
  { fg: "--color-slot-unavailable-text", bg: "--color-slot-unavailable-bg", min: 4.5, label: "Unavailable calendar day / slot" },
  { fg: "--color-border-strong", bg: "--color-bg", min: 3, label: "Strong border on page background" },
  { fg: "--color-border-strong", bg: "--color-surface", min: 3, label: "Input and outline border on surface" },
  { fg: "--color-border-strong", bg: "--color-input-bg", min: 3, label: "Input border on input background" },
  { fg: "--color-border-strong", bg: "--color-surface-muted", min: 3, label: "Strong border on muted surface" },
  { fg: "--color-focus", bg: "--color-bg", min: 3, label: "Focus ring on page background" },
  { fg: "--color-focus", bg: "--color-surface", min: 3, label: "Focus ring on surface" },
  { fg: "--color-focus", bg: "--color-header-bg", min: 3, label: "Focus ring in header" },
  { fg: "--color-focus", bg: "--color-input-bg", min: 3, label: "Focus ring on inputs" },
  { fg: "--color-primary", bg: "--color-input-bg", min: 3, label: "Input hover border" },
  { fg: "--color-primary", bg: "--color-bg", min: 3, label: "Primary button boundary on page" },
  { fg: "--color-primary", bg: "--color-surface", min: 3, label: "Primary button boundary on surface" },
  { fg: "--color-emergency", bg: "--color-bg", min: 3, label: "Emergency button boundary on page" },
  { fg: "--color-emergency", bg: "--color-surface", min: 3, label: "Emergency button boundary on surface" },
  { fg: "--color-error", bg: "--color-input-bg", min: 3, label: "Invalid input border" },
  { fg: "--color-on-emergency", bg: "--color-emergency", min: 3, label: "Dock focus ring" }
];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseDeclarations(block) {
  const declarations = new Map();
  const declarationPattern = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = declarationPattern.exec(block)) !== null) {
    declarations.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }

  return declarations;
}

function parseBlocks(css) {
  const blocks = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = blockPattern.exec(css)) !== null) {
    blocks.push({
      selector: match[1].trim().replace(/\s+/g, " "),
      declarations: parseDeclarations(match[2])
    });
  }

  return blocks;
}

function findBlock(blocks, predicate, description) {
  const block = blocks.find(predicate);
  if (!block) {
    throw new Error(`Could not find the ${description} block in tokens.css`);
  }
  return block;
}

function hexToRgb(value, tokenName) {
  const hex = value.trim().replace(/^#/, "");

  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(
      `Token ${tokenName} must resolve to a hex color for contrast checks (received "${value}")`
    );
  }

  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex;

  return [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16) / 255);
}

function relativeLuminance(hex, tokenName) {
  const [red, green, blue] = hexToRgb(hex, tokenName).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background, fgToken, bgToken) {
  const first = relativeLuminance(foreground, fgToken);
  const second = relativeLuminance(background, bgToken);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolve(theme, token) {
  const value = theme.get(token);
  if (!value) {
    throw new Error(`Missing token ${token}`);
  }
  return value;
}

function formatRatio(value) {
  return value.toFixed(2);
}

function main() {
  const css = stripComments(readFileSync(tokensPath, "utf8"));
  const blocks = parseBlocks(css);

  const lightBlock = findBlock(
    blocks,
    (block) => block.selector.includes(":root") && block.selector.includes('[data-theme="light"]'),
    "light theme"
  );
  const darkBlock = findBlock(
    blocks,
    (block) => block.selector === '[data-theme="dark"]',
    "explicit dark theme"
  );
  const systemDarkBlock = findBlock(
    blocks,
    (block) => block.selector === ':root:not([data-theme="light"])',
    "system dark theme"
  );

  const light = new Map(lightBlock.declarations);
  const dark = new Map([...light, ...darkBlock.declarations]);

  const drift = [];
  for (const [token, value] of darkBlock.declarations) {
    if (systemDarkBlock.declarations.get(token) !== value) {
      drift.push(token);
    }
  }

  if (drift.length > 0) {
    console.error(
      "FAIL: the prefers-color-scheme dark block and the [data-theme=\"dark\"] block disagree on: " +
        drift.join(", ")
    );
    process.exitCode = 1;
    return;
  }

  console.log("Patitas Felices — WCAG AA contrast audit");
  console.log(`Source: ${path.relative(projectRoot, tokensPath)}`);
  console.log(`Pairs: ${PAIRS.length} · Themes: light, dark\n`);

  const header = [
    "Pair".padEnd(58),
    "Min".padStart(4),
    "Light".padStart(7),
    "Dark".padStart(7),
    "Result".padStart(7)
  ].join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  let failures = 0;

  for (const pair of PAIRS) {
    const lightRatio = contrastRatio(
      resolve(light, pair.fg),
      resolve(light, pair.bg),
      pair.fg,
      pair.bg
    );
    const darkRatio = contrastRatio(
      resolve(dark, pair.fg),
      resolve(dark, pair.bg),
      pair.fg,
      pair.bg
    );
    const passed = lightRatio >= pair.min && darkRatio >= pair.min;

    if (!passed) {
      failures += 1;
    }

    console.log(
      [
        pair.label.padEnd(58),
        formatRatio(pair.min).padStart(4),
        formatRatio(lightRatio).padStart(7),
        formatRatio(darkRatio).padStart(7),
        (passed ? "PASS" : "FAIL").padStart(7)
      ].join(" | ")
    );
  }

  if (failures > 0) {
    console.error(`\nFAIL: ${failures} pair(s) below WCAG AA in at least one theme.`);
  } else {
    console.log(
      `\nPASS: ${PAIRS.length} pairs meet WCAG AA in both themes (${PAIRS.length * 2} checks).`
    );
  }

  console.log(
    "\nThresholds: 4.5:1 for body text, 3:1 for large text, UI boundaries and focus indicators."
  );

  process.exitCode = failures > 0 ? 1 : 0;
}

try {
  main();
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
