import type { XY } from "../spatial/types";

export type FacadeEdge = {
  readonly index: number;
  readonly start: XY;
  readonly end: XY;
  readonly center: XY;
  readonly normal: XY;
  readonly length: number;
  readonly angle: number;
};

export function facadeEdges(ring: readonly XY[]): readonly FacadeEdge[] {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    if (a && b) area += a[0] * b[1] - b[0] * a[1];
  }
  const winding = area >= 0 ? 1 : -1;
  return ring.flatMap((start, index) => {
    const end = ring[(index + 1) % ring.length];
    if (!end) return [];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    if (length < 1.2) return [];
    return [
      {
        index,
        start,
        end,
        center: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] as const,
        normal: [(dz / length) * winding, (-dx / length) * winding] as const,
        length,
        angle: -Math.atan2(dz, dx),
      },
    ];
  });
}

export function signEdge(edges: readonly FacadeEdge[]): FacadeEdge | undefined {
  const candidates = edges.filter((edge) => edge.length >= 8);
  return [...(candidates.length ? candidates : edges)].sort((a, b) => a.length - b.length)[0];
}
