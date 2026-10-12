import { describe, expect, test } from "bun:test";
import { parseSpatial } from "../spatial/load";
import type { SpatialWorld } from "../spatial/types";
import { SpatialNavigation } from "./navigation";
import { SpatialDriver } from "./spatial-driver";

const world: SpatialWorld = {
  id: "test",
  name: "Test world",
  origin: { longitude: 0, latitude: 0, elevation: 100 },
  bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
  spawn: [-8, 0],
  elevation: {
    columns: 2,
    rows: 2,
    values: [100, 102, 104, 106],
    source: "fixture",
    resolution: "20m",
    status: "measured",
  },
  buildings: [
    {
      id: "block",
      name: "Block",
      ring: [
        [-2, -3],
        [2, -3],
        [2, 3],
        [-2, 3],
      ],
      height: 8,
      heightSource: "fixture",
      kind: "building",
      source: "fixture",
    },
  ],
  paths: [
    {
      id: "road",
      name: "Road",
      points: [
        [-9, -7],
        [9, -7],
      ],
      width: 5,
      kind: "road",
      source: "fixture",
    },
    {
      id: "steps",
      name: "Steps",
      points: [
        [-5, 7],
        [5, 7],
      ],
      width: 2,
      kind: "steps",
      source: "fixture",
    },
  ],
  pois: [{ id: "goal", name: "Goal", position: [8, 0], source: "fixture" }],
  sources: [],
};

describe("SpatialNavigation", () => {
  test("routes a walker around an inflated building footprint", () => {
    // Given
    const navigation = new SpatialNavigation(world);

    // When
    const path = navigation.path([-8, 0], [8, 0], "walk");

    // Then
    expect(path).not.toBeNull();
    expect(path?.some(([x, z]) => Math.abs(x) > 2.4 || Math.abs(z) > 3.4)).toBe(true);
  });

  test("keeps cars on mapped roads", () => {
    // Given
    const navigation = new SpatialNavigation(world);

    // When
    const onRoad = navigation.passable([0, -7], "car");
    const onGrass = navigation.passable([0, 7], "car");

    // Then
    expect(onRoad).toBe(true);
    expect(onGrass).toBe(false);
  });

  test("samples elevation relative to the world origin", () => {
    // Given
    const navigation = new SpatialNavigation(world);

    // When
    const height = navigation.heightAt([0, 0]);

    // Then
    expect(height).toBeCloseTo(3, 5);
  });
});

const xi = parseSpatial(await Bun.file("public/worlds/xi.json").json());

describe("actual-world navigation", () => {
  for (const complex of ["haiver", "xi", "cherbo"] as const) {
    test(`${complex} car routes reach every mapped POI approach without crossing obstacles`, async () => {
      const data = parseSpatial(await Bun.file(`public/worlds/${complex}.json`).json());
      const navigation = new SpatialNavigation(data);
      const driver = new SpatialDriver(data, "car");
      for (const poi of data.pois) {
        driver.teleport("home");
        const route = driver.planTo(poi.id);
        expect(route, `${complex}/${poi.id} car approach`).not.toBeNull();
        if (!route?.points) throw new RangeError(`${complex}/${poi.id} car route missing`);
        for (let index = 1; index < route.points.length; index += 1) {
          const from = route.points[index - 1];
          const to = route.points[index];
          if (!from || !to) continue;
          const end = navigation.sweep([from[0], from[2]], [to[0], to[2]], "car");
          expect(
            Math.hypot(end[0] - to[0], end[1] - to[2]),
            `${complex}/${poi.id} segment ${index}`,
          ).toBeLessThan(0.01);
        }
        driver.move(route);
        let blocked = false;
        for (let frame = 0; frame < 90000 && driver.moving; frame += 1) {
          if (driver.step(1 / 60, [0, 0], false)?.kind === "blocked") blocked = true;
        }
        const end = route.points.at(-1);
        if (!end) throw new RangeError("Route endpoint missing");
        expect(blocked, `${complex}/${poi.id} stalled while following`).toBe(false);
        expect(driver.moving).toBe(false);
        expect(Math.hypot(driver.position.x - end[0], driver.position.z - end[2])).toBeLessThan(1);
      }
    });
  }

  test("plans only segments the movement sweep can traverse", () => {
    // Given
    const navigation = new SpatialNavigation(xi);
    const driver = new SpatialDriver(xi, "walk");

    // When
    const route = driver.planTo("station");

    // Then
    expect(route?.points).toBeDefined();
    const points = route?.points ?? [];
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      if (!start || !end) continue;
      const swept = navigation.sweep([start[0], start[2]], [end[0], end[2]], "walk");
      expect(Math.hypot(swept[0] - end[0], swept[1] - end[2])).toBeLessThan(0.01);
    }
  });

  test("finishes the real XI station route", () => {
    // Given
    const driver = new SpatialDriver(xi, "walk");
    const route = driver.planTo("station");
    if (!route) throw new RangeError("XI station route missing");
    driver.move(route);

    // When
    for (let frame = 0; frame < 30_000 && driver.moving; frame += 1) {
      driver.step(1 / 60, [0, 0], false);
    }

    // Then
    expect(driver.moving).toBe(false);
    const station = xi.pois.find((poi) => poi.id === "station");
    expect(station).toBeDefined();
    if (station) {
      expect(
        Math.hypot(
          driver.position.x - station.position[0],
          driver.position.z - station.position[1],
        ),
      ).toBeLessThan(6);
    }
  });
});
