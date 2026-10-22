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

## CI

`.github/workflows/ci.yml` (push to `main`, pull requests; `contents: read`; free plan) runs `npm ci`, typecheck, `typecheck:server`, test, build, then `node docs/brand/tools/build.mjs` and `check.mjs`, which also verifies the public ZIP (the runner needs `zip` and `unzip`). Action pins are full SHAs of node24 releases (`checkout` v7.0.1, `setup-node` v7.0.0). It has not run on GitHub yet.

## Handoff Notes

- 2026-10-21: recovered the stale split-CI workflow onto current main (`5f4c29d`, with the `typecheck:server` step), adding the brand build, check and ZIP check the old branch lacked. Local branch `agent/WS1-current-main-20261021`, not pushed; awaiting independent Codex review. First hosted run will confirm `zip`/`unzip` on the runner.
- 2026-10-21: swarm figure label padding. `MONO_ADVANCE` in `src/components/swarmLayout.ts` assumed 11px text but the figure's labels are 12px with 0.02em tracking (7.24px per character), so the Dependency worker label touched its card edge and the Dependencies report label touched its bar. Constant corrected; cards and bars now size from it. Branch `agent/website-dependency-padding-20261021` off `origin/main` `d6d2c17`, not pushed; awaiting independent Codex review.
