import { describe, expect, test } from "bun:test";
import { MAP_STYLES } from "./map-catalog";
import { createProjection, projectPoint, unprojectPoint, worldDirection } from "./map-projection";
import { mapTheme } from "./map-themes";

describe("map style catalog", () => {
  test("exposes ten distinct neighborhood treatments", () => {
    // Given
    const ids = new Set(MAP_STYLES.map((style) => style.id));

    // When
    const count = ids.size;

    // Then
    expect(count).toBe(10);
  });
});

describe("map projection", () => {
  test("keeps the camera coordinate at the visual center", () => {
    // Given
    const theme = mapTheme("soft-village");
    const projection = createProjection(theme, {
      width: 1_000,
      height: 520,
      camera: { x: 24, z: -15 },
      zoom: 2,
    });

    // When
    const point = projectPoint(projection, [24, -15], 8);

    // Then
    expect(point.x).toBeCloseTo(500);
    expect(point.y).toBeLessThan(520 / 2);
  });

  test("places geographic north above the camera in north-up styles", () => {
    // Given
    const theme = mapTheme("flat-neighborhood");
    const projection = createProjection(theme, {
      width: 800,
      height: 500,
      camera: { x: 0, z: 0 },
      zoom: 1,
    });

    // When
    const north = projectPoint(projection, [0, -10], 0);
    const south = projectPoint(projection, [0, 10], 0);

    // Then
    expect(north.y).toBeLessThan(south.y);
  });

  test("round-trips a flat screen point to real world coordinates", () => {
    // Given
    const theme = mapTheme("flat-neighborhood");
    const projection = createProjection(theme, {
      width: 800,
      height: 500,
      camera: { x: -32, z: -64 },
      zoom: 1.4,
    });
    const worldPoint = [18, -104] as const;

    // When
    const restored = unprojectPoint(projection, projectPoint(projection, worldPoint, 0));

    // Then
    expect(restored.x).toBeCloseTo(worldPoint[0]);
    expect(restored.z).toBeCloseTo(worldPoint[1]);
  });

  test("normalizes camera-relative movement vectors", () => {
    // Given
    const theme = mapTheme("soft-village");

    // When
    const direction = worldDirection(theme, { x: 1, y: -1 });

    // Then
    expect(Math.hypot(direction.x, direction.z)).toBeCloseTo(1);
  });
});
