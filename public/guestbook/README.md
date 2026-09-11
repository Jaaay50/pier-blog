# Guestbook coastal assets

`CoastalScene` loads these self-hosted WebP plates from CSS:

- Desktop: `coast-dawn.webp`, `coast-day.webp`, `coast-dusk.webp`, `coast-night.webp`
- Mobile (`max-width: 640px`): `coast-mobile-dawn.webp`, `coast-mobile-day.webp`, `coast-mobile-dusk.webp`, `coast-mobile-night.webp`

Each file is a VP8 WebP with no text, logo, watermark, or extra people. Keep the distant waterline clear for the guestbook Canvas layer.

Desktop plates should share one wide composition; mobile plates should share one vertical composition. Lighting may change across dawn / day / dusk / night. The current set is committed so the scene can ship, but the frames are not yet locked-composition (pose, wardrobe, and foreground props still drift). Replace them in place before treating the crossfade as a time-of-day relight.
