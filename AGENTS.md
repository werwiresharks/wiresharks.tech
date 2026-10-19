# wiresharks.tech

The Wiresharks marketing site: React 19, TypeScript, Vite and three.js on Node 24. Vercel builds `main` for production.

## App

```sh
npm ci
npm run typecheck
npm test
npm run build
npx vite preview --port 4319   # serve dist/ to check a build
```

`src/styles.css` holds every design token. The Raptor Particle Engine lives in `src/raptor/` and uses the `rpe-` class prefix. The retired agent route redirects to `/raptor` in `src/App.tsx`, `public/_redirects` and `vercel.json`; keep those redirects.

`scripts/og-image.html` is the source of `public/og-image.jpg`. Copy it into `dist/` after a build, open it at 1200 × 630, screenshot it, and export a q88 JPEG.

## Brand

The brand kit is in `docs/brand/` and documents the live `src/styles.css`. The canonical brand record is hivemind's `brand-design-language` node. Names, product sentences and voice come from there. The agent is Raptor, never Raptor-1. The model is Talon-1.

```sh
node docs/brand/tools/build.mjs
node docs/brand/tools/check.mjs
python3 docs/brand/tools/export-pdf.py   # needs an existing Chromium
```

After a change to `src/styles.css`, update `docs/brand/tokens/tokens.json` to match, rebuild, and run the check. ZIP and PDF output stay in the ignored `docs/brand/dist/`.

## Shipping

When your work is done and the checks pass, rebase onto `origin/main` and push to `main`. Never force-push.
