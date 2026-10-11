import type { SpatialWorld } from "./types";

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export function heightAt(data: SpatialWorld, x: number, z: number): number {
  const { bounds, elevation, origin } = data;
  const columnPosition =
    clamp((x - bounds.minX) / (bounds.maxX - bounds.minX), 0, 1) * (elevation.columns - 1);
  const rowPosition =
    clamp((z - bounds.minZ) / (bounds.maxZ - bounds.minZ), 0, 1) * (elevation.rows - 1);
  const column0 = Math.floor(columnPosition);
  const column1 = Math.min(column0 + 1, elevation.columns - 1);
  const row0 = Math.floor(rowPosition);
  const row1 = Math.min(row0 + 1, elevation.rows - 1);
  const valueAt = (column: number, row: number): number =>
    elevation.values[row * elevation.columns + column] ?? origin.elevation;
  const xFraction = columnPosition - column0;
  const zFraction = rowPosition - row0;
  const north =
    valueAt(column0, row0) + (valueAt(column1, row0) - valueAt(column0, row0)) * xFraction;
  const south =
    valueAt(column0, row1) + (valueAt(column1, row1) - valueAt(column0, row1)) * xFraction;
  return north + (south - north) * zFraction - origin.elevation;
}
