# Fonts: identify, obtain and install

## Website families

The site imports five static Latin-subset faces from `@fontsource/geist` and `@fontsource/geist-mono` 5.3.0 (`src/main.tsx`). `tools/check.mjs` checks that these imports match `tokens.json`.

| Family | Weights loaded | Roles |
|---|---|---|
| Geist | Regular 400, Medium 500, SemiBold 600; normal | Display and body 400. UI, navigation, CTAs and small headings 500. WIRE in the wordmark 600. |
| Geist Mono | Regular 400, Medium 500; normal | Labels, specs, readouts, code and diagram annotations 400. Emphasised metadata and countdown digits 500. |

Each face ships as WOFF2 with a WOFF alternative. There is no variable face, italic, custom axis setting, icon font or third-party font stylesheet. Icons are SVG.

An audit on October 19, 2026 covered `/`, `/raptor`, `/talon`, the shared 404 and the redirect routes at 1280px and 390px, with FAQ answers and the mobile menu open. Three glyphs fall back to a system face: nonbreaking hyphen U+2011 and arrow U+2192 in Geist, and light shade U+2591 in Geist Mono. The system face varies by OS and browser. It is a fallback, not a brand font.

The served files identify Geist 1.800 and Geist Mono 1.701.

## Get desktop fonts

Use [Vercel's font page](https://vercel.com/font) or the [official Geist releases](https://github.com/vercel/geist-font/releases). For a reproducible setup, use [v1.8.1](https://github.com/vercel/geist-font/releases/tag/v1.8.1) ([ZIP](https://github.com/vercel/geist-font/releases/download/v1.8.1/geist-font-v1.8.1.zip)), the latest release on October 19, 2026. Unzip it, take the desktop OTF or TTF files for Geist and Geist Mono, and keep the OFL notice. Use the static Regular, Medium and SemiBold files when an app cannot select variable weights. Do not install the bundled web WOFF2 subsets as desktop fonts.

- macOS: open the files in Font Book, choose Install, then reopen the app.
- Windows: select the files, right-click Install, then restart the app.
- Linux: install the files for your user with the desktop font manager, then reopen the app.
- Figma desktop uses installed local fonts. Figma in a browser needs Figma's font installer. Search both family names and confirm the weights.
- Cloud tools do not see desktop fonts. Check Google Slides' More fonts, or use a custom-font upload where the account allows it. Otherwise use the embedded-font HTML or PDF output, or the fallbacks below.

Use Geist 400 for display and prose, 500 for UI and headings, and 600 only for the wordmark. Use Geist Mono 400 for labels and code and 500 for emphasis. Avoid synthetic bold or italic.

## Fallbacks

Web stacks: `ui-sans-serif, system-ui, -apple-system, sans-serif` and `ui-monospace, "SF Mono", Menlo, monospace`. Document substitutes: Helvetica Neue or Arial, and Menlo or Consolas. Metrics and glyph coverage differ, so recheck wrapping, pagination and symbols after substitution.

## License

The bundled font software is SIL OFL 1.1. Keep [Geist-OFL.txt](assets/fonts/Geist-OFL.txt) with it, including in embedded-font HTML. The OFL covers the fonts, not company artwork. Modified fonts must follow its conditions, including reserved font names. See the [official license](https://github.com/vercel/geist-font/blob/main/OFL.txt).

Installation references: [Apple Font Book](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac), [Microsoft Word fonts](https://support.microsoft.com/en-us/word/add-a-font), [Figma local fonts](https://help.figma.com/hc/en-us/articles/360039956894-Add-a-font-to-Figma).
