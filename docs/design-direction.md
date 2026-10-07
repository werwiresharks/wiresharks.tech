# Cinematic product chapters

The approved brief is an independent engineering company spanning Wireshark, Sidekick, Munki, and EveryWay, with Palantir and Shield AI as visual references. The existing React, Vite, Motion, and Three.js architecture remains. The current visual system uses a dominant white canvas, charcoal structure, and restrained tactical red accents.

T3-owned Codex GPT-6 Luna and Antigravity Gemini 3.8 Flash Medium produced two design sketches. An independent Gemini comparison and the coordinating agent selected Luna's natural-scroll chapter structure for factual discipline and a smaller component API. Gemini's camera-facing flight concept informed the foreground pass.

We rejected fabricated performance specifications, telemetry, and client claims. We also rejected pinned storytelling. Each project remains a normal document section with direct navigation, readable copy, its actual status, and existing source links.

The hero drone approaches along the camera direction, banks, and exits diagonally before its geometry can reach the near plane. Home owns one normalized `flightProgress` MotionValue. DroneVisual passes it to DroneScene, and the same value reveals the work introduction and first project heading and copy. Three owns the pose, rotor motion, renderer, and disposal. The scene no longer reads page scroll. Pause replaces the flight with a static hero illustration, stops hover and rotors, and leaves document navigation available.

The registry owns project descriptions, artwork references, source links, and the research brief. The illustrative interactive demos have been removed from both the homepage and product detail pages at the user's request. The primary project artwork, actual screenshots, and drone animation remain.

The work section presents four projects as accessible tabs, with Wireshark selected by default and one expanded chapter at a time. Arrow keys move between tabs; Home and End select the first and last project. Each panel retains its large artwork or existing project image, editorial Geist headings, and compact Geist Mono labels. Sidekick has angular framing and a waveform composition. Wireshark retains its procedural drone and CSS fallback. Munki and EveryWay retain their actual development and demonstration images. Legacy chapter hashes select the matching tab before the page scrolls to it. Narrow layouts retain a clear two-column project row and stack the selected chapter's visual and copy.

The foreground canvas spans the full viewport width and reaches the dynamic viewport bottom. The decorative right-hand grid does not clip the drone, so the left propeller can fly beyond it. The titlebar is an inset, sticky glass bar with charcoal text, direct project links, and an outlined contact action. Its modest rounded corners and translucent white background restore the Palantir reference within the current white, charcoal, and red theme. Mobile uses a matching light dropdown. Mobile stacks the illustration below the unchanged typography. The low-substance approach section has been removed, and projects lead directly to contact.

Route entrances fade by pathname. There is no exit delay and no transformed ancestor around the fixed hero canvas. Existing route metadata, hash focus, redirects, contact emails, and source links remain. Reduced motion uses static poses and immediate demo state changes. Decorative canvas layers are pointer-inert. Interactive controls remain semantic HTML buttons and links.

The Wireshark project panel and product page offer camera orbit controls. Drag rotates the view; scroll and touch pinch zoom within fixed distance limits. A focused viewer supports arrow keys, plus and minus, and Home. Reset view restores the starting camera angle. `ProductArt` opts in with one `interactive` prop, and `DroneScene` owns the camera, controls, and cleanup. Manual input requests a render even while motion is paused or reduced. The CSS fallback shows no orbit instructions or reset control. The hero remains decorative. The model has no onboard spool; the fiber attaches to the underside of the body. The cable continues along its final tangent beyond the camera's far clipping plane, so its endpoint stays hidden from every allowed orbit angle.

One implementation owner changed the application, styles, registry, and scene because their timing is coupled. Independent review found and resolved two issues: pause still allowed scroll flight, and the illustrative detour crossed two walls. Browser inspection also found and resolved mobile overflow from the hidden fallback illustration.

Verification used the T3 browser at 1280 × 800 and 390 × 844. Checks covered forward and reverse flight, the coordinated reveal, static pause mode, all four demo actions, keyboard activation, mobile menu focus and Escape, chapter anchors, direct product routes, the legacy drone redirect, and the not-found route. Disabling WebGL retained the CSS illustration and readable content. Reduced-motion branches were inspected in code. Typecheck, production build, and diff whitespace checks passed. Vite retains a size warning for the lazy Three.js chunk.

The technical visual update preserves all 197 original typography declarations
and every font import. The white/charcoal/red balance is an approximate visual
target rather than a fixed pixel ratio. Navigation and active project tabs use
charcoal; the titlebar uses translucent white. Red is reserved for small indicators, registration marks, focus states,
and technical details. Panels use square corners, hard borders, and selective 45-degree
button cuts. Product panels use flat surfaces and restrained schematic framing;
the titlebar retains glass blur and a subtle shadow. Existing images and physical
drone geometry remain intact. Desktop and 390 × 844 browser checks covered all
four interactive demos, project tabs, mobile navigation, and the research link.
