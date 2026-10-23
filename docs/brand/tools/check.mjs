// Brand kit self-check. Run from anywhere: node docs/brand/tools/check.mjs
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve, extname, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { BRAND, REPO, tokens, contrast, MIN, cssBlock, tokensCss } from "./lib.mjs";

const errors = [];
const fail = (m) => errors.push(m);
const read = (p) => readFileSync(p, "utf8");
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fail(msg); };

// 1. Tokens equal the site's own CSS custom properties.
const css = read(join(REPO, "src/styles.css"));
for (const [sel, key] of [[":root", "root"], [".tone-soft", "tone-soft"], [".tone-dark", "tone-dark"]]) {
  const site = cssBlock(css, sel);
  const mine = tokens.css[key];
  for (const k of new Set([...Object.keys(site), ...Object.keys(mine)])) {
    // --lightningcss-* exist only in the compiled bundle; color-scheme is not a custom property.
    ok(site[k] === mine[k], `${sel} ${k}: site=${site[k]} tokens=${mine[k]}`);
  }
}
// 2. The ratified system: one red, radii 3/6/8, one easing, 160/320/700ms.
const root = tokens.css.root;
const dark = tokens.css["tone-dark"];
for (const [k, v] of Object.entries({ "--red": "#e5251b", "--red-text": "#c41f1f", "--red-strong": "#c01812", "--white": "#ffffff", "--soft": "#f5f5f2", "--charcoal": "#111214", "--radius-sm": "3px", "--radius": "6px", "--radius-lg": "8px", "--ease-out": "cubic-bezier(0.16, 1, 0.3, 1)", "--dur-1": "160ms", "--dur-2": "320ms", "--dur-3": "700ms", "--w-display": "400", "--w-ui": "500", "--fs-micro": "0.75rem" })) ok(root[k] === v, `ratified :root ${k} must be ${v}, tokens=${root[k]}`);
ok(dark["--red-text"] === "#ff5a52", "dark tone red text must be #ff5a52");
ok(/\.dangerous \{[^}]*color: var\(--red-text\)/.test(css), "headline emphasis must use var(--red-text)");
const retired = ["#9c3430", "#b68a65", "#e32626", "#9c7a3c", "#2f6bb0", "#121212", "#f7f7f5", "#f2f2f0"];
const fav = read(join(BRAND, "assets/logo/favicon.svg"));
ok(fav.includes("#181a1b") && fav.includes("#d52b24"), "favicon colors differ from tokens exceptions");
// Loaded font weights equal the documented families.
const main = read(join(REPO, "src/main.tsx"));
const loaded = (pkg) => [...main.matchAll(new RegExp(`@fontsource/${pkg}/latin-(\\d+)\\.css`, "g"))].map((m) => +m[1]).sort();
ok(JSON.stringify(loaded("geist")) === JSON.stringify(tokens.type.families.sans.weights), `Geist weights: site=${loaded("geist")} tokens=${tokens.type.families.sans.weights}`);
ok(JSON.stringify(loaded("geist-mono")) === JSON.stringify(tokens.type.families.mono.weights), `Geist Mono weights: site=${loaded("geist-mono")} tokens=${tokens.type.families.mono.weights}`);

