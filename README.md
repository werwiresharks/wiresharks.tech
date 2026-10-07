# Wiresharks

A cinematic, accessible company website built with React, TypeScript, Vite, Motion, and an isolated Three.js drone visualization.

## Run locally

```sh
npm install
npm run dev -- --port 5173
```

Initial dependency installation used:

```sh
npm install react react-dom react-router-dom motion three @fontsource/geist @fontsource/geist-mono @phosphor-icons/react
npm install -D vite typescript @vitejs/plugin-react @types/react @types/react-dom @types/three
```

## Verify

```sh
npm run typecheck
npm run build
npm run preview
```

The product registry in `src/content/products.ts` owns summaries, capability descriptions, sources, image references, and links. Asset provenance is recorded in `docs/assets.md` and `docs/munki-assets.md`.

Product pages use browser-history URLs. Production hosting must serve `index.html` for unknown paths so refresh and direct links work. `public/_redirects` includes the common static-host fallback. Configure the equivalent rewrite on hosts that do not support that file. Canonical domain references in robots and sitemap use `https://wiresharks.tech`.

No backend is required. Contact links open email addressed to `tkosgi@purdue.edu`. No deployment, account configuration, or external publication is included.
