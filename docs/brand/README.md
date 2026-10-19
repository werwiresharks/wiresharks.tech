# Brand kit source

The designer-facing Wiresharks brand kit. Open [brand-guide.html](brand-guide.html), [quick-reference.html](quick-reference.html), [BRAND-GUIDE.md](BRAND-GUIDE.md) and [FONTS.md](FONTS.md). The kit documents the live `src/styles.css` and the ratified names, product sentences and voice. Snapshot: October 19, 2026.

## Rebuild in the website checkout

Requires Node 24 and `zip`. Run from the repository root:

```sh
node docs/brand/tools/build.mjs
node docs/brand/tools/check.mjs
python3 docs/brand/tools/export-pdf.py
```

`build.mjs` writes the five HTML pages, `tokens/tokens.css`, the asset manifest and one public ZIP. Edit the content in `build.mjs` and the values in `tokens/tokens.json`, never the generated files. After a change to `src/styles.css`, update `tokens.json` to match and rebuild.

`check.mjs` fails when:

- a `tokens.json` declaration differs from the live `:root`, `.tone-soft` or `.tone-dark` block;
- a ratified value moves (one red #e5251b, radii 3/6/8px, one easing, 160/320/700ms, display weight 400, 12px floor);
- the site's loaded font weights differ from the documented families;
- a pairing falls below its contrast class, or uses a colour that is not a token;
- `tokens.css` is stale, an asset hash changes, or a logo differs from `public/`;
- kit text uses a retired name, a retired colour or superseded positioning copy, or lacks a product sentence;
- a relative link breaks, a deliverable is missing, or the ZIP holds internal files.

It does not check rendering or PDFs. Inspect the pages after edits.

`export-pdf.py` uses an existing Chromium: `$CHROME`, T3's `chrome-headless-shell`, or `chromium`/`google-chrome` on the PATH. Without one, use browser Print with backgrounds on and headers off. The guide is six A4 pages, the quick reference one A4 page, the slide 16 × 9in, the social card 12 × 6.3in and the document A4. Rasterize the social PDF to 1200 × 630 with `pdftoppm -scale-to-x 1200 -scale-to-y 630 -singlefile -png social-card-template.pdf social-card`.

ZIP and PDF output stay in the ignored `dist/`. The public ZIP holds only the guide pages, docs, assets, tokens and templates.
