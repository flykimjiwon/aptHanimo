import type { Mode } from "../data";
import type { SpatialBuilding, SpatialWorld, XY } from "../spatial/types";
import { clearsRing, projectOnSegment, staysOnRoads } from "./segment-clearance";

const BUCKET = 24;
const MAX_RADIUS = 1.2;
const RADII: Readonly<Record<Mode, number>> = {
  walk: 0.45,
  stroller: 0.75,
  bike: 0.65,
  car: 1.2,
};

type Segment = {
  readonly start: XY;
  readonly end: XY;
  readonly width: number;
  readonly kind: "road" | "steps";
};
type Bounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
};

function segmentDistance(point: XY, start: XY, end: XY): number {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared),
        );
  return Math.hypot(point[0] - start[0] - dx * projection, point[1] - start[1] - dz * projection);
}

function hitsBuilding(point: XY, building: SpatialBuilding, radius: number): boolean {
  let inside = false;
  const ring = building.ring;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const a = ring[index];
    const b = ring[previous];
    if (!a || !b) continue;
    if (segmentDistance(point, a, b) <= radius) return true;
    const crosses = a[1] > point[1] !== b[1] > point[1];
    if (crosses && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}

export class SpatialCollision {
  private readonly columns: number;
  private readonly buildings = new Map<number, SpatialBuilding[]>();
  private readonly segments = new Map<number, Segment[]>();

  constructor(private readonly world: SpatialWorld) {
    this.columns = Math.ceil((world.bounds.maxX - world.bounds.minX) / BUCKET) + 1;
    for (const building of world.buildings) {
      const xs = building.ring.map((point) => point[0]);
      const zs = building.ring.map((point) => point[1]);
      this.index(this.buildings, building, {
        minX: Math.min(...xs) - MAX_RADIUS,
        maxX: Math.max(...xs) + MAX_RADIUS,
        minZ: Math.min(...zs) - MAX_RADIUS,
        maxZ: Math.max(...zs) + MAX_RADIUS,
      });
    }
    for (const path of world.paths) {
      if (path.kind !== "road" && path.kind !== "steps") continue;
      for (let index = 1; index < path.points.length; index += 1) {
        const start = path.points[index - 1];
        const end = path.points[index];
        if (!start || !end) continue;
        const segment: Segment = { start, end, width: path.width, kind: path.kind };
        const padding = path.width / 2 + MAX_RADIUS;
        this.index(this.segments, segment, {
          minX: Math.min(start[0], end[0]) - padding,
          maxX: Math.max(start[0], end[0]) + padding,
          minZ: Math.min(start[1], end[1]) - padding,
          maxZ: Math.max(start[1], end[1]) + padding,
        });
      }
    }
  }

  passable(point: XY, mode: Mode): boolean {
    const radius = RADII[mode];
    const { bounds } = this.world;
    if (
      point[0] < bounds.minX + radius ||
      point[0] > bounds.maxX - radius ||
      point[1] < bounds.minZ + radius ||
      point[1] > bounds.maxZ - radius
    )
      return false;
    const key = this.key(point);
    if (this.buildings.get(key)?.some((building) => hitsBuilding(point, building, radius)))
      return false;
    const nearby = this.segments.get(key) ?? [];
    if (mode === "car") {
      return nearby.some(
        (segment) =>
          segment.kind === "road" &&
          segment.width / 2 >= radius &&
          segmentDistance(point, segment.start, segment.end) <= segment.width / 2 - radius,
      );
    }
    if (mode === "stroller" || mode === "bike") {
      return !nearby.some(
        (segment) =>
          segment.kind === "steps" &&
          segmentDistance(point, segment.start, segment.end) <= segment.width / 2 + radius,
      );
    }
    return true;
  }

  carSegmentPassable(start: XY, end: XY): boolean {
    if (!this.passable(start, "car") || !this.passable(end, "car")) return false;
    const buildings = this.along(this.buildings, start, end);
    if (buildings.some((building) => !clearsRing(start, end, building.ring, RADII.car)))
      return false;
    return staysOnRoads(
      start,
      end,
      this.along(this.segments, start, end).filter((segment) => segment.kind === "road"),
      RADII.car,
    );
  }

  carPoint(point: XY): XY | null {
    let nearest: XY | null = null;
    let distance = Math.SQRT2;
    for (const segment of this.segments.get(this.key(point)) ?? []) {
      if (segment.kind !== "road" || segment.width < RADII.car * 2) continue;
      const candidate = projectOnSegment(point, segment.start, segment.end);
      const gap = Math.hypot(candidate[0] - point[0], candidate[1] - point[1]);
      if (gap <= distance && this.passable(candidate, "car")) {
        nearest = candidate;
        distance = gap;
      }
    }
    return nearest;
  }

  private along<T>(buckets: ReadonlyMap<number, readonly T[]>, start: XY, end: XY): readonly T[] {
    const bounds = this.world.bounds;
    const x0 = Math.floor((Math.min(start[0], end[0]) - bounds.minX) / BUCKET);
    const x1 = Math.floor((Math.max(start[0], end[0]) - bounds.minX) / BUCKET);
    const z0 = Math.floor((Math.min(start[1], end[1]) - bounds.minZ) / BUCKET);
    const z1 = Math.floor((Math.max(start[1], end[1]) - bounds.minZ) / BUCKET);
    const items = new Set<T>();
    for (let z = z0; z <= z1; z += 1)
      for (let x = x0; x <= x1; x += 1)
        for (const item of buckets.get(z * this.columns + x) ?? []) items.add(item);
    return [...items];
  }

  private index<T>(buckets: Map<number, T[]>, item: T, bounds: Bounds): void {
    const minX = Math.floor((bounds.minX - this.world.bounds.minX) / BUCKET);
    const maxX = Math.floor((bounds.maxX - this.world.bounds.minX) / BUCKET);
    const minZ = Math.floor((bounds.minZ - this.world.bounds.minZ) / BUCKET);
    const maxZ = Math.floor((bounds.maxZ - this.world.bounds.minZ) / BUCKET);
    for (let z = minZ; z <= maxZ; z += 1)
      for (let x = minX; x <= maxX; x += 1) {
        const key = z * this.columns + x;
        const bucket = buckets.get(key);
        if (bucket) bucket.push(item);
        else buckets.set(key, [item]);
      }
  }

  private key(point: XY): number {
    const x = Math.floor((point[0] - this.world.bounds.minX) / BUCKET);
    const z = Math.floor((point[1] - this.world.bounds.minZ) / BUCKET);
    return z * this.columns + x;
  }
}
