import type { Mode } from "../data";
import { SpatialNavigation } from "../scene/navigation";
import { pointSegmentDistance } from "../scene/segment-clearance";
import { heightAt } from "../spatial/height";
import type { SpatialBuilding, SpatialWorld, XY } from "../spatial/types";

// Xi groupPolygons, localized with the existing collect-spatial.mjs projection.
// Research reference: research/spatial/xi-hogang-polygon.json, not a cadastral survey.
export const SITE_RING: readonly XY[] = [
  [-56.68, -24.91],
  [-53.4, -53.26],
  [-24.73, -130.17],
  [-15.46, -170.01],
  [-9.9, -176.26],
  [47.31, -151.28],
  [37.56, -128.13],
  [30.95, -87],
  [31.71, -64.95],
  [42.25, -30.17],
  [67.47, -10.73],
  [91.93, 3.55],
  [118.42, 15.43],
  [154.03, 24.35],
  [152.61, 30.32],
  [106.15, 63.74],
  [63.93, 96.98],
  [13.14, 114.78],
  [1.2, 112.75],
  [-19.12, 102.25],
  [-25.18, 96.1],
  [-46.31, 70.31],
  [-51.06, 52.68],
  [-13.81, 39.77],
  [-32.13, 9.92],
  [-53.43, 10.42],
  [-56.68, -24.91],
];
export const HEIGHT_SCALE = 0.55;
export const RELIEF_SCALE = 0.35;
export const SITE_CENTER: XY = [35, -30];
export const SITE_BOUNDS = { minX: -57, maxX: 155, minZ: -177, maxZ: 116 } as const;

export function insideRing(point: XY, ring: readonly XY[] = SITE_RING): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (!a || !b) continue;
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function ringClearance(point: XY, ring: readonly XY[] = SITE_RING): number {
  return Math.min(
    ...ring.map((a, i) => pointSegmentDistance(point, a, ring[(i + 1) % ring.length] ?? a)),
  );
}
export function islandHeight(world: SpatialWorld, point: XY): number {
  return heightAt(world, point[0], point[1]) * RELIEF_SCALE;
}
export function buildingCenter(building: SpatialBuilding): XY {
  return building.ring.reduce<XY>(
    (sum, p) => [sum[0] + p[0] / building.ring.length, sum[1] + p[1] / building.ring.length],
    [0, 0],
  );
}
export function buildingBase(world: SpatialWorld, building: SpatialBuilding): number {
  return Math.max(...building.ring.map((p) => islandHeight(world, p)));
}
export type IslandSegment = {
  readonly from: XY;
  readonly to: XY;
  readonly width: number;
  readonly kind: string;
  readonly source: string;
};
export function islandPaths(world: SpatialWorld): readonly IslandSegment[] {
  const segments: IslandSegment[] = [];
  for (const path of world.paths)
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1],
        b = path.points[i];
      if (!a || !b) continue;
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
      for (let j = 0; j < steps; j++) {
        const from: XY = [a[0] + ((b[0] - a[0]) * j) / steps, a[1] + ((b[1] - a[1]) * j) / steps];
        const to: XY = [
          a[0] + ((b[0] - a[0]) * (j + 1)) / steps,
          a[1] + ((b[1] - a[1]) * (j + 1)) / steps,
        ];
        if ([from, to].every((p) => insideRing(p) && ringClearance(p) > path.width / 2 + 0.6))
          segments.push({ from, to, width: path.width, kind: path.kind, source: path.source });
      }
    }
  return segments;
}
export class IslandNavigation extends SpatialNavigation {
  private readonly obstacles: readonly {
    readonly ring: readonly XY[];
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
  }[];
  constructor(private readonly source: SpatialWorld) {
    super({
      ...source,
      bounds: SITE_BOUNDS,
      buildings: source.buildings.filter((b) => b.kind === "core"),
    });
    this.obstacles = source.buildings
      .filter((b) => b.kind === "core")
      .map((b) => ({
        ring: b.ring,
        minX: Math.min(...b.ring.map((p) => p[0])) - 4,
        maxX: Math.max(...b.ring.map((p) => p[0])) + 4,
        minZ: Math.min(...b.ring.map((p) => p[1])) - 4,
        maxZ: Math.max(...b.ring.map((p) => p[1])) + 4,
      }));
  }
  override passable(point: XY, mode: Mode): boolean {
    return (
      insideRing(point) &&
      ringClearance(point) > 1.8 &&
      super.passable(point, mode) &&
      !this.obstacles.some(
        (b) =>
          point[0] >= b.minX &&
          point[0] <= b.maxX &&
          point[1] >= b.minZ &&
          point[1] <= b.maxZ &&
          ringClearance(point, b.ring) < 1.8,
      )
    );
  }
  override heightAt(point: XY): number {
    return islandHeight(this.source, point);
  }
}
