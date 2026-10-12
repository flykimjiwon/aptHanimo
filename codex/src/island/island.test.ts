import { expect, test } from "bun:test";
import { Box3, InstancedMesh, Vector3 } from "three";
import { z } from "zod";
import { disposeGroup } from "../scene/materials";
import { parseSpatial } from "../spatial/load";
import type { XY } from "../spatial/types";
import { islandBuilding } from "./buildings";
import { disposeIsland } from "./dispose";
import { islandGarden } from "./garden";
import { islandLand } from "./land";
import { PALETTES } from "./palettes";
import {
  HEIGHT_SCALE,
  IslandNavigation,
  insideRing,
  islandPaths,
  ringClearance,
  SITE_RING,
} from "./site";
import { IslandWalk } from "./walk";

const world = parseSpatial(await Bun.file("public/worlds/xi.json").json());
const core = world.buildings.filter((b) => b.kind === "core");

test("changing an island releases instanced GPU buffers as well as shared geometry", () => {
  const garden = islandGarden(world, PALETTES.garden);
  let instances = 0,
    released = 0;
  garden.traverse((object) => {
    if (object instanceof InstancedMesh) {
      instances++;
      object.addEventListener("dispose", () => {
        released++;
      });
    }
  });
  expect(instances).toBe(3);
  disposeIsland(garden);
  expect(released).toBe(instances);
  expect(garden.children).toHaveLength(0);
});

test("island outline is the source Xi boundary in the original metre coordinate system", async () => {
  const point = z.object({ x: z.number(), y: z.number() });
  const schema = z.object({
    body: z.object({
      data: z.object({ groupPolygons: z.array(z.array(z.array(z.array(point)))) }),
    }),
  });
  const source = schema.parse(await Bun.file("research/spatial/xi-hogang-polygon.json").json());
  const ring = source.body.data.groupPolygons[0]?.[0]?.[0];
  expect(ring?.length).toBe(SITE_RING.length);
  ring?.forEach((p, i) => {
    expect(SITE_RING[i]?.[0]).toBeCloseTo(
      (p.x - world.origin.longitude) * 111320 * Math.cos((world.origin.latitude * Math.PI) / 180),
      2,
    );
    expect(SITE_RING[i]?.[1]).toBeCloseTo(-(p.y - world.origin.latitude) * 111320, 2);
  });
  expect(core).toHaveLength(7);
  for (const building of core)
    for (const p of building.ring) expect(insideRing(p) || ringClearance(p) < 0.1).toBe(true);
});

test("island scenery is finite and keeps all source geometry immutable in every palette", () => {
  const original = JSON.stringify(world);
  for (const palette of Object.values(PALETTES)) {
    const land = islandLand(world, palette),
      garden = islandGarden(world, palette);
    expect(garden.userData.treeCount).toBeGreaterThan(15);
    expect(garden.userData.pathSegments).toBeGreaterThan(10);
    for (const building of core) {
      const mesh = islandBuilding(building, world, palette);
      const size = new Box3().setFromObject(mesh).getSize(new Vector3());
      expect(size.toArray().every(Number.isFinite)).toBe(true);
      expect(size.y).toBeCloseTo(building.height * HEIGHT_SCALE + 1.65, 1);
      expect(mesh.userData.buildingId).toBe(building.id);
      disposeIsland(mesh);
    }
    expect(new Box3().setFromObject(land).isEmpty()).toBe(false);
    disposeGroup(land);
    disposeIsland(garden);
  }
  expect(JSON.stringify(world)).toBe(original);
});

test("visible source path pieces stay within the irregular boundary", () => {
  const segments = islandPaths(world);
  expect(segments.length).toBeGreaterThan(10);
  for (const segment of segments)
    for (const point of [segment.from, segment.to]) {
      expect(insideRing(point)).toBe(true);
      expect(ringClearance(point)).toBeGreaterThan(segment.width / 2 + 0.6);
      expect(world.paths.some((p) => p.source === segment.source)).toBe(true);
    }
});

test("walking routes cannot cut across the island's concave edge or buildings", () => {
  const nav = new IslandNavigation(world);
  const start = nav.nearestPassable([40, 85], "walk", 30),
    goal = nav.nearestPassable([0, -140], "walk", 30);
  if (!start || !goal) throw new RangeError("Missing test endpoints");
  const path = nav.path(start, goal, "walk");
  expect(path).not.toBeNull();
  if (!path) throw new RangeError("Missing island route");
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    if (!a || !b) throw new RangeError("Missing route segment");
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let j = 0; j <= steps; j++) {
      const p: XY = [a[0] + ((b[0] - a[0]) * j) / steps, a[1] + ((b[1] - a[1]) * j) / steps];
      expect(nav.passable(p, "walk")).toBe(true);
      expect(insideRing(p)).toBe(true);
      expect(ringClearance(p)).toBeGreaterThan(1.799);
      expect(core.every((b) => !insideRing(p, b.ring) && ringClearance(p, b.ring) > 1.799)).toBe(
        true,
      );
    }
  }
  expect(nav.passable([150, -150], "walk")).toBe(false);
});

test("the friend walks, stays on the island, stops, and rejects an outside destination", () => {
  const walk = new IslandWalk(world),
    start = walk.position;
  walk.start();
  let traveled = 0;
  for (let frame = 0; frame < 2400; frame++) {
    traveled += walk.update(1 / 60, [0, 0], false);
    expect(walk.navigation.passable([walk.position.x, walk.position.z], "walk")).toBe(true);
  }
  expect(traveled).toBeGreaterThan(40);
  expect(walk.position).not.toEqual(start);
  walk.pause();
  const stopped = walk.position;
  walk.update(1, [1, 0], false);
  expect(walk.position).toEqual(stopped);
  expect(walk.goTo([500, 500])).toBe(false);
  expect(walk.active).toBe(false);
  disposeGroup(walk.group);
});