// 3. Contrast classes.
for (const [tone, rows] of Object.entries(tokens.pairings).filter(([k]) => k !== "$comment")) {
  for (const p of rows) ok(contrast(p.fg, p.bg) >= MIN[p.class], `${tone} ${p.fg} on ${p.bg} = ${contrast(p.fg, p.bg).toFixed(2)} < ${MIN[p.class]} (${p.class})`);
}
// Pairing colors must be real tokens.
const hexes = new Set(JSON.stringify(tokens).match(/#[0-9a-f]{6}\b/gi).map((h) => h.toLowerCase()));
const tokenColors = new Set(Object.values(tokens.css).flatMap((o) => Object.values(o)).flatMap((v) => v.match(/#[0-9a-f]{6}\b/gi) ?? []).map((h) => h.toLowerCase()));
for (const rows of [tokens.pairings.light, tokens.pairings.dark]) for (const p of rows) for (const c of [p.fg, p.bg]) ok(tokenColors.has(c), `pairing color ${c} is not a token`);

// 4. Generated tokens.css is current.
ok(read(join(BRAND, "tokens/tokens.css")) === tokensCss(), "tokens.css is stale: run node docs/brand/tools/build.mjs");

// 5. Originals unchanged and manifest hashes match.
const manifest = JSON.parse(read(join(BRAND, "assets/manifest.json")));
for (const f of manifest.files) {
  const p = join(BRAND, f.path);
  ok(existsSync(p), `manifest file missing: ${f.path}`);
  if (existsSync(p)) ok(createHash("sha256").update(readFileSync(p)).digest("hex") === f.sha256, `hash mismatch: ${f.path}`);
}
for (const f of ["favicon.svg", "favicon.ico", "apple-touch-icon.png", "raptor.svg", "wiresharks-logo.png"]) {
  ok(Buffer.compare(readFileSync(join(BRAND, "assets/logo", f)), readFileSync(join(REPO, "public", f))) === 0, `logo ${f} differs from public/${f}`);
}

// 6. Text files: no placeholders, hex values are known, relative links resolve.
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === "dist" ? [] : walk(p)) : [p]; });
const texts = walk(BRAND).filter((p) => [".md", ".html", ".css", ".json", ".mjs"].includes(extname(p)));
const allowHex = new Set([...hexes, "#ffffff", "#fff", "#000", "#000000"]);
for (const p of texts) {
  const rel = relative(BRAND, p);
  const t = read(p);
  ok(!/\{\{|TODO|FIXME|lorem ipsum|XXXX/i.test(t) || rel.startsWith("tools/"), `placeholder text in ${rel}`);
  if (!rel.startsWith("tools/")) {
    ok(!/Raptor-1/.test(t.replace(/never Raptor-1|\| Raptor-1 \/ Raptor 1 \|/gi, "")), `retired name Raptor-1 in ${rel}`);
    ok(!/talos/i.test(t), `retired name Talos in ${rel}`);
    ok(!/Raptor Swarm|in development|is developing|does not choose for the owner/i.test(t), `superseded positioning copy in ${rel}`);
    // Product names are lowercase. Rows of the Avoid table name the retired forms on purpose.
    const prose = t.replace(/^\|[^|\n]*(?:raptor|talon)[^|\n]*\|.*$/gim, "");
    ok(!/\bRaptor\b(?!-1)|\bTalon-1\b|talon-1\s*(?:®|™|&reg;|&trade;)/.test(prose), `capitalised or marked product name in ${rel}`);
  }
  if (extname(p) === ".html" || extname(p) === ".md") {
    if (!rel.startsWith("tools/")) for (const h of t.match(/#[0-9a-f]{6}\b/gi) ?? []) ok(allowHex.has(h.toLowerCase()) && !retired.includes(h.toLowerCase()), `unknown or retired hex ${h} in ${rel}`);
    const refs = [...t.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g), ...t.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g), ...t.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map((m) => m[1]);
    for (const r of refs) {
      if (/^(https?:|mailto:|data:)/.test(r)) continue;
      ok(existsSync(resolve(dirname(p), r)), `broken link ${r} in ${rel}`);
    }
  }
}
// 7. Required deliverables exist.
for (const f of ["README.md", "BRAND-GUIDE.md", "FONTS.md", "brand-guide.html", "quick-reference.html", "tokens/tokens.json", "tokens/tokens.css", "templates/slide-template.html", "templates/social-card-template.html", "templates/document-template.html", "templates/copy-templates.md"]) ok(existsSync(join(BRAND, f)), `missing deliverable ${f}`);

// 7b. Product sentences appear verbatim where writers copy them from.
const sentences = ["raptor is the autonomous cybersecurity agent, built on Hermes and running on Harness.", "talon-1 is the open-weight security model that powers raptor.", "The raptor particle engine visualizes agent authorization state. It never makes decisions.", "Harness is the infrastructure that runs and coordinates raptor's work."];
for (const f of ["BRAND-GUIDE.md", "templates/copy-templates.md", "brand-guide.html"]) for (const line of sentences) ok(read(join(BRAND, f)).includes(line), `${f} lacks product sentence: ${line}`);
ok(tokens.source.snapshot === "2026-10-19" && manifest.snapshot === "2026-10-19", "snapshot date must be 2026-10-19");

// 7c. The site follows the same rule: lowercase product names in copy, talon-1 unmarked, and ® written only in RaptorWordmark.tsx (which renders it for the wordmark, headings, questions, buttons and first mentions).
const siteWalk = (d) => readdirSync(join(REPO, d)).flatMap((n) => { const p = join(d, n); return statSync(join(REPO, p)).isDirectory() ? siteWalk(p) : [p]; });
const siteCopy = [...siteWalk("src/pages"), ...siteWalk("src/components"), "src/content.ts", "src/site.ts", "index.html", "scripts/og-image.html"].filter((f) => /\.(tsx?|html)$/.test(f) && !/\.test\.ts$/.test(f));
const markHomes = new Set(["src/components/RaptorWordmark.tsx", "scripts/og-image.html"]);
for (const f of siteCopy) {
  const code = read(join(REPO, f)).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/^import .*$/gm, "");
  const names = [...code.matchAll(/(?<![<\w.])(?:Raptor|Talon-1|Talon)(?![\w(]|-1\b|-)/g)].map((m) => code.slice(Math.max(0, m.index - 30), m.index + 20).replace(/\s+/g, " "));
  ok(names.length === 0, `capitalised product name in ${f}: ${names.join(" | ")}`);
  ok(!/talon-1\s*(?:®|™|&reg;|&trade;)/i.test(code), `talon-1 carries a mark in ${f}`);
  ok(markHomes.has(f) || !/®|&reg;/.test(code), `® outside the raptor® wordmark in ${f}`);
}

// 8. Independent reference cases catch broken contrast arithmetic.
ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.00001, "black/white reference must be 21:1");
ok(contrast("#121212", "#121212") === 1, "same-color reference must be 1:1");
ok(contrast(root["--red"], root["--charcoal"]) < MIN.body, "red on charcoal must not be classified as body text");
ok(contrast(root["--red-text"], root["--white"]) >= MIN.body, "red text on white must pass body contrast");
ok(contrast(dark["--red-text"], root["--charcoal"]) >= MIN.body, "dark red text on charcoal must pass body contrast");
// 9. ZIP contents follow explicit distribution boundaries.
for (const kind of ["public-visual"]) {
  const entries = execFileSync("unzip", ["-Z1", join(BRAND, `dist/wiresharks-brand-${kind}.zip`)], {encoding:"utf8"}).trim().split("\n");
  const root = `wiresharks-brand-${kind}/`;
  ok(entries.every(e => e.startsWith(root) && !e.includes("../")), `${kind}: unexpected archive path`);
  for (const required of ["brand-guide.html", "quick-reference.html", "tokens/tokens.json", "assets/fonts/Geist-OFL.txt", "templates/slide-template.html", "templates/social-card-template.html", "templates/document-template.html"]) ok(entries.includes(root + required), `${kind}: missing ${required}`);
  if (kind === "public-visual") ok(!entries.some(e=>/CONFLICTS|SOURCES|source-manifest|tools\//.test(e)), "public ZIP contains internal audit files");
}
if (errors.length) { console.error(errors.map((e) => `FAIL ${e}`).join("\n")); console.error(`${errors.length} failed of ${checks} checks`); process.exit(1); }
console.log(`brand kit OK: ${checks} checks passed`);
