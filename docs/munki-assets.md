# Munki source assets and product notes

Source inspected read-only: `/Users/tarushvkosgi/Downloads/munki-source` (2026-10-07). Its `AGENTS.md` says not to build this artifact outside its builder interface. No app was started and no new screenshot was captured.

## Copied assets

The following user-provided assets are in `public/assets/munki/`:

- `munki-feed-desktop.png` — existing latest desktop audit capture (`audits/latest/screenshot.png`, 1440×900), showing the home feed, study hour prompt, cram queue, flashcard feed, and navigation.
- `munki-feed-mobile.png` — existing latest mobile audit capture (`audits/latest/screenshot-mobile.png`, 390×844), same feed at mobile size.
- `munki-lesson15-short.mp4` — supplied in-app lesson video (`client/src/assets/videos/lesson15/short.mp4`), a short MA 162 trig-substitution lesson.

The audit captures are authentic app output, but show the feed mid-session. The desktop capture has some card text clipped at the top; the mobile capture also has overlapping card content. Treat them as visual references, not polished marketing screenshots. The source contains no standalone brand logo file. Munki's small mascot is drawn in the interface; don't present an extracted screen detail as a clean logo.

## Marketing image curation (2026-10-07)

Reviewed existing PNG captures and audit reports under `/Users/tarushvkosgi/Downloads/munki-source/audits`, including the October 7 feed capture and October 5 watch captures. The checked captures show the feed, watch player, or a daily-class setup dialog; none provides a coherent, nonclipped learning canvas, Teach Munki interaction, or guided lesson view. No new image was copied. `munki-feed-desktop.png` remains the best available original for a broad product overview, with its existing top-edge card-text clipping disclosed above.

## Implemented in source

Evidence from `client/src/App.tsx`, `Lessons.tsx`, `StudyLab.tsx`, `TeachMunki.tsx`, `DailyStudyHour.tsx`, `server/src/actions.ts`, and `client/src/video-registry.ts`:

- Study feed with flip/reveal flashcards, Again/Good-style grading, spaced review intervals, deck filtering, and card image zoom.
- Deck creation and editing; practice, weakest-first cram queue, and timed Blitz review.
- Lesson library with resumable 45/60-minute guided lessons: concept bites, decision drills, worked problems with a drawing board, Teach Munki, and recall checks. Progress is saved and completion awards XP.
- Watch feed with bundled short/explainer videos, assessment-aware ordering, playback progress, and a one-time completion reward.
- Teach Munki interaction that evaluates a learner's explanation, responds as a student with a follow-up question, and can include a whiteboard snapshot; voice input is offered when browser speech recognition is available.
- Daily study-hour sessions, focus/study lab, activity/XP levels, combos, streaks, quests, and a persistent mascot with unlockable cosmetics.

These are code-backed features; whether every service-dependent interaction succeeds in production depends on the artifact runtime and its configured inference service.

## Planned versus implemented

`DATA-PLAN.md` documents supplied lesson videos, build-time synchronization/manifest rules, assessment dates, runtime storage behavior, and mascot-state persistence. It describes data and asset plumbing, not a separate product roadmap. I found no clear roadmap or `coming soon` feature list in the inspected source. Do not describe hypothetical future functionality as committed or shipped.

The app itself is an unpublished artifact. The audit JSON reports an internal `.invalid` capture URL; do not expose it as a public product link. Per the source instructions, a fresh local run/screenshot is not appropriate from this research pass; use the artifact builder workflow if an updated capture is needed.
