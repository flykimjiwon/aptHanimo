import { MODES, type Mode, type Point } from "./data";
import { allowed, EDGES, type Edge } from "./graph";
export type Route = {
  readonly points?: readonly Point[];
  readonly basis?: "spatial" | "model";
  readonly endpointDistance?: number;
  readonly nodes: readonly string[];
  readonly edges: readonly Edge[];
  readonly meters: number;
  readonly minutes: number;
  readonly stairs: number;
  readonly slope: number;
};
export function route(from: string, to: string, mode: Mode): Route | null {
  const distances = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, { id: string; edge: Edge }>();
  const visited = new Set<string>();
  while (true) {
    const next = [...distances].filter(([id]) => !visited.has(id)).sort((a, b) => a[1] - b[1])[0];
    if (!next) return null;
    const [id, cost] = next;
    if (id === to) break;
    visited.add(id);
    for (const edge of EDGES) {
      if (!allowed(edge, mode) || (edge.a !== id && edge.b !== id)) continue;
      const other = edge.a === id ? edge.b : edge.a;
      const nextCost = cost + edge.meters * (1 + edge.slope / 35);
      if (nextCost < (distances.get(other) ?? Infinity)) {
        distances.set(other, nextCost);
        previous.set(other, { id, edge });
      }
    }
  }
  const nodes = [to];
  const edges: Edge[] = [];
  let current = to;
  while (current !== from) {
    const step = previous.get(current);
    if (!step) return null;
    edges.unshift(step.edge);
    nodes.unshift(step.id);
    current = step.id;
  }
  const meters = edges.reduce((sum, edge) => sum + edge.meters, 0);
  const minutes = edges.reduce(
    (sum, edge) => sum + (edge.meters / MODES[mode].speed) * (1 + edge.slope / 35),
    0,
  );
  return {
    nodes,
    edges,
    meters,
    minutes: Math.ceil(minutes),
    stairs: edges.filter((e) => e.kind === "stairs").length,
    slope: Math.max(0, ...edges.map((e) => e.slope)),
  };
}
