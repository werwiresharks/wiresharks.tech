# Wiresharks

The wiresharks.tech website: Raptor, Talon-1, and the Raptor Particle Engine.
React, TypeScript, Vite, and Three.js.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:5173.

## Verify

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

## Structure

- `src/sections/` page sections (hero, Raptor, autonomy, Talon-1, philosophy, company).
- `src/raptor/engine/` the Raptor Particle Engine:
  - `events.ts` typed event vocabulary.
  - `model.ts` validated state reducer (ordering, hierarchy, authorization transitions).
  - `layout.ts` pure model-to-space mapping and one-shot effects.
  - `particles.ts` CPU particle simulation, allocation, and staggered transfers.
  - `renderer.ts`, `shaders.ts`, `quality.ts` WebGL view, adaptive quality, cleanup.
  - `engine.ts` facade that works with or without the renderer.
- `src/raptor/adapters/source.ts` the seam a real Raptor runtime would use to supply events.
- `src/raptor/demo/director.ts` simulated events for the website demonstration.

The engine visualizes authorization decisions; it never makes them.

## Contact

The only public address is hello@wiresharks.tech.

## Hosting

Vercel builds `main` for production. `vercel.json` redirects the former
`/products/*` and `/research/*` routes to `/` and serves `index.html` for
client routes.
