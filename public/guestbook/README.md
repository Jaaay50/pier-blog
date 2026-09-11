# Guestbook coastal assets

`CoastalScene` loads locked-composition plates from CSS, then fades an 8-second looping WebM over the active period.

- Desktop stills: `coast-dawn.webp`, `coast-day.webp`, `coast-dusk.webp`, `coast-night.webp`
- Mobile stills (`max-width: 640px`): `coast-mobile-dawn.webp` … `coast-mobile-night.webp`
- Matching loops: the same filenames with `.webm`

All eight stills share one camera, pose, wardrobe, and waterline. Only lighting changes across dawn / day / dusk / night. Keep the distant waterline clear for the guestbook Canvas layer. No text, logo, watermark, or extra people.

Stills were generated through the Codex Image2 CLI against `https://api.cloudborne.cn/v1` with `gpt-image-2` (`gpt-image-2.5-flare` / `sunburst` returned 502 on this key). Dusk is the master; the other periods are lighting edits. Loops are Ken Burns pans encoded from those stills (`libvpx-vp9`, 8s, 24fps). `prefers-reduced-motion: reduce` hides the videos and keeps the stills.
