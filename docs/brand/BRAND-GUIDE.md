# Wiresharks brand guide

A practical companion to the live identity observed on October 18, 2026. This is a proposed kit, not a new approved identity. **Observed** describes the public site. **Proposed** describes new guidance for collateral. Product claims require a fresh source check before publication.

## Use the live identity

Observed company spelling is **Wiresharks**, one word with a capital W. Raptor-1 is the public agent name; Talon-1 is the public model name. Harness is supporting infrastructure. Raptor Swarm is labelled in development. Use the full versioned names on first mention, then the site's short forms Raptor and Talon. Use the public spelling without inferring undocumented aliases. Sources: [home](https://wiresharks.tech/), [Raptor](https://wiresharks.tech/raptor), [Talon](https://wiresharks.tech/talon).

The visible site positions Wiresharks as autonomous cybersecurity. Its JSON-LD instead describes autonomous AI systems and specialized intelligence. These public descriptors differ; the owner has not chosen between them. The kit one-liner paraphrases JSON-LD; its template headline and social caption are new proposed copy, not observed taglines or an approved positioning change. The site's provocative headline is observed positioning, not proof of comparative performance. Proposed collateral uses the neutral descriptor and a source link, without performance, privacy, model-license, availability, or launch guarantees. Recheck the live site when writing a dated announcement.

## Write with evidence

Observed voice uses short declaratives, direct verbs, technical detail, and concise status labels. Proposed writing rules:

- Give one fact, explain the mechanism, then cite the evidence.
- Use sentence case headings. Use monospace for code and small metadata labels.
- Identify authorized scope when describing security work.
- Keep targets, plans, illustrations, and measured results distinct. Preserve every qualification attached to a claim.
- Use open-weight where the site does. Do not expand that into open-source or legal clearance.
- Do not invent customers, partnerships, certifications, benchmarks, release status, or model specifications.

| Avoid | Use |
|---|---|
| Wire Sharks / WireSharks | Wiresharks |
| Raptor 1 / Talon1 | Raptor-1 / Talon-1 |
| A benchmark-shaped chart without results | A labelled conceptual diagram with no invented scores |
| A launch date presented as an accomplished release | A dated announcement checked against current release evidence |
| Unqualified promises copied from a technical illustration | A neutral description and a link to the source |

## Use original artwork honestly

The live header uses a thin inline mark and a typeset wordmark. WIRE is Geist 600 and SHARKS is Geist 400, at 20px on desktop and 19px on mobile, with -0.045em tracking. It inherits the site font; intended logo lettering is unconfirmed and excluded from the font inventory. This is not an outlined wordmark master. Kit headers use a proposed PNG-plus-text composition, labelled on every use as not an approved lockup. The original DOM fragments in `assets/logo/` preserve CSS-dependent geometry as evidence, not standalone production assets.

