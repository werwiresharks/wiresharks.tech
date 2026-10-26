# Website polish verification — 2026-10-26

The raptor page lockup now uses its intended centered grid. A generic child
selector previously won the cascade and forced it to a block. The fix changes
only display specificity: desktop centering works and the existing mobile
horizontal layout keeps its 14px gap and start alignment. No positioning
offsets or brand asset changes were added.

Keyboard navigation now moves focus to the new main content after a route
change or browser Back. When desktop navigation collapses, focus moves to the
menu toggle if its link would become hidden. Malformed URL fragments no longer
throw during scrolling.

The live console now contains its waitlist controls at narrow widths, sizes
the renderer to its stage, and fits the authority boundary as workers change
its size. The static WebGL fallback stays centered. Connection text distinguishes
an interrupted stream from its last received agent state. Pending sign-ups keep
keyboard focus, prevent duplicate submissions, time out after 15 seconds, and
cancel on navigation. An unconfirmed sign-up keeps the email for a retry.

The server changes are a separate commit, recovered from the reviewed patch
`7785cf3157da6b38679a6d1c385ee97ca5c73032`. All six file blob IDs match that
patch. They serialize waitlist persistence, allow retries after storage errors,
return useful HTTP body-limit and storage errors, and stop SSE streams while
waiting for accepted writes to finish during shutdown. Storage remains a
single-writer JSONL file, as documented in the README.

## Checks completed

- `npm run typecheck` and `npm run typecheck:server` passed.
- `npm test` passed: 131 tests, no failures, skips or cancellations.
- `npm run build` passed. Vite retains the existing large Three.js chunk warning.
- Brand build and check passed: 726 checks. Design-token values did not change;
  their equality with the live stylesheet was verified.
- `scripts/browser-qa.mjs` passed 16 browser check groups against the production
  preview in Chromium. It covers Home, raptor, talon-1, console and 404 at 320,
  390, 768, 1024 and 1440 CSS pixels; lockup alignment and mobile gap;
  waitlist containment; skip link; menu Tab/Shift+Tab, Escape and outside click;
  responsive focus; route selection and Back; FAQ keyboard controls; malformed
  hashes; sign-up success, duplicates, errors, timeout and cancellation;
  connection interruption/recovery; and WebGL fallback.
- A 720×450 CSS viewport checked equivalent 200% reflow for a 1440×900 window.
- Normal-motion rendering, scrolling, interrupted entrances, and switching to
  reduced motion passed at 1440 and 390 CSS pixels with no page errors.
- Rendered screenshots were inspected for desktop and mobile spacing,
  typography, lockup placement and console layout. The source reference image
  remained inaccessible, so comparison against that image is unverified.
- A real Node process persisted and deduplicated a local test address, then
  ended an active SSE reader and exited 0 on SIGTERM. Unit tests also cover
  shutdown during pending writes and after client disconnection.

## Reproduce browser checks

Build the site and start `npm run preview -- --port 4319 --strictPort`.
Use Playwright from an installed browser-testing environment:

```sh
node scripts/browser-qa.mjs
```

`PLAYWRIGHT_MODULE` may point to a tool-managed Playwright module.
`CHROMIUM_PATH` selects a system Chromium. `QA_BASE_URL` overrides the preview
URL; `QA_OUTPUT` selects a local directory for the JSON report and fallback
screenshot. The waitlist cases intercept responses and never submit an address
to an external service.

## Limits

Coverage is Chromium on Linux, not physical-device or cross-browser validation.
The 200% case tests equivalent layout reflow, not a browser UI zoom control.
The source reference image comparison remains outstanding. Hosted exact-head CI
must be checked after the draft PR is authorized and created: this repository's
workflow runs on pull requests or pushes to main, not on this feature branch.
