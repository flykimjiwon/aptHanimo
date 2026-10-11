# V5 instant-start and ground teleport notes

Implemented 2026-10-12. Browser interaction was not run because Ego TaskSpace53 remains behind the user-controlled native permission prompt.

## APIs and behavior

- `SpatialDriver.teleportGround(point: XY): boolean` accepts only finite coordinates inside the loaded world's bounds. It uses the current movement mode, accepts an already passable point, or searches for a passable point within 16 m. It returns `false` without changing motor position, speed, or the active route when validation/search fails. On success it applies DEM height through `MovementMotor.teleport`, clears the old route/destination/recovery state, and stops prior motor velocity.
- Existing `SpatialDriver.teleport(id)` keeps its compatibility behavior for known POIs, unknown-ID home fallback, and the wider car-road search used by named places.
- `Controller.teleportToPlace(id): void` accepts only a place in the current complex's filtered known-place list, changes to the place's authored layer when necessary, preserves the user's movement mode, teleports to the existing `Place.node`, refreshes selection/route UI, and reports the new start immediately. Car starts explicitly say that they use the nearby passable road.
- `ActionContext.teleportToPlace(id)` is available to actions. `teleport-selected` starts at the selected journey place. `teleport-picker` opens the known-place picker.
- `showTeleportDialog(places, selected, onSelect)` uses the existing native dialog and known `Place` records only. It labels ground/source-backed entries as `실제 좌표`, model/interior entries as `구조 예시`, explains car-road projection, invokes the typed callback, and closes.
- The journey card always exposes an enabled `이곳에서 시작` action for its validated `Place`, independently of whether a walking route exists.

No POI coordinate, geographic distance, DEM value, collision geometry, route estimate, movement speed, world style, or camera preference is authored or changed by this flow.

## Automated evidence

- `bun test src/scene/spatial-driver.test.ts`: 4 pass, 0 fail, 51 assertions.
- The test parses all three production worlds (`haiver`, `xi`, `cherbo`) and verifies walk, stroller, bike, and car landings. Returned motor Y matches the loaded DEM, and re-teleporting to the result proves the landing itself is passable for the active mode.
- A real Haiver core-building centroid proves an obstructed request is moved to a passable point no farther than 16 m.
- A live route and accelerated motor prove a successful teleport clears route state and velocity.
- NaN, infinity, and out-of-bounds requests prove failure preserves position and the active route.
- `bun run check`: pass after the bounded source changes.
- Full `bun test`: 66 pass, 0 fail, 2,261 assertions across 14 files.
- `bun run build`: pass; Vite retains the existing warning for a world chunk over 500 kB and precompressed 24 static assets.
- Scoped Biome check for the driver, test, controller, actions, and teleport module: pass.
- Changed behavior files remain at or below 250 nonblank/noncomment lines: spatial driver 246, controller 247, actions 145, UI 247, teleport module 74.

## Integration boundary

Root owns `World.teleportGround(point)` and the `World.teleport(id)` camera snap. This lane does not edit `world.ts`, `main.ts`, or `game-ui.ts`. Browser confirmation of picker focus, journey layout, instant camera position, mobile touch behavior, and rendered terrain remains pending explicit browser access.
