# Fonts: identify, obtain and install

## Identified website families

A live audit on October 19, 2026 covered all three sitemap/navigation pages (`/`, `/raptor`, `/talon`), the shared 404, and the three redirect patterns (`/talos`, `/products/*`, `/research/*`). Desktop 1280px and mobile 390px included open FAQ answers and the mobile menu; stylesheet rules for all breakpoints and hover/focus states were inspected. Logo lettering is explicitly excluded.

| Family | Observed faces | Roles |
|---|---|---|
| Geist | Regular 400, Medium 500, SemiBold 600; normal | Body/nav/footer 400; headings, CTAs and FAQ summaries 500. 600 is loaded and declared; outside excluded logo lettering it was not observed on sampled text. |
| Geist Mono | Regular 400, Medium 500; normal | Code/terminal text, labels, metadata and diagram annotations 400; emphasized metadata/countdown digits 500. |

All five static Latin-subset WOFF2 faces loaded. Each declaration also offers a WOFF alternative, which this Chromium did not request. No additional custom, icon or variable family, italic face, custom axis setting, preload-only family, third-party font stylesheet or iframe was found. SVG/CSS icons do not establish an icon font. No text inputs/selects/textareas occur on these pages; the mobile menu button inherits site typography. Browser chrome, mail/GitHub destinations and native dialogs are separate system UI, outside website typography.

Computed styles, loaded FontFace entries, network resources and per-glyph canvas fallback probes support this inventory. The browser does not expose per-node platform-font names through the available T3 interface. Glyph fallback was detected for nonbreaking hyphen U+2011 and arrow U+2192 in Geist, and light shade U+2591 in Geist Mono; the exact system face depends on OS/browser and is **unidentified**, not a newly selected brand font. Generated arrow/chevron pseudo-elements use the same stacks; decorative pseudo-elements have no lettering. This is a bounded inventory of the discovered public surface, not proof about unlinked, authenticated, future pages or every OS/glyph. No inaccessible stylesheet was encountered.

Sources: [sitemap](https://wiresharks.tech/sitemap.xml), [home](https://wiresharks.tech/), [Raptor](https://wiresharks.tech/raptor), [Talon](https://wiresharks.tech/talon), [shared loaded CSS](https://wiresharks.tech/assets/index-CBf4dmQI.css). The served fonts identify Geist 1.800 and Geist Mono 1.701. Their exact upstream release mapping is unverified.

## Get desktop fonts

Use [Vercel's official font page](https://vercel.com/font) or the [official Geist releases](https://github.com/vercel/geist-font/releases). For a reproducible new desktop setup, use [v1.8.1](https://github.com/vercel/geist-font/releases/tag/v1.8.1), [official ZIP](https://github.com/vercel/geist-font/releases/download/v1.8.1/geist-font-v1.8.1.zip), verified as the latest release on October 19, 2026. This is a proposed desktop baseline, **not a claim that it matches the live binaries**. Unzip, select the desktop OTF/TTF files for Geist and Geist Mono, and keep their OFL notice. Use static Regular/Medium/SemiBold if the application cannot select variable weights reliably. Do not install the bundled web WOFF2 subsets as desktop fonts.

- macOS: open the OTF/TTF files in Font Book, choose Install, then reopen Word, PowerPoint, Keynote or the design app.
- Windows: select the OTF/TTF files, right-click Install (or open Font settings and drag them in), then restart the app.
- Linux: open the files in your desktop font manager and install for your user; reopen the app.
- Figma desktop on supported macOS/Windows systems uses installed local fonts; Figma in a browser needs its font installer. Linux local-font support is not established here. Search both family names after installation and verify the requested weights. For other desktop design tools, reopen the font menu/app after installing.
- Cloud tools cannot be assumed to see desktop fonts. In Google Slides, check More fonts for the family; in Canva or similar tools, use the service's supported custom-font upload only if your account permits it. If unavailable, use the embedded-font HTML/PDF output or the documented fallback and recheck layout. Those cloud workflows were not tested with an account.

Use Geist 400 for prose, 500 for headings, 600 only for deliberate emphasis; Geist Mono 400 for code/metadata and 500 for emphasis. Avoid synthetic bold/italic. These fonts do not identify the intended logo lettering.

Web fallback stacks: `ui-sans-serif, system-ui, -apple-system, sans-serif`; `ui-monospace, SF Mono, Menlo, monospace`. Proposed document substitutes: Helvetica Neue/Arial and Menlo/Consolas. These are fallbacks, not additional observed brand families; metrics and glyph coverage differ. Recheck wraps, pagination, symbols and export embedding after substitution or a newer font release.

The bundled font software is SIL OFL 1.1; retain [Geist-OFL.txt](assets/fonts/Geist-OFL.txt) when redistributing it, including embedded-font HTML. The OFL applies to fonts, not company artwork; modified fonts must follow its conditions including reserved font names. See the [official license](https://github.com/vercel/geist-font/blob/main/OFL.txt).

Installation references: [Apple Font Book](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac), [Microsoft Word fonts](https://support.microsoft.com/en-us/word/add-a-font), [Figma local fonts](https://help.figma.com/hc/en-us/articles/360039956894-Add-a-font-to-Figma).
