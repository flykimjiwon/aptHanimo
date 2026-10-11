import { heightAt } from "../spatial/height";
import type { SpatialWorld, XY } from "../spatial/types";
import type { MapProjection, WorldBounds } from "./map-projection";
import { projectPoint } from "./map-projection";

type ContourInput = {
  readonly ctx: CanvasRenderingContext2D;
  readonly data: SpatialWorld;
  readonly projection: MapProjection;
  readonly bounds: WorldBounds;
  readonly interval: number;
  readonly color: string;
  readonly sampleStep: number;
};

type Edge = readonly [XY, number, XY, number];

type CellInput = {
  readonly corners: readonly [XY, XY, XY, XY];
  readonly heights: readonly [number, number, number, number];
  readonly level: number;
};

function crossing(edge: Edge, level: number): XY | null {
  const [a, aHeight, b, bHeight] = edge;
  if (aHeight < level === bHeight < level || aHeight === bHeight) return null;
  const ratio = (level - aHeight) / (bHeight - aHeight);
  return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio];
}

function cellSegments(input: CellInput): readonly XY[] {
  const { corners, heights, level } = input;
  const [northWest, northEast, southEast, southWest] = corners;
  const [nwHeight, neHeight, seHeight, swHeight] = heights;
  const edges: readonly Edge[] = [
    [northWest, nwHeight, northEast, neHeight],
    [northEast, neHeight, southEast, seHeight],
    [southEast, seHeight, southWest, swHeight],
    [southWest, swHeight, northWest, nwHeight],
  ];
  return edges.flatMap((edge) => {
    const point = crossing(edge, level);
    return point ? [point] : [];
  });
}

export function drawContours(input: ContourInput): void {
  const { data, bounds, interval, sampleStep, projection, ctx } = input;
  const minX = Math.max(data.bounds.minX, Math.floor(bounds.minX / sampleStep) * sampleStep);
  const maxX = Math.min(data.bounds.maxX, bounds.maxX);
  const minZ = Math.max(data.bounds.minZ, Math.floor(bounds.minZ / sampleStep) * sampleStep);
  const maxZ = Math.min(data.bounds.maxZ, bounds.maxZ);
  const xs: number[] = [];
  const zs: number[] = [];
  for (let x = minX; x <= maxX + sampleStep; x += sampleStep) xs.push(x);
  for (let z = minZ; z <= maxZ + sampleStep; z += sampleStep) zs.push(z);
  const samples = zs.map((z) => xs.map((x) => heightAt(data, x, z)));
  ctx.beginPath();
  for (let row = 0; row + 1 < zs.length; row += 1) {
    for (let column = 0; column + 1 < xs.length; column += 1) {
      const x = xs[column];
      const nextX = xs[column + 1];
      const z = zs[row];
      const nextZ = zs[row + 1];
      const nw = samples[row]?.[column];
      const ne = samples[row]?.[column + 1];
      const se = samples[row + 1]?.[column + 1];
      const sw = samples[row + 1]?.[column];
      if (
        x === undefined ||
        nextX === undefined ||
        z === undefined ||
        nextZ === undefined ||
        nw === undefined ||
        ne === undefined ||
        se === undefined ||
        sw === undefined
      )
        continue;
      const corners: readonly [XY, XY, XY, XY] = [
        [x, z],
        [nextX, z],
        [nextX, nextZ],
        [x, nextZ],
      ];
      const heights: readonly [number, number, number, number] = [nw, ne, se, sw];
      const firstLevel = Math.ceil(Math.min(...heights) / interval) * interval;
      const maximum = Math.max(...heights);
      for (let level = firstLevel; level <= maximum; level += interval) {
        const points = cellSegments({ corners, heights, level });
        for (let index = 0; index + 1 < points.length; index += 2) {
          const a = points[index];
          const b = points[index + 1];
          if (!a || !b) continue;
          const screenA = projectPoint(projection, a, level);
          const screenB = projectPoint(projection, b, level);
          ctx.moveTo(screenA.x, screenA.y);
          ctx.lineTo(screenB.x, screenB.y);
        }
      }
    }
  }
  ctx.strokeStyle = input.color;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}
