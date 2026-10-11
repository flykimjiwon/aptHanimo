import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
} from "three";
import type { SpatialWorld, XY } from "../spatial/types";
import { C, type MaterialPalette } from "./materials";

function gridValue(data: SpatialWorld, column: number, row: number): number {
  const index = row * data.elevation.columns + column;
  return data.elevation.values[index] ?? data.origin.elevation;
}

export function groundHeight(data: SpatialWorld, point: XY): number {
  const { minX, maxX, minZ, maxZ } = data.bounds;
  const columnSpan = Math.max(data.elevation.columns - 1, 1);
  const rowSpan = Math.max(data.elevation.rows - 1, 1);
  const columnPosition = ((point[0] - minX) / Math.max(maxX - minX, 1)) * columnSpan;
  const rowPosition = ((point[1] - minZ) / Math.max(maxZ - minZ, 1)) * rowSpan;
  const c0 = Math.max(0, Math.min(Math.floor(columnPosition), columnSpan));
  const r0 = Math.max(0, Math.min(Math.floor(rowPosition), rowSpan));
  const c1 = Math.min(c0 + 1, columnSpan);
  const r1 = Math.min(r0 + 1, rowSpan);
  const tx = Math.max(0, Math.min(columnPosition - c0, 1));
  const tz = Math.max(0, Math.min(rowPosition - r0, 1));
  const north = gridValue(data, c0, r0) * (1 - tx) + gridValue(data, c1, r0) * tx;
  const south = gridValue(data, c0, r1) * (1 - tx) + gridValue(data, c1, r1) * tx;
  return north * (1 - tz) + south * tz - data.origin.elevation;
}

export function createGroundMesh(data: SpatialWorld, palette: MaterialPalette): Mesh {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const low = Math.min(...data.elevation.values, data.origin.elevation);
  const high = Math.max(...data.elevation.values, data.origin.elevation + 1);
  const colorLow = new Color(C.grass2);
  const colorHigh = new Color(C.grass3);
  for (let row = 0; row < data.elevation.rows; row += 1) {
    for (let column = 0; column < data.elevation.columns; column += 1) {
      const tx = data.elevation.columns === 1 ? 0 : column / (data.elevation.columns - 1);
      const tz = data.elevation.rows === 1 ? 0 : row / (data.elevation.rows - 1);
      const x = data.bounds.minX + (data.bounds.maxX - data.bounds.minX) * tx;
      const z = data.bounds.minZ + (data.bounds.maxZ - data.bounds.minZ) * tz;
      const rawHeight = gridValue(data, column, row);
      const elevationMix = (rawHeight - low) / Math.max(high - low, 1);
      const meadowVariation = (Math.sin(column * 1.73 + row * 2.41) + 1) * 0.025;
      const color = colorLow.clone().lerp(colorHigh, Math.min(1, elevationMix + meadowVariation));
      positions.push(x, rawHeight - data.origin.elevation, z);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let row = 0; row < data.elevation.rows - 1; row += 1) {
    for (let column = 0; column < data.elevation.columns - 1; column += 1) {
      const a = row * data.elevation.columns + column;
      const b = a + 1;
      const c = a + data.elevation.columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, palette.material(C.white, "ground"));
  mesh.name = "measured-elevation-ground";
  mesh.receiveShadow = true;
  mesh.userData["kind"] = "ground";
  mesh.userData["source"] = data.elevation.source;
  mesh.userData["status"] = data.elevation.status;
  return mesh;
}

type ElevationSample = {
  readonly x: number;
  readonly z: number;
  readonly elevation: number;
};

function contourCrossing(
  start: ElevationSample,
  end: ElevationSample,
  level: number,
): readonly [number, number, number] | null {
  const min = Math.min(start.elevation, end.elevation);
  const max = Math.max(start.elevation, end.elevation);
  if (level < min || level >= max || start.elevation === end.elevation) return null;
  const amount = (level - start.elevation) / (end.elevation - start.elevation);
  return [start.x + (end.x - start.x) * amount, level, start.z + (end.z - start.z) * amount];
}

export function createContourLines(data: SpatialWorld): LineSegments {
  const positions: number[] = [];
  const interval = 5;
  const minimum = Math.min(...data.elevation.values);
  const maximum = Math.max(...data.elevation.values);
  const firstLevel = Math.ceil(minimum / interval) * interval;
  const xStep = (data.bounds.maxX - data.bounds.minX) / Math.max(data.elevation.columns - 1, 1);
  const zStep = (data.bounds.maxZ - data.bounds.minZ) / Math.max(data.elevation.rows - 1, 1);
  for (let level = firstLevel; level < maximum; level += interval) {
    for (let row = 0; row < data.elevation.rows - 1; row += 1) {
      for (let column = 0; column < data.elevation.columns - 1; column += 1) {
        const x = data.bounds.minX + column * xStep;
        const z = data.bounds.minZ + row * zStep;
        const corners: readonly ElevationSample[] = [
          { x, z, elevation: gridValue(data, column, row) },
          { x: x + xStep, z, elevation: gridValue(data, column + 1, row) },
          { x: x + xStep, z: z + zStep, elevation: gridValue(data, column + 1, row + 1) },
          { x, z: z + zStep, elevation: gridValue(data, column, row + 1) },
        ];
        const crossings: (readonly [number, number, number])[] = [];
        for (let edge = 0; edge < corners.length; edge += 1) {
          const start = corners[edge];
          const end = corners[(edge + 1) % corners.length];
          if (!start || !end) continue;
          const crossing = contourCrossing(start, end, level);
          if (crossing) crossings.push(crossing);
        }
        for (let index = 1; index < crossings.length; index += 2) {
          const start = crossings[index - 1];
          const end = crossings[index];
          if (!start || !end) continue;
          positions.push(
            start[0],
            start[1] - data.origin.elevation + 0.08,
            start[2],
            end[0],
            end[1] - data.origin.elevation + 0.08,
            end[2],
          );
        }
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const lines = new LineSegments(
    geometry,
    new LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.1 }),
  );
  lines.name = "elevation-contours";
  lines.userData["kind"] = "contours";
  lines.userData["intervalMetres"] = interval;
  lines.userData["source"] = data.elevation.source;
  return lines;
}

export function pointInRing(point: XY, ring: readonly XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const crosses =
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

export function stableUnit(seed: number): number {
  const value = Math.sin(seed * 91.3458 + 47.238) * 43_758.5453;
  return value - Math.floor(value);
}
