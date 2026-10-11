# V5 integration code and security review

Reviewed 2026-10-12. This was a read-only review of the V5 world/style/terrain/context integration, camera and teleport integration points, startup/storage/UI boundaries, Three.js resource ownership, and preservation of geographic and movement state. No browser was opened because Ego TaskSpace53 remains behind the user-controlled native permission prompt.

## Verdict

**PASS.** The projection, terrain-style, disposal, storage, source-separation, teleport, and arrival work passes automated integration evidence. All three functional issues and both module-size findings discovered during review are resolved.

## Findings

### Resolved medium — teleporting into community restored modes that the community layer intentionally rejects

**Locations:** `src/teleport-ui.ts:21-47`, `src/controller.ts:64-87`, `src/graph.ts:69-91`, `src/scene/model-driver.ts:23-26`.

`Controller.switchLayer("community")` intentionally converts car and bike to walk. `Controller.setMode()` also sends a user who chooses car or bike while in community back to ground. At review time, `teleportToKnownPlace()` saved the previous mode, called `switchLayer()`, then restored that incompatible mode and rebuilt the player with it.

For car this has an immediate functional effect: community graph edges are `path`, while car routing accepts only `road`, so the teleported user sees no route to another community place. Manual control still moves a car avatar around the interior model because `ModelDriver.manual()` supports every mode. Bike similarly bypasses the explicit community walk-only policy even though its graph can traverse paths.

The helper now leaves the effective mode selected by `switchLayer()` unchanged. `src/teleport-ui.test.ts` runs both car and bike from ground to the known community gym and verifies community layer, walk mode, selected node, world teleport, and HUD node state. Ground speed/style/camera state remains outside this conversion.

### Resolved medium — ordinary point-route completion emitted a stale named arrival

**Locations:** `src/scene/world-step.ts:18-29`, `src/scene/world-step.test.ts`.

`SpatialDriver.step()` distinguishes a named destination (`kind: "arrived"`) from an ordinary point route (`kind: "complete"`). `stepPlayer()` previously converted `complete` into `state.current`, so completing a ground-tap route after home or a POI could emit that old name as a fresh arrival.

`stepPlayer()` now returns a name only for `kind: "arrived"`; ordinary completion returns `null`. The regression drives real XI spatial routes end to end: a point route emits no name, while a named station route still emits exactly `station`.

### Resolved medium — choosing a picker POI did not cancel an armed map teleport

**Locations:** `src/main.ts:22-34`, `src/teleport-ui.ts:45-75`, `src/map-teleport.ts:14-41`.

At review time, the global click handler cancelled map teleport for sidebar places and `teleport-selected`, but picker buttons carried `data-teleport-id` and called their callback directly. A user could arm map teleport, reopen the picker, choose a named POI, and still leave the map prompt armed. Their next ordinary ground tap then performed an unexpected second teleport.

The main click boundary now cancels the armed state for picker open, `data-teleport-id`, selected-place teleport, home, interior entry, complex/layer/mode changes, and sidebar place selection. Camera movement and zoom remain available while armed. A successful ground selection is still one-shot; an unsafe selection is consumed without creating a route and stays armed for retry.

### Resolved low — two behavior modules exceeded the established pure-LOC boundary

**Locations:** `src/scene/world.ts`, `src/world-style-ui.ts`.

At initial review, `world.ts` contained 256 nonblank/noncomment lines and `world-style-ui.ts` contained 303. Frame orchestration and the immutable preset/copy catalog are now extracted. The final counts are 249 for `world.ts`, 36 for `world-frame.ts`, 219 for `world-style-ui.ts`, and 93 for `world-style-presets.ts`.

No behavior change was observed from the extraction; full regression evidence is recorded below.

## Confirmed integration behavior

