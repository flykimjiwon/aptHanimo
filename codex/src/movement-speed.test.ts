import { describe, expect, test } from "bun:test";
import { Group } from "three";
import { node } from "./graph";
import {
  DEFAULT_TRAVEL_SPEED,
  parseTravelSpeed,
  readTravelSpeed,
  saveTravelSpeed,
  TRAVEL_SPEEDS,
  TravelSpeedState,
} from "./movement-speed";
import { ModelDriver } from "./scene/model-driver";
import { MovementMotor } from "./scene/motor";
import { SpatialNavigation } from "./scene/navigation";
import { SpatialDriver } from "./scene/spatial-driver";
import { parseSpatial } from "./spatial/load";
import type { SpatialWorld } from "./spatial/types";

class MemoryStorage {
  value: string | null = null;

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}

const world: SpatialWorld = {
  id: "speed-test",
  name: "Speed test",
  origin: { longitude: 0, latitude: 0, elevation: 0 },
  bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 },
  spawn: [-5, 0],
  elevation: {
    columns: 2,
    rows: 2,
    values: [0, 0, 0, 0],
    source: "fixture",
    resolution: "40m",
    status: "measured",
  },
  buildings: [
    {
      id: "wall",
      name: "Wall",
      ring: [
        [0, -4],
        [2, -4],
        [2, 4],
        [0, 4],
      ],
      height: 5,
      heightSource: "fixture",
      kind: "building",
      source: "fixture",
    },
  ],
  paths: [],
  pois: [],
  sources: [],
};

describe("TravelSpeedState", () => {
  test("keeps movement available when the browser denies localStorage itself", () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Storage denied", "SecurityError");
      },
    });
    try {
      expect(readTravelSpeed()).toBe(DEFAULT_TRAVEL_SPEED);
      expect(() => saveTravelSpeed(8)).not.toThrow();
      const speed = new TravelSpeedState();
      speed.set(16);
      expect(speed.multiplier).toBe(16);
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });

  test("defaults to 2x, accepts only supported rates, and persists a selection", () => {
    const storage = new MemoryStorage();
    const speed = new TravelSpeedState(storage);

    expect(speed.multiplier).toBe(DEFAULT_TRAVEL_SPEED);
    expect(TRAVEL_SPEEDS.map((rate) => parseTravelSpeed(String(rate)))).toEqual([...TRAVEL_SPEEDS]);
    expect(parseTravelSpeed("3")).toBeNull();

    speed.set(16);

    expect(speed.multiplier).toBe(16);
    expect(storage.value).toBe("16");
    expect(new TravelSpeedState(storage).multiplier).toBe(16);
  });

  test("advances the unchanged 1x motor in ordered fixed-step rates", () => {
    const distances = TRAVEL_SPEEDS.map((rate) => {
      const storage = new MemoryStorage();
      const speed = new TravelSpeedState(storage);
      speed.set(rate);
      const motor = new MovementMotor(new SpatialNavigation(world), "walk", world.spawn);
      for (let frame = 0; frame < 15; frame += 1) {
        for (let step = 0; step < speed.steps(1); step += 1) motor.step(1 / 60, [0, -1]);
      }
      return Math.abs(motor.position.z);
    });
    const baseline = new MovementMotor(new SpatialNavigation(world), "walk", world.spawn);
    for (let step = 0; step < 15; step += 1) baseline.step(1 / 60, [0, -1]);

    expect(new TravelSpeedState(new MemoryStorage()).steps(1)).toBe(2);
    expect(distances[0]).toBeCloseTo(Math.abs(baseline.position.z));
    for (let index = 1; index < distances.length; index += 1) {
      expect(distances[index]).toBeGreaterThan(distances[index - 1] ?? Infinity);
    }
  });

  test("keeps 16x movement behind a swept wall and settles after release", () => {
    const speed = new TravelSpeedState(new MemoryStorage());
    speed.set(16);
    const motor = new MovementMotor(new SpatialNavigation(world), "walk", world.spawn);
    for (let frame = 0; frame < 60; frame += 1) {
      for (let step = 0; step < speed.steps(1); step += 1) motor.step(1 / 60, [1, 0]);
    }
    expect(motor.position.x).toBeLessThanOrEqual(-0.44);

    for (let step = 0; step < speed.steps(1); step += 1) motor.step(1 / 60, [0, 0]);
    const released = motor.position;
    for (let step = 0; step < speed.steps(1); step += 1) motor.step(1 / 60, [0, 0]);

    expect(motor.position.x).toBeCloseTo(released.x);
    expect(motor.position.z).toBeCloseTo(released.z);
  });
});

const xi = parseSpatial(await Bun.file("public/worlds/xi.json").json());

test("16x ground routing arrives without changing real route metrics", () => {
  const driver = new SpatialDriver(xi, "walk");
  const route = driver.planTo("station");
  if (!route) throw new RangeError("XI station route missing");
  const metrics = { meters: route.meters, minutes: route.minutes, slope: route.slope };
  driver.move(route);
  const speed = new TravelSpeedState(new MemoryStorage());
  speed.set(16);

  for (let frame = 0; frame < 2_500 && driver.moving; frame += 1) {
    for (let step = 0; step < speed.steps(1); step += 1) driver.step(1 / 60, [0, 0], false);
  }

  expect(driver.moving).toBe(false);
  expect({ meters: route.meters, minutes: route.minutes, slope: route.slope }).toEqual(metrics);
  const station = xi.pois.find((poi) => poi.id === "station");
  if (!station) throw new RangeError("XI station POI missing");
  expect(
    Math.hypot(driver.position.x - station.position[0], driver.position.z - station.position[1]),
  ).toBeLessThan(6);
});

test("16x interior routing consumes authored stops without overshoot", () => {
  const player = new Group();
  const start = node("lobby").position;
  player.position.set(start[0], start[1] + 0.75, start[2]);
  const driver = new ModelDriver("walk");
  const route = driver.plan(player, "community", "gym");
  if (!route) throw new RangeError("Community route missing");
  driver.move(route, player);
  const speed = new TravelSpeedState(new MemoryStorage());
  speed.set(16);
  let arrived: string | null = null;

  for (let frame = 0; frame < 120 && driver.moving; frame += 1) {
    for (let step = 0; step < speed.steps(1); step += 1) {
      arrived = driver.step(player, 1 / 60, false) ?? arrived;
    }
  }

  const target = node("gym").position;
  expect(arrived).toBe("gym");
  expect(driver.moving).toBe(false);
  expect(player.position.x).toBeCloseTo(target[0]);
  expect(player.position.z).toBeCloseTo(target[2]);
});
