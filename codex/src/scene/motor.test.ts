import { describe, expect, test } from "bun:test";
import type { SpatialWorld } from "../spatial/types";
import { MovementMotor } from "./motor";
import { SpatialNavigation } from "./navigation";

const world: SpatialWorld = {
  id: "motor-test",
  name: "Motor test",
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

describe("MovementMotor", () => {
  test("moves a walker continuously while input is held", () => {
    // Given
    const motor = new MovementMotor(new SpatialNavigation(world), "walk", [-5, 0]);

    // When
    for (let index = 0; index < 120; index += 1) motor.step(1 / 60, [1, 0]);

    // Then
    expect(motor.position.x).toBeGreaterThan(-1);
    expect(motor.position.x).toBeLessThan(0);
  });

  test("sweeps the player footprint against buildings", () => {
    // Given
    const motor = new MovementMotor(new SpatialNavigation(world), "walk", [-5, 0]);

    // When
    for (let index = 0; index < 300; index += 1) motor.step(1 / 60, [1, 0]);

    // Then
    expect(motor.position.x).toBeLessThanOrEqual(-0.44);
  });
});
