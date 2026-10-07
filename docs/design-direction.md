# Wiresharks design direction

The approved brief is an independent engineering company spanning the fiber-optic drone, Sidekick, Munki, and EveryWay. The references are Palantir and Shield AI. Original project material comes from tarushv.com and the linked GitHub account.

## Chosen design

An editorial React site with an isolated Three.js drone visualization. Semantic content and navigation remain outside WebGL. Natural scrolling carries the visitor from the hero through product stories, engineering approach, and contact. Each product has a dedicated URL.

The taste settings are design variance 7, motion intensity 8, visual density 3. Charcoal, warm white, and muted orange form the palette. Sharp geometry, large sans-serif type, and limited monospace labels establish the visual language. The user explicitly requested a dark identity.

The drone crosses the foreground at the hero-to-work boundary. It represents the relationship between physical and digital engineering. It is a conceptual visualization, not a claim to reproduce the research prototype. Reduced motion and unavailable WebGL preserve readable content and navigation.

## Comparison and synthesis

T3-owned Codex GPT-6 Luna proposed an editorial site with lazy 3D motion. T3-owned Antigravity Gemini 3.8 Flash Medium proposed a pinned stage system with vector motion. A separate Gemini comparison preferred the editorial design for readability, convincing depth, and factual discipline.

The parent independently selected the editorial design. The stage system's invented specifications, product capabilities, and tactical names were rejected. The useful common element was separating foreground motion from content and using transforms for fallback animation. Neither synthetic telemetry nor a general stage engine is needed.

## Ownership and verification

Source discovery and architecture comparison preceded implementation. Asset research owns public/assets and docs/assets.md. A single implementation owner owns application code, typography, routing, and motion. The parent owns browser review and integration fixes.

The Model the Domain principle leads to one typed product registry used by the homepage and detail routes. The Prove It Works principle requires direct desktop and mobile browser checks, navigation and keyboard checks, animation checks, and a production build before handoff.

Source material is credited in docs/assets.md. Product status, claims, and outbound links must be supported by the user brief or inspected project evidence. No fabricated research journal, clients, performance metrics, or deployment history.
