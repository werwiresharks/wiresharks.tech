# Project asset research

Research checked 2026-10-07 against [tarushv.com](https://tarushv.com/), its linked [GitHub profile](https://github.com/tarushvkodes), the [EveryWay Devpost page](https://devpost.com/software/everyway), and the [useEveryWay GitHub organization](https://github.com/useEveryWay). These notes separate statements shown by those sources from details not found publicly.

## Downloaded originals

| Local file | What it depicts | Source |
| --- | --- | --- |
| `public/assets/everyway/digital-twin.jpeg` | EveryWay 3D twin with a sensor and route obstruction. | Portfolio-owned asset, [tarushv.com source](https://tarushv.com/assets/everyway/digital-twin.jpeg). |
| `public/assets/everyway/physical-prototype.jpeg` | Photograph of the physical miniature venue and sensor wiring. | Portfolio-owned asset, [tarushv.com source](https://tarushv.com/assets/everyway/physical-prototype.jpeg). |
| `public/assets/everyway/physical-model.jpeg` | Physical venue model from the project gallery. | Team-published original, [Devpost image 1](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/127/datas/original.jpeg). |
| `public/assets/everyway/digital-twin-render.jpeg` | Digital twin rendering with a blocked route. | Team-published original, [Devpost image 2](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/613/datas/original.jpeg). |
| `public/assets/everyway/point-cloud-view.jpeg` | Point-cloud visualization of the venue model. | Team-published original, [Devpost image 3](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/614/datas/original.jpeg). |
| `public/assets/everyway/hackgt-team.jpeg` | Team and project booth photo. | Team-published original, [Devpost image 4](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/635/datas/original.jpeg). |
| `public/assets/everyway/operator-dashboard.jpg` | Venue operator dashboard with active route and sensor status. | Team-published original, [Devpost image 5](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/964/datas/original.png). |
| `public/assets/everyway/mobile-route.jpg` | Mobile live navigation route screen. | Team-published original, [Devpost image 6](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/965/datas/original.png). |
| `public/assets/everyway/access-planning-form.jpg` | Public provider lookup and access-planning view. | Team-published original, [Devpost image 7](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/966/datas/original.png). |
| `public/assets/everyway/visitor-needs-review.jpg` | Visitor review of extracted travel needs. | Team-published original, [Devpost image 8](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/967/datas/original.png). |
| `public/assets/everyway/access-summary.jpg` | Clinician-facing draft summary, with no message sent. | Team-published original, [Devpost image 9](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/968/datas/original.png). |
| `public/assets/everyway/mobile-route-ready.jpg` | Mobile review screen showing the route is ready. | Team-published original, [Devpost image 10](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/401/969/datas/original.png). |

The Devpost images are originals posted by the EveryWay project team, rather than portfolio-owned copies. Check the team's preferred credit before external publication. No video file was downloaded. The demo is embedded at [YouTube](https://www.youtube.com/watch?v=v-77jqpUDio) and can be linked or embedded remotely.

## Verified descriptions and links

### Fiber-Optic Drone

`public/research/fiber-optic-drone-communication.pdf` is the original user-supplied
research brief, titled *Fiber-Optic Communication for Small Drones*, by Tarushv
Kosgi and Siddharth Gunti. It is two pages and describes the proposed system,
research questions, and staged development plan; it does not report measured
results. The Wireshark product page links it below the project summary. The PDF
is published without modifying its contents.

The portfolio describes a co-developed drone with a fiber-optic command and data link, C++ software, fiber deployment/retraction, and reliability testing. It describes intended use in enclosed spaces, underground sites, and areas with heavy electromagnetic interference. The résumé expands its stated design use to RF-denied environments and industrial/disaster-response scenarios. Those are portfolio/resume descriptions, not independently validated performance claims. Details: [portfolio résumé section](https://tarushv.com/resume.html#fiber-optic-drone).

No project-specific repository, image, screenshot, or video was linked from the portfolio or found in the linked GitHub profile's public repository list. Do not use unrelated fiber-drone imagery as if it depicted this project.

### Sidekick

The public [get-sidekick/sidekick repository](https://github.com/get-sidekick/sidekick) is the current source of product details. Its [native macOS README](https://github.com/get-sidekick/sidekick/blob/main/SwiftApp/README.md) documents a SwiftUI app for macOS 14+ on Apple Silicon. The repository's agent guide identifies `SwiftApp/` as the active application and the root Electron app as an older proof of concept.

The native app's documented production path uses local Parakeet transcription and local Phi-4 Mini answers through Ollama. A configurable wake phrase gates answers; transcript retrieval and session state stay in memory; answers are spoken through a selected local output device. Gemma audio transcription is experimental. Wispr Flow is an optional cloud transcription mode that sends speech segments to Wispr when selected; the guide says the implementation has not been tested against the live API. These are repository-documented features, not independent runtime verification.

The repository links to [Ollama](https://ollama.com/download) and [Wispr Flow API documentation](https://api-docs.wisprflow.ai/). No standalone product website or public app download is linked. GitHub currently lists no release, so public distribution is unverified. The README's future screen or image input is a possibility, not an implemented feature. A Windows-compatible shell is also future work; the root Electron proof of concept does not make the active SwiftUI app cross-platform.

| Local file | What it depicts | Source |
| --- | --- | --- |
| `public/assets/sidekick/icon.png` | Sidekick app icon, 1024 × 1024 PNG. | [Repository asset](https://github.com/get-sidekick/sidekick/blob/main/assets/icon.png). |
| `public/assets/sidekick/icon.svg` | Vector version of the Sidekick app icon. | [Repository asset](https://github.com/get-sidekick/sidekick/blob/main/assets/icon.svg). |

Both files are copied from the public repository's `assets/` directory. That directory contains no screenshots or product photos, so none are listed here.

### Munki learning app

The user supplied local source at `/Users/tarushvkosgi/Downloads/munki-source`. See [Munki assets and source notes](munki-assets.md) for copied screenshots, video, and code-backed features. The app remains unpublished. Its source was imported into the private werwiresharks/munki repository at the user's request; hosting is deferred.

### EveryWay

The portfolio describes EveryWay as a live accessibility digital twin. It says an ESP32-C3 and time-of-flight sensor detect obstructions, which update shared world state, accessible routing, mobile navigation, a 3D twin, and an operator dashboard. It reports a 36-hour four-person build and top-10% overall placement at HackGT 13. The [Devpost project page](https://devpost.com/software/everyway) describes the demonstration loop: sensor-observed change updates the twin and causes the old route to be replaced. It names the sensor as VL53L1X and the repositories as Beacon, Conduit, Atlas, Enigma, EveryWay, and Harbor.

The portfolio links [Devpost](https://devpost.com/software/everyway), not a source repository. The Devpost page links the [useEveryWay organization](https://github.com/useEveryWay), whose public repos are [everyway-public](https://github.com/useEveryWay/everyway-public), [enigma-public](https://github.com/useEveryWay/enigma-public), [beacon-public](https://github.com/useEveryWay/beacon-public), [conduit-public](https://github.com/useEveryWay/conduit-public), [atlas-public](https://github.com/useEveryWay/atlas-public), and [harbor-public](https://github.com/useEveryWay/harbor-public). The organization describes these as sanitized public source snapshots. The linked [demo video](https://www.youtube.com/watch?v=v-77jqpUDio) was left hosted remotely because the task excludes large videos.
