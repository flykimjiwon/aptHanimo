import { describe, expect, test } from "bun:test";
import type { Mode } from "../data";
import { parseSpatial } from "../spatial/load";
import type { SpatialWorld, XY } from "../spatial/types";
import { SpatialDriver } from "./spatial-driver";

const WORLD_IDS = ["haiver", "xi", "cherbo"] as const;
const MODES: readonly Mode[] = ["walk", "stroller", "bike", "car"];

async function world(id: (typeof WORLD_IDS)[number]): Promise<SpatialWorld> {
  const value: unknown = await Bun.file(
    new URL(`../../public/worlds/${id}.json`, import.meta.url),
  ).json();
  return parseSpatial(value);
}

function teleportCandidate(data: SpatialWorld, mode: Mode): XY {
  if (mode !== "car") return data.spawn;
  const road = data.paths.find((path) => path.kind === "road" && path.width >= 2.4);
  const point = road?.points[Math.floor((road.points.length - 1) / 2)];
  if (!point) throw new RangeError(`No car road in ${data.id}`);
  return point;
}

function movableRoute(driver: SpatialDriver): ReturnType<SpatialDriver["planTo"]> {
  for (const poi of driver.data.pois) {
    const route = driver.planTo(poi.id);
    if (route?.points && route.points.length > 1) return route;
  }
  return null;
}

describe("SpatialDriver teleportGround", () => {
  test("lands on passable DEM terrain in every actual world and mode", async () => {
    for (const id of WORLD_IDS) {
      const data = await world(id);
      for (const mode of MODES) {
        const driver = new SpatialDriver(data, mode);
        expect(driver.teleportGround(teleportCandidate(data, mode))).toBe(true);
        const landed: XY = [driver.position.x, driver.position.z];
        expect(driver.teleportGround(landed)).toBe(true);
        expect(driver.position.y).toBeCloseTo(driver.heightAt(landed), 8);
      }
    }
  });

  test("clears an old route and stopped motor only after a safe landing", async () => {
    const data = await world("xi");
    const driver = new SpatialDriver(data, "walk");
    const route = movableRoute(driver);
    if (!route) throw new RangeError("XI fixture has no reachable route");
    expect(driver.move(route)).toBe(true);
    expect(driver.moving).toBe(true);
    driver.step(1 / 30, [1, 0], false);

    expect(driver.teleportGround(data.spawn)).toBe(true);
    expect(driver.moving).toBe(false);
    const landed = driver.position;
    driver.step(1 / 30, [0, 0], false);
    expect(driver.position).toEqual(landed);
  });

  test("moves an obstructed request only to a nearby passable point", async () => {
    const data = await world("haiver");
    const building = data.buildings.find((candidate) => candidate.kind === "core");
    if (!building) throw new RangeError("Haiver fixture has no core building");
    const requested: XY = [
      building.ring.reduce((sum, point) => sum + point[0], 0) / building.ring.length,
      building.ring.reduce((sum, point) => sum + point[1], 0) / building.ring.length,
    ];
    const driver = new SpatialDriver(data, "walk");

    expect(driver.teleportGround(requested)).toBe(true);
    const landed: XY = [driver.position.x, driver.position.z];
    expect(Math.hypot(landed[0] - requested[0], landed[1] - requested[1])).toBeGreaterThan(0.5);
    expect(Math.hypot(landed[0] - requested[0], landed[1] - requested[1])).toBeLessThanOrEqual(16);
    expect(driver.teleportGround(landed)).toBe(true);
  });

  test("rejects non-finite and out-of-bounds points without changing state", async () => {
    const data = await world("cherbo");
    const driver = new SpatialDriver(data, "walk");
    const route = movableRoute(driver);
    if (!route) throw new RangeError("Cherbo fixture has no reachable route");
    expect(driver.move(route)).toBe(true);
    const before = driver.position;

    expect(driver.teleportGround([Number.NaN, 0])).toBe(false);
    expect(driver.teleportGround([0, Number.POSITIVE_INFINITY])).toBe(false);
    expect(driver.teleportGround([data.bounds.maxX + 1, data.bounds.maxZ])).toBe(false);
    expect(driver.position).toEqual(before);
    expect(driver.moving).toBe(true);
  });
});
