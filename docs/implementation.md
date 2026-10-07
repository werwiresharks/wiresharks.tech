# Implementation handoff

## Delivered

The homepage includes a cinematic drone hero, accessible product index, approach section, email contact, and an oversized typographic footer. Four dedicated product routes share a typed content registry. Unrecognized routes show an intentional recovery page.

The layout follows direction A with charcoal, warm white, muted orange, sharp geometry, self-hosted Geist, and restrained Geist Mono. Mobile gets a compact keyboard-accessible menu, a stacked hero with a visible CTA, and a vertical product selector. Tabs support arrow keys, Home, and End. Focus indicators and a skip link remain visible. Motion respects reduced-motion settings.

`src/scenes/DroneScene.tsx` owns a custom procedural conceptual quadcopter with a carbon-style frame, reinforced arms, motor housings, propellers, avionics, camera lens, landing supports, fiber spool, and orange fiber. It is not presented as an image of the real prototype. The scene loads separately, caps DPR at 1.6, pauses offscreen, stops continuous rendering when paused or reduced motion is requested, and disposes geometry, materials, observers, and renderer resources on unmount. A CSS silhouette appears immediately and remains if WebGL initialization fails. The visual layer never receives pointer events. A fixed pointer-transparent layer uses Motion scroll transforms to enlarge and move the drone diagonally across the hero/work boundary, then fades it out and pauses rendering. Hero copy enters once. Route navigation transfers focus to the destination content.

## Source treatment

- Drone and Sidekick descriptions use verified portfolio facts and link to their portfolio background. No performance guarantees or release availability are invented.
- The corrected Sidekick repository is get-sidekick/sidekick. Its authentic icon is paired with a typographic wordmark. Current native README facts replace the older portfolio-only description. Optional Wispr cloud transcription is disclosed, and no public release is claimed.
- Munki uses the supplied actual audit screenshot, contained without cropping, and code-backed flashcard, review, study canvas, and Teach Munki descriptions. It is marked unpublished on its detail page. Private repository links are not exposed.
- EveryWay uses actual project imagery with a physical prototype and operator dashboard gallery. Source code, project page, and demonstration links are public.
- `public/assets`, `docs/assets.md`, and `docs/munki-assets.md` remain owned by the researchers.

## File ownership

App files are `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/vite-env.d.ts`, `src/content/products.ts`, `src/components/DroneVisual.tsx`, and `src/scenes/DroneScene.tsx`.

Configuration and public support files are `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `public/favicon.svg`, `public/robots.txt`, `public/sitemap.xml`, and `public/_redirects`.

## Verification and remaining review

`npm run build` and `npm run typecheck` pass. Three.js is a separate lazy-loaded bundle; Vite reports a size advisory for that approximately 559 kB minified chunk. Essential content, links, and routes do not depend on WebGL. Browser review belongs to the parent; this implementation task did not use the shared browser or claim visual/browser verification.

The parent-owned development server runs at `http://localhost:5173`. Production hosting needs a history fallback. No commits, push, or deployment were performed.
