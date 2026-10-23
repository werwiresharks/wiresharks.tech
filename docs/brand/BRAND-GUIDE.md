# Wiresharks brand guide

The Wiresharks brand as it ships on [wiresharks.tech](https://wiresharks.tech/). Snapshot: October 19, 2026. Every value here equals the live `src/styles.css`. `tools/check.mjs` enforces that on every build.

**Principle.** Editorial restraint and cinematic confidence. One accent colour, big quiet type, hairline structure, instrument-panel surfaces and scroll motion.

## Names

Product names are lowercase wherever they name the product: the wordmark, navigation, headings, buttons, labels, page titles, metadata and running text. They stay lowercase at the start of a sentence and inside uppercase mono labels. Other names keep their own casing. Rule adopted October 23, 2026.

- **Wiresharks** is the company. One word, capital W. The logo sets it as WIRESHARKS.
- **raptor** is the autonomous agent and its runtime. Write raptor, with a lowercase r, never Raptor-1.
- **talon-1** is the open-weight model. talon is the model layer; the shipping model keeps its version. talon-1 never carries ®, ™ or any other mark.
- **Harness** is the infrastructure that runs and coordinates raptor's work.
- **Hermes** is the upstream engine raptor is built on.
- **raptor particle engine** is the particle orb. It draws the agent's authorization state. Its CSS prefix is `rpe-`.

## The raptor® wordmark

The raptor® wordmark is the name in lowercase Geist with the registered mark. The name tracks at -0.045em. The ® is 0.34em, Geist 500, raised to the height of the t. The claw mark may stand before the name, as it does in the claw-tear reveal. In navigation, labels and the product heading the wordmark takes the weight of the text around it; standing alone it is Geist 600.

The ® belongs to the wordmark only. Never write ® in running text, headings, buttons, page titles or metadata. On the site, the `RaptorWordmark` component draws it in the navigation, the home hero, the home product block, the claw-tear reveal, the raptor page mark and the footer. The social image draws it too. `tools/check.mjs` fails a ® anywhere else in the site source.

## Product sentences

Use these verbatim. Each product has one.

- raptor is the autonomous cybersecurity agent, built on Hermes and running on Harness.
- talon-1 is the open-weight security model that powers raptor.
- Harness is the infrastructure that runs and coordinates raptor's work.
- The raptor particle engine visualizes agent authorization state. It never makes decisions.

talon-1 *powers* raptor. raptor *runs on* Harness. Never write "runs on talon-1".

## Voice

Two registers share one vocabulary.

- **Public site.** Bold and confident. The tagline is "The world's most dangerous AI." Write in the present tense, as shipping. Never "planned", "coming", "will" or "the goal is".
- **Repositories and internal docs.** Plain, precise and authorization-gated. Keep marketing lines out of engineering READMEs.

Both registers use the same names and the same product sentences. Body and spec text follows ASD-STE100 habits: sentences of 20 words or fewer, active voice, present tense, one idea per sentence and one term per concept. Use "worker" for sub-units, "agent" only for raptor, "your machine" for where talon-1 runs, and "ship" for release. Describe only work that is merged, and say "suggests" for routing, which only suggests.

Keep the evidence honest. Do not invent customers, partners, certifications, benchmark scores or model specifications. Label illustrations as illustrative, as the site does.

| Avoid | Use |
|---|---|
| Wire Sharks / WireSharks | Wiresharks |
| Raptor-1 / Raptor 1 | raptor |
| Raptor / RAPTOR as a name in text | raptor |
| Talon-1 / Talon / Talon1 for the shipping model | talon-1 |
| talon-1® / talon-1™ | talon-1 |
| Raptor® in a sentence | raptor |
| Raptor runs on Talon-1 | talon-1 powers raptor |
| A benchmark-shaped chart without results | A labelled diagram with no invented scores |

## Marks

The lockup is the WIRESHARKS wordmark plus one red node mark. The header sets the wordmark inline: WIRE in Geist 600, SHARKS in Geist 400, 20px on desktop and 19px on mobile, at -0.045em. The header mark uses viewBox `34 32 132 94` and ends in one red square node.

Original web artwork is in `assets/logo/`: `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `wiresharks-logo.png` and the product claw `raptor.svg`. The square PNG is 512 × 512 on opaque white. Keep exact bytes. Use it on white. Do not remove its background, recolour, stretch it or add effects. The raptor claw is a product mark, never the company mark. The raptor® wordmark is a product mark too; see above. The favicon keeps its own asset colours, #181a1b and #d52b24; they are not palette values. The inline fragments in `assets/logo/` show the header mark as it renders and depend on site CSS.

Leave half the mark height clear on every side. Minimum widths are 16px for the icon and 96px for the lockup. The kit holds the web files. Ask the design owner for outlined, reversed and CMYK masters.

## Colour

One red. `--red` #e5251b is the only accent, used surgically. Red means brand and refusal only. Particle orbs are graphite with about 15% red.

Exact declarations are in [tokens.json](tokens/tokens.json) and the generated [tokens.css](tokens/tokens.css). `.tone-soft` and `.tone-dark` sections re-point the semantic tokens. The site has no whole-page dark mode.

| Role | Light / soft | Dark section |
|---|---|---|
| Canvas | #ffffff / #f5f5f2 | #111214 |
| Primary text | #111214 | #f3f3f1 |
| Secondary text | #3a3a3a | #d4d4d2 |
| Muted text | #6b6b6b / #666664 on soft | #9b9b98 |
| Quiet muted text | #737371 / #6e6e6b on soft | #86867f |
| Accent | #e5251b | #e5251b |
| Red text | #c41f1f | #ff5a52 |
| Strong red | #c01812 | #c01812 |
| Panel / bar | #ffffff / #fafaf9 | #1c1d20 to #141517 / #1d1e21 |
| Success | #1f7a45 | #5fbf7f |
| Running | #c01812 | #ff6a60 |
| Review | #9a6b1f | #d2b07a |

Hairlines are rgba(128, 128, 128, 0.2) on light and rgba(255, 255, 255, 0.11) on dark. Strong lines are rgba(17, 18, 20, 0.16) and rgba(255, 255, 255, 0.22). `--red-tint` puts a 10% red highlight behind emphasised display words, and 16% on dark. Pair every status colour with a word, so colour is never the only signal.

Measured sRGB contrast: primary text on white 18.74:1, on soft 17.16:1. Muted on white 5.33:1. Dark primary 16.87:1, dark muted 6.73:1. Red text on white 5.89:1, on charcoal 6.10:1. Normal text needs 4.5:1; large text needs 3:1 at 24px regular or 18.66px bold. Accent red is 4.55:1 on white but 4.17:1 on soft and 4.12:1 on charcoal. Use it for marks and large type, and use `--red-text` for words. `tools/check.mjs` checks every pairing in `tokens.json`. Transparent or moving backgrounds need their own composited check.

## Type

Geist and Geist Mono. The site loads Geist 400, 500 and 600 and Geist Mono 400 and 500, normal style, as Latin-subset WOFF2. Display type is large and light. UI and small headings are 500. Mono carries labels, specs and readouts. 12px (`--fs-micro`) is the text floor. Numerals are tabular.

| Use | Rule |
|---|---|
| Display | Geist 400. clamp(3rem, 6vw + 0.75rem, 7.5rem). -0.055em to -0.06em. Line-height 0.92 to 1. |
| Product name | Geist 400. clamp(3.5rem, 8.4vw, 7.75rem). |
| Page h1 | Geist 400. clamp(2.75rem, 5.6vw, 5.5rem). |
| Section h2 | Geist 500. clamp(2rem, 3.8vw, 3.5rem). -0.04em. |
| Lead | clamp(1.0625rem, 1.25vw, 1.25rem). |
| UI | Geist 500. 0.9375rem. -0.02em. Navigation and CTAs. |
| Body / small / micro | 1rem / 0.875rem / 0.75rem. |
| Mono label | Geist Mono 400. 0.75rem. Uppercase. 0.08em. Line-height 1.4. |

Web fallbacks are `ui-sans-serif, system-ui, -apple-system, sans-serif` and `ui-monospace, "SF Mono", Menlo, monospace`. Document fallbacks are Helvetica Neue or Arial, and Menlo or Consolas. Fallback metrics differ, so recheck wrapping after substitution. Avoid synthetic bold or italic. Font software travels with `assets/fonts/Geist-OFL.txt`. See [FONTS.md](FONTS.md) for downloads and installation.

## Shape and layout

The square is the motif. Radii are 3, 6 and 8px (`--radius-sm`, `--radius`, `--radius-lg`). Status LEDs are square. Content is 1280px wide with fluid gutters of clamp(20px, 4.4vw, 72px). Sections are clamp(96px, 11vw, 160px) apart, with a section-head gap of clamp(56px, 7vw, 96px). CTAs are 48px tall with a 12px gap. The header is 76px; scrolled, it becomes a 56px glass bar, 12px from the edges. Breakpoints sit at 600, 768 and 1024px. Desktop pairs text with instrument panels; mobile stacks them.

Fixed canvases use spacing steps of 8, 16, 24, 32, 48, 72 and 96px. Give each slide or card one idea and generous margins. Keep red sparse. Never put the white-backed PNG on charcoal as a reversed logo.

## Imagery and motion

Motifs: the particle orb, the claw-tear reveal, the swarm split and combine, and the red strike line. Fine grids and instrument panels carry technical detail. Panels that show sample data carry an "Illustrative" tag.

One easing, `cubic-bezier(0.16, 1, 0.3, 1)`, with `cubic-bezier(0.65, 0, 0.35, 1)` for in-out moves. Durations are 160, 320 and 700ms. Reveals run 700ms of opacity, 6px blur and 14px lift; phones and touch screens skip the blur. Display type enters word by word, and a short red strike draws under each section label. Hover effects are gated to `(hover: hover)` and never carry information. Reduced motion removes reveals and smooth scroll, and the raptor particle engine holds its particles still. Touch scrolling is never held or hijacked. The printable kit and templates are static. Animated collateral needs a static form and must respect reduced motion.

## Templates

[Slide](templates/slide-template.html), [social card](templates/social-card-template.html) and [document](templates/document-template.html) are editable HTML with the ratified copy. Print sizes are 16 × 9in, 12 × 6.3in and A4. Open one in a browser, edit the text, and print with backgrounds on and browser headers off. Add alt text to a raster social export. [Copy templates](templates/copy-templates.md) hold the company line, product sentences and publishing skeletons.

## Sources

The [live site](https://wiresharks.tech/), the [raptor page](https://wiresharks.tech/raptor), the [talon-1 page](https://wiresharks.tech/talon), the website's `src/styles.css`, and the [Geist license](https://github.com/vercel/geist-font/blob/main/OFL.txt).
