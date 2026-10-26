# Wiresharks

The wiresharks.tech website: raptor, talon-1, and the raptor particle engine.
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

- `src/pages/` route pages (Home, raptor, talon-1).
- `src/components/` page sections (Swarm, Shipped, Platform, Faq, Closing, ProductBlock, Stats, Countdown, ...), the raptor® wordmark (RaptorWordmark),
  shared hooks (useInView, usePanelGlow), and `mock/` product panels (Console, Compare, Registry, TaskGraph).
- `src/raptor/engine/` the raptor particle engine:
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

It also serves the site waitlist: `POST /waitlist {email}` persists to an
append-only JSONL file (`server/store.ts`), deduplicating by normalized email,
with no database. Within one server process, writes are serialized and an
entry counts only after its append succeeds; failed reads or writes can be
retried. Run only one writer per waitlist file. Invalid request bodies return
`400`, bodies over 4096 bytes return `413`, and storage failures return `500`
without exposing filesystem details.

```sh
npm run server            # serve on http://localhost:8787
npm run typecheck:server  # type-check server/ with Node types
```

Environment: `PORT` (default 8787), `CORS_ORIGIN` (default `*`),
`WAITLIST_FILE` (default `./.data/waitlist.jsonl`).

`SIGINT` and `SIGTERM` stop the scenario and call the server's `shutdown()`:
it stops accepting requests, ends live SSE streams, and lets in-flight waitlist
writes finish before exit. Embedded callers should also use `shutdown()`;
Node's plain `server.close()` waits for live SSE clients to disconnect.

Connect from the app with `createEventSourceSource("http://localhost:8787/events")`
and feed it to an engine via `useEngineSource` or `RaptorStage`'s `source` prop.
The `/console` route does exactly this: a live session plus a waitlist sign-up.
It reads `VITE_RAPTOR_STREAM_URL` and `VITE_WAITLIST_URL` at build time, both
defaulting to `http://localhost:8787`.

### Deploy

The static site deploys on Vercel as before; this Node service deploys
separately. The `Dockerfile` builds it (Node strips the TypeScript at run time,
so there is no build step); mount a volume at `/app/.data` to persist the
waitlist. Point the site's `VITE_*` URLs at the deployed service.

```sh
docker build -t wiresharks-server .
docker run -p 8787:8787 -v "$PWD/.data:/app/.data" wiresharks-server
```
- `src/raptor/demo/director.ts` simulated events for the website demonstration.

The engine visualizes authorization decisions; it never makes them.

## Raptor review

`agent/` is Raptor's first end-to-end workflow: the authorized repository
security review the product describes (Scope → Map → Find → Report). It is
read-only — it maps a repository you name, flags well-known defect classes with
their CWE, and writes an evidence report. It never patches, deploys, exploits,
or reaches outside the path you authorize.

```sh
npm run review -- <path> [--scope "<glob,...>"] [--exclude "<glob,...>"] [--out report.md]
```

`agent/scope.ts` is the authorization boundary: a review only ever reads files
under the named root, never escaping through `..`, an absolute path, or a
symlink. `agent/reviewer.ts` is the detection seam — a built-in, offline pattern
reviewer that needs no model, and a `Reviewer` interface an operator can back
with any aligned model ("works with any model"). The orchestrator
(`agent/review.ts`) narrates its progress in the engine's own event vocabulary,
so a review can be watched live in the console. It exits non-zero when a high or
critical finding is present, so it can gate CI.

What this is not: it does not run a refusal-stripped model, generate exploits,
or act on systems you have not authorized. Those are out of scope by design.

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
