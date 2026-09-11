# Guestbook coastal assets

`CoastalScene` is a 16-bit pixel plate inside `site-content`, below `PageHero`. Copy, the form, and the note list sit around it — not on the painting.

- Stills: `coast-{dawn,day,dusk,night}.webp` (1280×720 lossless, reduced-motion fallback)
- Loops: the same names with `.webm` (640×360 VP9, muted). Day is ~98s with one-bottle and several-bottle beats; dawn/dusk/night are ~69s. Idle waves are ping-ponged so the loop returns to the first frame.

`prefers-reduced-motion: reduce` hides the videos and keeps the stills. Clicking the plate picks a random note.
