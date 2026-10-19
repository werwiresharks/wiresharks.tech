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
// 2. Exceptions appear in source assets / CSS.
ok(css.includes("#9c3430") && css.includes("#b68a65"), "headline emphasis colors missing from styles.css");
const fav = read(join(BRAND, "assets/logo/favicon.svg"));
ok(fav.includes("#181a1b") && fav.includes("#d52b24"), "favicon colors differ from tokens exceptions");

// 3. Contrast classes.
for (const [tone, rows] of Object.entries(tokens.pairings).filter(([k]) => k !== "$comment")) {
  for (const p of rows) ok(contrast(p.fg, p.bg) >= MIN[p.class], `${tone} ${p.fg} on ${p.bg} = ${contrast(p.fg, p.bg).toFixed(2)} < ${MIN[p.class]} (${p.class})`);
}
// Pairing colors must be real tokens.
const hexes = new Set(JSON.stringify(tokens).match(/#[0-9a-f]{6}\b/gi).map((h) => h.toLowerCase()));
const tokenColors = new Set([...Object.values(tokens.css).flatMap((o) => Object.values(o)), ...Object.values(tokens.observed_exceptions.headline_emphasis)].filter((v) => /^#[0-9a-f]{6}$/i.test(v)));
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
  if (extname(p) === ".html" || extname(p) === ".md") {
    if (!rel.startsWith("tools/")) for (const h of t.match(/#[0-9a-f]{6}\b/gi) ?? []) ok(allowHex.has(h.toLowerCase()), `unknown hex ${h} in ${rel}`);
    const refs = [...t.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g), ...t.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g), ...t.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map((m) => m[1]);
    for (const r of refs) {
      if (/^(https?:|mailto:|data:)/.test(r)) continue;
      ok(existsSync(resolve(dirname(p), r)), `broken link ${r} in ${rel}`);
    }
  }
}
// 7. Required deliverables exist.
for (const f of ["README.md", "BRAND-GUIDE.md", "FONTS.md", "brand-guide.html", "quick-reference.html", "tokens/tokens.json", "tokens/tokens.css", "templates/slide-template.html", "templates/social-card-template.html", "templates/document-template.html", "templates/copy-templates.md"]) ok(existsSync(join(BRAND, f)), `missing deliverable ${f}`);

// 8. Independent reference cases catch broken contrast arithmetic.
ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.00001, "black/white reference must be 21:1");
ok(contrast("#121212", "#121212") === 1, "same-color reference must be 1:1");
ok(contrast("#e32626", "#121212") < MIN.body, "red on dark must not be classified as body text");
ok(contrast("#9c7a3c", "#ffffff") < MIN.body, "review bronze on white must not be classified as body text");
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
