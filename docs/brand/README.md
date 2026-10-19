# Brand kit source

Open [brand-guide.html](brand-guide.html), [quick-reference.html](quick-reference.html), [BRAND-GUIDE.md](BRAND-GUIDE.md), and [FONTS.md](FONTS.md). Use the live identity and flag differing public names and claims. Examples and PNG-plus-text headers are proposed, not approved masters. Public positioning differs between visible copy and JSON-LD; the kit does not choose for the owner.

## Rebuild in the website checkout

Requires Node 24 and zip. Run from the repository root:

```sh
node docs/brand/tools/build.mjs
node docs/brand/tools/check.mjs
python3 docs/brand/tools/export-pdf.py
```

Tools require the full website checkout (`src/styles.css`, `public/`); the visual ZIP is for using/editing collateral, not running source checks. Build emits five HTML pages, token CSS, asset hashes and one public visual ZIP. PDF export uses an existing Chromium (or use browser Print with backgrounds on and headers off). The guide is six A4 pages, quick reference one A4, slide 16 × 9in, social 12 × 6.3in and document A4. Social PDF can be rasterized with `pdftoppm -scale-to-x 1200 -scale-to-y 630 -singlefile -png social-card-template.pdf social-card` for a 1200 × 630 image. This is a print-oriented template; no dark template variant is supplied. Generous blank space is intentional for adding one sourced idea.

The checker covers source token equality, token contrast classes, original asset bytes, hashes, links, required files and ZIP separation. It does not validate prose facts, PDFs, rendering or current deployment. Compare fresh generated files against committed output and inspect PDF pagination after edits. ZIP/PDF output is ignored under dist/.

Public collateral uses public sources only. Artwork rights, intended logo lettering, exact deployment revision, release/capability claims, platform glyph fallback names, cloud font uploads, physical-device/screen-reader acceptance and CMYK proof remain unverified. See the public guide and font coverage limits.