Original web artwork is in `assets/logo/`: `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `wiresharks-logo.png`, and the separate product icon `raptor.svg`. The square PNG is 512 × 512 with an opaque white background. It differs from the live header mark. Preserve exact bytes. Use it on white; do not remove its background, recolor, stretch, add effects, or call it a vector master. Do not use the product claw as the company mark. The original favicon has its own colors, #181a1b and #d52b24. These are asset exceptions, not replacement palette values.

Proposed working clearance is half the mark height on every side. Proposed minimum widths are 16px for a small web icon and 96px for a lockup; check legibility at output size. These limits have no approval or print qualification. No verified outlined, monochrome, reversed, CMYK, or full print master was found. Request an owner-supplied master for those uses. No artwork license was established. Treat public accessibility as access to a file, not permission for unrestricted reuse.

## Apply the palette by role

Exact observed CSS and scoped overrides are in [tokens.json](tokens/tokens.json) and generated [tokens.css](tokens/tokens.css). Dark sections override semantic text tokens. The site does not establish an automatic whole-page dark mode.

| Role | Light / soft | Dark section |
|---|---|---|
| Canvas | #ffffff / #f7f7f5 | #121212 |
| Primary text | #121212 | #f2f2f0 |
| Secondary text | #3a3a3a | #d4d4d2 |
| Muted text | #6b6b6b / #666664 on soft | #9b9b98 |
| Brand punctuation | #e32626 | #e32626 |
| Small red text | #c41f1f | #ff5a52 |
| Panel / bar | #ffffff / #fafaf9 | #181818 / #1d1d1d |
| Success | #1f7a45 | #5fbf7f |
| Running | #2f6bb0 | #75aeea |
| Review | #9c7a3c | #d2b07a |

Hairlines use rgba(128,128,128,0.2) on light and rgba(255,255,255,0.11) on dark. Strong lines use rgba(18,18,18,0.16) and rgba(255,255,255,0.22). Decorative hairlines do not establish sufficient contrast for a required control boundary. Pair status colors with words or icons, so color is never the only signal.

Measured sRGB solid-pair contrast: primary text on white 18.73:1, on soft 17.46:1; muted on white 5.33:1; dark primary 16.71:1; dark muted 6.72:1. Small red text on white is 5.89:1 and on dark 6.10:1. Normal text needs 4.5:1; large text needs 3:1 at 24px regular or 18.67px bold. Brand red on dark is only 4.08:1, so use it for graphics or large text. Review bronze on white is 3.99:1, so keep normal review text in the primary text color and use bronze for a labelled marker. Token pairing classifications and the generated contrast table are checked mechanically; these prose ratios were independently recomputed, not parsed by the checker. Transparent or moving backgrounds require separate composited checks. These numbers do not establish full WCAG conformance.

## Set type with restraint

Observed fonts are Geist 400, 500, 600 and Geist Mono 400, 500, normal style. Packaged WOFF2 files are Latin subsets. General headings use 500. Avoid synthetic bold or italic. Font software travels with `assets/fonts/Geist-OFL.txt`, the upstream SIL OFL 1.1 notice. The served family metadata matches attribution, but an exact upstream binary release mapping was not established.

| Use | Observed size and rhythm |
|---|---|
| Home display | clamp(2.875rem, 4.6vw + 1.25rem, 6rem), -0.055em, line-height 0.98 |
| Product h1 | clamp(2.625rem, 5.4vw, 5rem) |
| Section h2 | clamp(2rem, 3.8vw, 3.5rem), -0.04em, line-height 1.04 |
| Lead | clamp(1.0625rem, 1.25vw, 1.25rem) |
| Body / small / label | 1rem / 0.875rem / 0.75rem |
| Mono label | Uppercase, 0.08em tracking, line-height 1.4 |

Observed web fallbacks are ui-sans-serif, system-ui, -apple-system, sans-serif; and ui-monospace, SF Mono, Menlo, monospace. Proposed document fallbacks are Helvetica Neue or Arial, and Menlo or Consolas. Fallback metrics differ; check wrapping and pagination after substitution. Use larger paragraph text for presentations instead of copying the site's tiny metadata labels.

See [FONTS.md](FONTS.md) for the complete bounded route/component inventory, detected system glyph fallback, official desktop downloads, installation, roles and license. Geist 600 is loaded/declared but not observed on sampled text outside excluded logo lettering; normal Geist 400/500 and Geist Mono 400/500 are used. No other custom or icon font or variable face was found. Exact platform glyph fallback families remain unidentified.

## Space and compose

Observed content width is 1280px plus fluid gutters of clamp(20px,4.4vw,72px) per side. Section spacing is clamp(96px,11vw,160px), with section-head gap clamp(56px,7vw,96px). Corners are 6px, 10px, or 14px. Main CTAs are 48px tall with 12px gaps. Desktop pairs text and diagrams; mobile stacks them. The site has no verified universal 8px grid.

Proposed fixed-canvas spacing steps are 8, 16, 24, 32, 48, 72, and 96px. Use generous margins and one main idea per slide or card. Leave red sparse. Prefer a quiet white or soft canvas, hairline dividers, technical diagrams, and occasional charcoal sections. Never place the white-backed PNG on charcoal as though it were a reversed logo.

## Choose imagery and motion

Observed imagery is technical: grids, terminal compositions, diagrams, and a live particle sphere. These are illustrations, not evidence of a running product. Proposed collateral uses simple labelled diagrams without fabricated command output, file hashes, benchmark scores, customer marks, or stock attack imagery. The templates use a square motif as graphic punctuation, not a new logo.

Observed timing is 180ms fast, 320ms base, and cubic-bezier(0.22,0.7,0.18,1). Reveals use 800ms opacity, blur, and translation. Reduced-motion source rules remove most motion, but one later opacity rule is an exception. Runtime reduced motion was not fully accepted in the source audit. The printable kit and templates use no motion and remain readable without script. For future animated collateral, provide a static equivalent and respect reduced motion.

## Reuse the templates

[Slide](templates/slide-template.html), [social card](templates/social-card-template.html), and [document](templates/document-template.html) are new proposals, not previously approved masters. Each is complete, editable HTML with neutral, public-safe example copy. Export at its print size: 16 × 9in slide, 12 × 6.3in social card, or A4 document. Open in a browser, edit source text, and print with backgrounds enabled and browser headers disabled. Include useful alt text with a raster social export. Document reading order remains linear. Check every edited claim before export.

[Copy templates](templates/copy-templates.md) give usable neutral examples. Keep the source URL with reused facts. Use public-source-only copy; this kit does not resolve differing public descriptors. No design asset or template in this kit resolves product availability or technical claims.

## Public evidence

Read the [live home](https://wiresharks.tech/), [Raptor page](https://wiresharks.tech/raptor), [Talon page](https://wiresharks.tech/talon), [observed CSS](https://wiresharks.tech/assets/index-CBf4dmQI.css), and [Geist license](https://github.com/vercel/geist-font/blob/main/OFL.txt). This guide is a dated visual and writing reference; recheck sources before publishing product copy. It makes no artwork ownership, deployment, product verification, or print-color certification claim.
