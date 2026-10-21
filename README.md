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
    `WebSocket` helper): boundary validation, stale/duplicate-sequence dedup,
    capped exponential backoff, and an optional resync request that resumes from
    the last delivered seq so a reconnect loses no events.
- `src/raptor/react/hooks.ts` `useEngineSource` feeds a live source into an
  engine; `RaptorStage` takes an optional `source` prop to drive itself.
- `src/raptor/react/EngineNarration.tsx` a visually hidden live region that
  voices the engine for assistive tech (the canvas itself is decorative);
  `src/raptor/engine/narration.ts` is its pure, capped event-log accumulator.
- `src/raptor/adapters/sse.ts` a `RaptorEventSource` over the browser
  `EventSource`, the client half of the session stream server.

## Session stream server

`server/` is a dependency-free Node service that streams one Raptor session's
validated events to the browser over Server-Sent Events. It reuses the engine
reducer (`server/log.ts`), so it can only emit events the client accepts, and a
reconnecting client resumes from its `Last-Event-ID` with no gaps. A scripted
demonstration session (`server/scenario.ts`) feeds it. The server reports
events; it makes no authorization decisions.

```sh
npm run server            # serve on http://localhost:8787 (PORT, CORS_ORIGIN)
npm run typecheck:server  # type-check server/ with Node types
```

Connect from the app with `createEventSourceSource("http://localhost:8787/events")`
and feed it to an engine via `useEngineSource` or `RaptorStage`'s `source` prop.
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
