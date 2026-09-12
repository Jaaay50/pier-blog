# Guestbook coastal assets

`CoastalScene` is a 16-bit pixel plate inside `site-content`, below `PageHero`. Copy, the form, and the note list sit around it — not on the painting.

- Stills: `coast-{dawn,day,dusk,night}.webp` (1280×720 lossless, reduced-motion fallback)
- Loops: each period has four plates. Dawn/day/dusk keep the original `coast-{period}.webm` plus `coast-{period}-{1..3}.webm`. Night stays `coast-night-{0..3}.webm`. The player stores the last clip in `localStorage` and the next visit/refresh always picks a different one. Only the chosen clip is downloaded.

`prefers-reduced-motion: reduce` hides the videos and keeps the stills. Clicking the plate picks a random note.
