import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BRAND = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO = join(BRAND, "..", "..");
export const tokens = JSON.parse(readFileSync(join(BRAND, "tokens/tokens.json"), "utf8"));

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
export const MIN = { body: 4.5, large: 3, graphic: 3 };

/** Parse `--name: value;` declarations from the first rule block starting with `selector {`. */
export function cssBlock(css, selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const start = clean.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const body = clean.slice(start + selector.length + 2, clean.indexOf("\n}", start));
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  return out;
}

export function tokensCss() {
  const block = (sel, o) => `${sel} {\n${Object.entries(o).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}\n`;
  const { root, "tone-soft": soft, "tone-dark": dark } = tokens.css;
  return `/* Generated from tokens.json by tools/build.mjs. Do not edit.\n   Observed public-site tokens (October 18, 2026), not a new design system. */\n${block(":root", root)}${block(".tone-soft", soft)}${block(".tone-dark", dark)}`;
}