- `WorldPresentation` is constructed before the constructor calls `setStyle(readWorldStyle())`; player and peer groups also exist before style application. Startup does not dereference an uninitialized presentation or scene object.
- `World.setStyle()` updates camera, player, peers, background, and presentation state. It rebuilds terrain only when building/map style changes and only on the ground layer.
- Terrain replacement is separated from `SpatialDriver`, player position, and the route group. A running real XI route retained the exact motor position, moving state, route metres, and route minutes across flat/ink and realistic/perspective terrain construction and disposal.
- Player and peer style rebuilds copy position/rotation before disposing the previous group. Camera view changes do not respawn the driver or player.
- `World.teleport()` stops the old route, updates the named current node, synchronizes the player, snaps the camera immediately, and emits the new position. `World.teleportGround()` rejects non-ground/unsafe requests and synchronizes player/camera only after driver success.
- All 23 named home/POI car teleports across Haiver, Xi, and Cherbo landed on points that `SpatialNavigation.passable(..., "car")` accepted.
- Flat-roof height compression is applied to the render group only. The source `SpatialBuilding`, collision/navigation data, DEM grid, route distance/time, and motor coordinates are unchanged. The style dialog and map evidence identify style compression and unsurveyed visual elements as presentation.
- Neighborhood context is local Zod-validated data. All 498 area/line points across the three complexes lie inside their corresponding world bounds; the records retain OSM sources and checked dates. Context geometry does not enter collision/navigation data.

## Three.js ownership and disposal evidence

A source-level Three.js exercise built and disposed 66 production terrain groups: every building style and every map style for each of the three real worlds. It also compared each parsed `SpatialWorld` before and after every build.

- Spatial data mutations: **0**.
- Geometry dispose events: **46,269 / 46,269** unique geometries.
- Material dispose events: **86,727 / 86,727** unique materials.
- Texture dispose events: **42 / 42** unique assigned textures.

`WorldSurface.replaceMap()` disposes the previous map before replacement. Shared procedural maps are deduplicated by `disposeGroup()`, generated textures are reachable through owned materials, and the fixed 128×128 texture generator has no user-controlled allocation size. Style changes therefore showed no orphaned geometry/material/texture in the exercised ownership path.

## Security review

No security vulnerability was found in the reviewed V5 scope.

- URL and stored world-style fields are constrained by Zod enums before use; arbitrary class names, shader input, asset paths, or remote URLs cannot enter the renderer through these fields.
- Storage JSON parse failure and `DOMException` denial fall back safely. Style save URLs remain same-origin and preserve unrelated query/hash state.
- World-style dialog strings come from local catalogs and are escaped where interpolated. Event listeners are bounded by an `AbortController` when the dialog is reopened or closed.
- Teleport picker entries come only from the filtered known-place list; names, categories, and IDs are escaped before HTML insertion. Unknown IDs cannot reach `World.teleport()` through the controller flow.
- Context JSON is bundled locally and schema-validated for finite coordinates, closed typed areas/lines, URL-shaped source metadata, and fixed known kinds. No reviewed path fetches those source URLs at runtime.
- Procedural textures are fixed-size local byte arrays. No canvas taint, external image decode, dynamic code execution, secret, credential, or unrestricted network request was introduced.
- SVG minimap geometry uses schema-parsed finite numeric coordinates and known path/building kinds; user-authored HTML does not enter its geometry markup.

## Automated evidence

- `bun test`: **74 pass, 0 fail**, 2,861 assertions across 17 files.
- `bun run check`: **PASS**.
- V5 world-style tests cover all 11 building treatments, all 11 map themes, immutable source footprints/elevations, DEM-grounded foundations, and sourced neighborhood context.
- Existing camera, gesture, navigation, motor, 16× speed, teleport-ground, avatar, disposal, brand, and storage regressions all pass.
- `bun run build`: **PASS**, with 27 static assets precompressed. The existing warning remains for the 622.49 kB world chunk.

## Verification boundary

This report does **not** claim rendered appearance, responsive layout, dialog focus, pointer/keyboard/touch interaction, actual frame cadence, or physical-device behavior. Those checks remain pending explicit return of the browser lane.
