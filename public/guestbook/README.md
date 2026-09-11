# Guestbook coastal assets

The eight WebP files referenced by `CoastalScene` are intentionally pending image-provider output.

Required files:

- `coast-dawn.webp`, `coast-day.webp`, `coast-dusk.webp`, `coast-night.webp`
- `coast-mobile-dawn.webp`, `coast-mobile-day.webp`, `coast-mobile-dusk.webp`, `coast-mobile-night.webp`

Each asset must be a self-hosted WebP with no text, logo, watermark, metadata, or additional people. Desktop variants use the same wide composition; mobile variants use the same vertical composition. Keep the distant waterline clear for the real guestbook Canvas layer.

Cloudborne advertises `gpt-image-1`, `gpt-image-1.5`, and `gpt-image-2`, but the supplied endpoint returned 404 for `/images/generations`; its Responses image-tool requests also failed upstream. Placeholder or synthetic images are therefore not committed.
