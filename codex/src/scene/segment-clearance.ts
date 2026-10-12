import type { XY } from "../spatial/types";

type Interval = readonly [number, number];
export type RoadSegment = { readonly start: XY; readonly end: XY; readonly width: number };

export function projectOnSegment(point: XY, start: XY, end: XY): XY {
  const dx = end[0] - start[0],
    dz = end[1] - start[1];
  const squared = dx * dx + dz * dz;
  const t =
    squared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / squared),
        );
  return [start[0] + dx * t, start[1] + dz * t];
}

export function pointSegmentDistance(point: XY, start: XY, end: XY): number {
  const projected = projectOnSegment(point, start, end);
  return Math.hypot(point[0] - projected[0], point[1] - projected[1]);
}

function cross(a: XY, b: XY, c: XY): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

export function clearsRing(start: XY, end: XY, ring: readonly XY[], radius: number): boolean {
  return ring.every((a, index) => {
    const b = ring[(index + 1) % ring.length];
    if (!b) return false;
    if (
      cross(start, end, a) * cross(start, end, b) < 0 &&
      cross(a, b, start) * cross(a, b, end) < 0
    )
      return false;
    return (
      Math.min(
        pointSegmentDistance(start, a, b),
        pointSegmentDistance(end, a, b),
        pointSegmentDistance(a, start, end),
        pointSegmentDistance(b, start, end),
      ) > radius
    );
  });
}

function clip(
  interval: Interval,
  value: number,
  change: number,
  bounds: Interval,
): Interval | null {
  if (Math.abs(change) < 1e-10) return value >= bounds[0] && value <= bounds[1] ? interval : null;
  const a = (bounds[0] - value) / change,
    b = (bounds[1] - value) / change;
  const lo = Math.max(interval[0], Math.min(a, b)),
    hi = Math.min(interval[1], Math.max(a, b));
  return lo <= hi ? [lo, hi] : null;
}

function circleInterval(start: XY, end: XY, center: XY, radius: number): Interval | null {
  const dx = end[0] - start[0],
    dz = end[1] - start[1];
  const x = start[0] - center[0],
    z = start[1] - center[1];
  const a = dx * dx + dz * dz,
    b = 2 * (x * dx + z * dz),
    c = x * x + z * z - radius * radius;
  if (a < 1e-16) return c <= 0 ? [0, 1] : null;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const lo = Math.max(0, (-b - Math.sqrt(discriminant)) / (2 * a));
  const hi = Math.min(1, (-b + Math.sqrt(discriminant)) / (2 * a));
  return lo <= hi ? [lo, hi] : null;
}

function roadInterval(start: XY, end: XY, road: RoadSegment, radius: number): Interval | null {
  const width = road.width / 2 - radius;
  if (width < 0) return null;
  const dx = road.end[0] - road.start[0],
    dz = road.end[1] - road.start[1];
  const length = Math.hypot(dx, dz);
  const intervals = [
    circleInterval(start, end, road.start, width),
    circleInterval(start, end, road.end, width),
  ];
  if (length > 0) {
    const x = start[0] - road.start[0],
      z = start[1] - road.start[1];
    const vx = end[0] - start[0],
      vz = end[1] - start[1];
    const along = clip([0, 1], (x * dx + z * dz) / length, (vx * dx + vz * dz) / length, [
      0,
      length,
    ]);
    if (along)
      intervals.push(
        clip(along, (x * dz - z * dx) / length, (vx * dz - vz * dx) / length, [-width, width]),
      );
  }
  const covered = intervals.filter((part): part is Interval => part !== null);
  return covered.length
    ? [Math.min(...covered.map((p) => p[0])), Math.max(...covered.map((p) => p[1]))]
    : null;
}

export function staysOnRoads(
  start: XY,
  end: XY,
  roads: readonly RoadSegment[],
  radius: number,
): boolean {
  const intervals = roads
    .map((road) => roadInterval(start, end, road, radius))
    .filter((part): part is Interval => part !== null)
    .sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const interval of intervals) {
    if (interval[0] > covered + 1e-8) return false;
    covered = Math.max(covered, interval[1]);
    if (covered >= 1 - 1e-8) return true;
  }
  return false;
}
