# Verification

Checked on 2026-10-07 through the T3 collaborative preview.

The titlebar restoration and drone interaction update were also checked on this date.

- The floating titlebar fits desktop widths of 768 and 1280 pixels and mobile widths of 320 and 390 pixels. It remains inset while scrolling. The mobile menu retains focus handling and Escape behavior.
- The Wireshark viewer responds to scripted mouse drag and touch pinch, and native keyboard input changes its rendered camera. Zoom stops at its distance limits. Reset view restores the starting camera.
- Camera input remains available while paused and with reduced motion. Browser instrumentation confirmed that rendering stops between manual inputs in these states.
- The homepage flagship panel and product detail both enable the controls. The hero keeps pointer events disabled. Product route changes remount the viewer.
- Simulated WebGL unavailability shows the CSS fallback without orbit instructions or reset controls. The viewer controls fit narrow layouts without document horizontal overflow.
- The updated model uses a thin frame, slim arms, a compact center, and short landing feet. Its onboard spool geometry is removed, and the cable attaches directly to the underside. Executing the actual cable construction confirmed that its endpoint lies beyond the full allowed view frustum, including the maximum zoom-out distance.
- Typecheck, production build, and diff whitespace checks pass. The existing Three.js chunk-size advisory remains.

- Production build and TypeScript check pass.
- Homepage and all four product pages render. All inspected project images load.
- Desktop layouts inspected at 1280 and 1440 pixels. Mobile checked at 390 and 320 pixels with no document horizontal overflow.
- Mobile menu opens, focuses the first link, closes on Escape, and returns focus to its toggle.
- Product tabs respond to ArrowDown on desktop, ArrowRight on mobile, and End and update their selected state and associated panel.
- Keyboard route activation reaches EveryWay and focuses the new main content. A coordinate click on the flagship CTA reaches /products/wireshark.
- The old /products/fiber-optic-drone route redirects to /products/wireshark.
- The foreground drone accelerates diagonally off-screen while scrolling down, stays invisible below the hero, and fades into its original position with grain and blur when returning. Browser checks confirmed opacity 0 below the hero and 1 at the top. Its layer does not receive pointer input.
- Mobile has a three-line poster heading, closer drone crop, full-width product imagery and horizontal product tabs. Latest 320px check found no document overflow; homepage axe check returned zero violations.
- Hero rotor speed ramps with scroll activity, replacing blades with translucent discs at high speed. Product views use slow visible rotors and a pause control. The requested concept caption and product-page “Flagship” label were removed.
- Axe-core 4.10.3 WCAG 2 A/AA and 2.1 AA checks returned no violations on the homepage and four product pages after fixing inactive tab-label contrast. Automated checks do not establish complete accessibility conformance.
- Reduced-motion and WebGL fallback paths were reviewed in source. Full Lighthouse and low-end-device performance runs were not performed.

The isolated Three.js vendor chunk triggers Vite's 500 kB size advisory. It is loaded separately from the application bundle. No website deployment was performed.

T3-owned tasks used Codex GPT-6 Luna for asset research and bounded review, Antigravity Gemini 3.8 Flash Medium for design comparison, and Codex GPT-6 Astra for implementation. Task metadata confirmed those provider/model assignments. The parent inspected the resulting source and browser output.
