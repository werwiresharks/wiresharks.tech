# Cinematic product chapters

The approved brief is an independent engineering company spanning Wireshark, Sidekick, Munki, and EveryWay, with Palantir and Shield AI as visual references. The existing React, Vite, Motion, and Three.js architecture remains. The current visual system uses a dominant white canvas, charcoal structure, and restrained tactical red accents.

T3-owned Codex GPT-6 Luna and Antigravity Gemini 3.8 Flash Medium produced two design sketches. An independent Gemini comparison and the coordinating agent selected Luna's natural-scroll chapter structure for factual discipline and a smaller component API. Gemini's camera-facing flight concept informed the foreground pass.

We rejected fabricated performance specifications, telemetry, and client claims. We also rejected pinned storytelling. Each project remains a normal document section with direct navigation, readable copy, its actual status, and existing source links.

The hero drone approaches along the camera direction, banks, and exits diagonally before its geometry can reach the near plane. Home owns one normalized `flightProgress` MotionValue. DroneVisual passes it to DroneScene, and the same value reveals the work introduction and first project heading and copy. Three owns the pose, rotor motion, renderer, and disposal. The scene no longer reads page scroll. Pause replaces the flight with a static hero illustration, stops hover and rotors, and leaves document navigation available.

The registry owns a `ProductDemo` discriminated union. Only ProductDemoView switches on the demo kind. Its four demos illustrate fiber signaling, a prewritten Sidekick conversation, sample flashcard recall, and a preset obstruction reroute. They do not connect to hardware, a microphone, an AI service, or a venue. Their limits are visible beside the controls. Product detail pages reuse the same demos.

The work section presents four projects as accessible tabs, with Wireshark selected by default and one expanded chapter at a time. Arrow keys move between tabs; Home and End select the first and last project. Each panel retains its large artwork or existing project image, editorial Geist headings, compact Geist Mono labels, and original demo. Sidekick has a custom orbital and waveform composition. Wireshark retains its procedural drone and CSS fallback. Munki and EveryWay retain their actual development and demonstration images. Legacy chapter hashes select the matching tab before the page scrolls to it. Narrow layouts retain a clear two-column project row and stack the selected chapter's visual, copy, and controls.

The foreground canvas reaches the dynamic viewport bottom instead of stopping at a 760px height cap. Desktop framing now gives the drone its own right-hand area, while mobile stacks the illustration below the unchanged typography. Browser checks confirmed one panel through every tab selection, retained keyboard focus, working chapter hashes, and canvas coverage on tall desktop and mobile viewports.

Route entrances fade by pathname. There is no exit delay and no transformed ancestor around the fixed hero canvas. Existing route metadata, hash focus, redirects, contact emails, and source links remain. Reduced motion uses static poses and immediate demo state changes. Decorative canvas layers are pointer-inert. Interactive controls remain semantic HTML buttons and links.

One implementation owner changed the application, styles, registry, and scene because their timing is coupled. Independent review found and resolved two issues: pause still allowed scroll flight, and the illustrative detour crossed two walls. Browser inspection also found and resolved mobile overflow from the hidden fallback illustration.

Verification used the T3 browser at 1280 × 800 and 390 × 844. Checks covered forward and reverse flight, the coordinated reveal, static pause mode, all four demo actions, keyboard activation, mobile menu focus and Escape, chapter anchors, direct product routes, the legacy drone redirect, and the not-found route. Disabling WebGL retained the CSS illustration and readable content. Reduced-motion branches were inspected in code. Typecheck, production build, and diff whitespace checks passed. Vite retains a size warning for the lazy Three.js chunk.

The technical visual update preserves all 197 original typography declarations
and every font import. The white/charcoal/red balance is an approximate visual
target rather than a fixed pixel ratio. Navigation and active project tabs use
charcoal; red is reserved for small indicators, registration marks, focus states,
and diagrams. Panels use square corners, hard borders, and selective 45-degree
button cuts. Gradients, glass blur, orbit rings, and soft panel shadows are replaced
by flat surfaces and restrained schematic framing. Existing images and physical
drone geometry remain intact. Desktop and 390 × 844 browser checks covered all
four interactive demos, project tabs, mobile navigation, and the research link.
