# V5 camera projection notes

Implemented 2026-10-12 in `src/scene/camera.ts` with regression coverage in `src/scene/camera.test.ts`. No browser automation was run because Ego TaskSpace53 remains behind the user-controlled native permission prompt.

## Public API

- `CameraRig.view: WorldView` reports `flat | isometric | perspective`.
- `CameraRig.setView(view: WorldView): void` changes only the presentation camera. It preserves target position, requested/current zoom, follow intent, interior state, and the stored isometric/perspective orbit angle.
- `CameraRig.camera: OrthographicCamera | PerspectiveCamera` returns the active Three.js camera. Flat and isometric use orthographic projection; perspective returns a real `PerspectiveCamera`.
- `CameraRig.snapTo(position): void` immediately copies the supplied `x/y/z` into both the current and desired camera targets and recomputes the active camera. It does not change projection, zoom, orbit, follow intent, or physical/player state.
- Existing `scale(delta)`, `scaleBy(factor)`, `zoomPercent`, `requestedZoom`, `follow`, `toggleFollow`, `rotate`, `project`, `projectBillboard`, and `toWorldInput` contracts remain available.

## Projection behavior

- Flat is an orthographic, high top-down, north-up view. Orbit input is ignored while flat is active, and `toWorldInput([0, 1])` remains geographic north (`-Z`). The stored orbit angle is retained for returning to another view.
- Isometric retains the V4 orthographic framing, default angle `0.62`, follow size `22`, height ratio `1.45`, and zoom range `25–250%`.
- Perspective uses a 45-degree vertical FOV. Camera distance is derived from the requested visible half-height (`size / tan(FOV / 2)`) with an elevation-to-horizontal ratio of `0.8`; it does not inherit the orthographic minimum-distance flattening.
- Narrow-aspect compensation is shared across projections. Resize and every camera update refresh projection and world matrices, so screen projection and `Raycaster.setFromCamera` see the active camera immediately.
- Screen visibility now requires normalized depth within the camera frustum as well as the existing horizontal/vertical label margins.
- Billboard anchors continue to move along camera-local up, keeping name labels above their visual sprite in all three projections.

## Automated evidence

- `bun test src/scene/camera.test.ts`: 12 pass, 0 fail, 136 assertions.
- `bun test src/scene/camera.test.ts src/scene/camera-gesture.test.ts`: 19 pass, 0 fail, 147 assertions.
- Full `bun test`: 52 pass, 0 fail, 2,133 assertions across 11 files.
- `bun run check`: pass.
- `bun run build`: pass; Vite retains the existing warning for a world chunk over 500 kB and precompressed 24 static assets.
- Camera tests cover all three active camera types/views, 16:9 and phone aspect ratios, both zoom bounds, center screen-to-ground rays, target screen projection, resize, flat north-up behavior, disabled flat rotation, isometric/perspective orbiting, perspective elevation and close distance, immediate teleport snap, state preservation, and head-label projection.
- `bunx biome check src/scene/camera.ts src/scene/camera.test.ts`: pass.
- Camera production file length: 231 lines, within the 250 pure-LOC limit.

## Integration boundary

`src/scene/input.ts` required no change: Three.js `Raycaster.setFromCamera` accepts the active camera union and uses the matrices refreshed by `CameraRig`. World/player/UI integration, including calling `setView` and `snapTo`, remains root-owned.

The first integration check briefly observed a concurrent `peer-avatars.ts` signature mismatch from another lane. That edit settled without changes from this lane; the repeated full typecheck, tests, and build all pass. Browser gesture, rendered framing, occlusion, and mobile visual QA remain unverified.
