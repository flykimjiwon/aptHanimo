# V5 style selection and spatial evidence notes

Reviewed 2026-10-12 from the current app code and local spatial research records. No browser was opened; TaskSpace 53 remains paused under its existing location-permission prompt.

## Style picker and storage

- `showWorldStyleDialog(style, onChange)` reuses the main app's native `dialog`. Seven named presets sit above four labeled selectors: character, building, map, and view. Option names and descriptions come from the style-lab catalogs; the two `realistic` options have explicit local labels because they are main-world-specific.
- Presets are cozy 2.5D, clay 3D, voxel 3D, paper 2.5D, ink 2D, watercolor 2.5D, and field-style 3D. Selection calls `onChange` immediately and leaves the dialog open so the current site can be compared. Each selector and preset control has a 44px minimum target. The note distinguishes display style from geometry, route, elevation, collision, and speed.
- New users resolve to `round-buddy + soft-isometric + soft-village + isometric`. Valid explicit query fields override the saved style field by field; malformed query values are ignored, and malformed or unavailable saved JSON falls back to the default. The storage key is `hanbakwi-world-style-v1`.
- `saveWorldStyle` stores the complete schema and replaces the four style query keys while preserving other query parameters, the current route, and the hash. If local storage is blocked, it still updates the URL and returns `false`.
- `worldStyleUrl` targets the main-world root route, writes the style keys, optionally writes a typed complex and night flag, and preserves unrelated query values such as speed plus the hash. The lab handoff button sends its current character, building, map, complex, and night selection; it sets view to isometric as the lab has no camera projection control.

## What the source data can support

The local spatial quality record ([`QUALITY.md`](../../research/spatial/QUALITY.md)) and the checked-in world JSONs describe the renderable ground surface:

| Complex | Origin elevation | DEM values in local grid | Core-building height evidence |
|---|---:|---:|---|
| Haiver | 60.29 m | 20.27–98.12 m absolute | 15 buildings; OSM height tags, 37–51 m |
| Wangsimni Xi | 62.84 m | 24.26–104.17 m absolute | 7 buildings; two OSM heights, five estimated from published 20 floors × 3 m = 60 m |
| Cherbo Summit | 38.94 m | 12.35–116.02 m absolute | 7 buildings; all estimated from published maximum 35 floors × 3 m = 105 m because per-building heights are unavailable |

These absolute terrain values are samples across 1.3 km square bounds (±650 m). The stored grid is 65 × 65 at about 20.3 m spacing, bilinearly resampled from 30 m SRTM source data. The denser render grid does not improve the original elevation resolution. It cannot support curb, ramp, stair, retaining-wall, entrance, drainage, or accessibility claims.

Core apartment outlines come from the public Hogangnono polygon endpoint; the local research notes say that source does not carry a stated commercial-reuse license. Core footprints and associated model heights are separate from terrain elevation. Surrounding footprints and roads are OSM; missing building heights use levels × 3 m or a 9 m render default. Missing road widths use road-class render defaults and are not measured sidewalk widths.

The photo record ([`PHOTO_OBSERVATIONS.md`](../../research/spatial/PHOTO_OBSERVATIONS.md)) confirms site appearance at a high level but does not add surveyed coordinates or measured heights. Photos may inform a visual profile; they do not locate real gates, paths, doors, or landscape elements. Keep internal community/parking layers labeled as structural examples where verified floorplans are absent. Do not convert downloaded map imagery or apartment photos into world textures.

## Verification status

`bun run check` passed. `bun test src/world-style-storage.test.ts` passed all five storage-boundary scenarios, including URL precedence, malformed query fallback, query/hash preservation, share-link targeting, and denied storage. Biome formatted the owned TypeScript files; its remaining dataset-key suggestions are informational and conflict with the project's bracket-access convention for index-signature properties.

Rendered modal interaction, lab navigation in Chromium, responsive screenshots, and main-world style application still need browser QA after the existing user-controlled TaskSpace 53 prompt is resolved. No new browser or TaskSpace was created for this work.
