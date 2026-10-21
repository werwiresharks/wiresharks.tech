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

- `src/pages/` route pages (Home, Raptor, Talon-1).
- `src/components/` page sections (Swarm, Platform, Faq, Closing, ProductBlock, Stats, Countdown, ...),
  shared hooks (useInView, usePanelGlow), and `mock/` product panels (Console, Compare, Registry, TaskGraph).
- `src/raptor/engine/` the Raptor Particle Engine:
  - `events.ts` typed event vocabulary.
  - `model.ts` validated state reducer (ordering, hierarchy, authorization transitions).
  - `layout.ts` pure model-to-space mapping and one-shot effects.
  - `particles.ts` CPU particle simulation, allocation, and staggered transfers.
  - `renderer.ts`, `shaders.ts`, `quality.ts` WebGL view, adaptive quality, cleanup.
  - `palette.ts` tone colours and the accent ratio.
  - `describe.ts` text description of the scene for assistive tech.
  - `engine.ts` facade that works with or without the renderer.
- `src/raptor/home/` the home-page particle journey (journey.ts, source.ts).
- `src/raptor/react/` the React bindings (RaptorStage, HomeJourney, hooks).
- `src/raptor/adapters/` the seam a real Raptor runtime uses to supply events:
  - `source.ts` the `RaptorEventSource` interface and `connect`/`createMessageSource` helpers.
  - `wire.ts` validates one untrusted message into a `RaptorEvent`, or `null`; it never throws.
  - `stream.ts` a reconnecting source over any message transport (with a browser
    `WebSocket` helper): boundary validation, stale/duplicate-sequence dedup, and
    capped exponential backoff.
- `src/raptor/demo/director.ts` simulated events for the website demonstration.

The engine visualizes authorization decisions; it never makes them.

## Contact

The only public address is hello@wiresharks.tech.

## Hosting

Vercel builds `main` for production. `vercel.json` redirects the former
`/products/*` and `/research/*` routes to `/` and serves `index.html` for
client routes. `vercel.json` and `public/_redirects` both redirect the retired
`/talos` route to `/raptor`.

## Brand kit

The brand kit lives in [docs/brand](docs/brand/README.md): tokens, guide, quick reference,
templates, fonts and marks. It documents the live `src/styles.css` design.
