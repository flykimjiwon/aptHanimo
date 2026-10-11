import type { Layer, Mode, Point } from "./data";
export type Node = { readonly id: string; readonly position: Point; readonly layer: Layer };
export type Edge = {
  readonly a: string;
  readonly b: string;
  readonly meters: number;
  readonly kind: "path" | "stairs" | "road" | "ramp";
  readonly slope: number;
};
export const NODES: readonly Node[] = [
  { id: "home", position: [0, 0, 3], layer: "ground" },
  { id: "north", position: [0, 0, -8], layer: "ground" },
  { id: "gate", position: [-10, 0, -8], layer: "ground" },
  { id: "junction", position: [-21, 0, -8], layer: "ground" },
  { id: "station", position: [-28, 0, -21], layer: "ground" },
  { id: "school", position: [-28, 0, 6], layer: "ground" },
  { id: "park", position: [16, 3, -18], layer: "ground" },
  { id: "ramp", position: [21, 1.3, -3], layer: "ground" },
  { id: "east", position: [27, 0, 9], layer: "ground" },
  { id: "mart", position: [29, 0, 24], layer: "ground" },
  { id: "sang", position: [29, 0, -23], layer: "ground" },
  { id: "middle", position: [-15, 0, 26], layer: "ground" },
  { id: "high", position: [-29, 0, 24], layer: "ground" },
  { id: "community", position: [7, 0, 9], layer: "ground" },
  { id: "parking", position: [-10, 0, 17], layer: "ground" },
  { id: "road-west", position: [-21, 0, 17], layer: "ground" },
  { id: "road-east", position: [17, 0, 17], layer: "ground" },
  { id: "lobby", position: [0, 0, 8], layer: "community" },
  { id: "hall", position: [0, 0, 0], layer: "community" },
  { id: "gym", position: [-11, 0, -4], layer: "community" },
  { id: "lounge", position: [11, 0, -4], layer: "community" },
  { id: "lift", position: [-12, 0, -7], layer: "parking" },
  { id: "parking-hall", position: [-12, 0, 3], layer: "parking" },
  { id: "stall", position: [11, 0, 3], layer: "parking" },
];
export const EDGES: readonly Edge[] = [
  { a: "home", b: "gate", meters: 110, kind: "stairs", slope: 9 },
  { a: "home", b: "north", meters: 110, kind: "path", slope: 2 },
  { a: "north", b: "gate", meters: 95, kind: "path", slope: 2 },
  { a: "gate", b: "junction", meters: 110, kind: "path", slope: 1 },
  { a: "junction", b: "station", meters: 230, kind: "road", slope: 1 },
  { a: "junction", b: "school", meters: 185, kind: "road", slope: 2 },
  { a: "school", b: "road-west", meters: 155, kind: "road", slope: 1 },
  { a: "road-west", b: "junction", meters: 270, kind: "road", slope: 2 },
  { a: "home", b: "park", meters: 180, kind: "stairs", slope: 12 },
  { a: "home", b: "community", meters: 80, kind: "path", slope: 1 },
  { a: "community", b: "ramp", meters: 175, kind: "path", slope: 3 },
  { a: "ramp", b: "park", meters: 210, kind: "ramp", slope: 5 },
  { a: "ramp", b: "east", meters: 160, kind: "path", slope: 3 },
  { a: "east", b: "sang", meters: 340, kind: "road", slope: 1 },
  { a: "east", b: "mart", meters: 170, kind: "road", slope: 1 },
  { a: "east", b: "road-east", meters: 120, kind: "road", slope: 1 },
  { a: "road-east", b: "parking", meters: 300, kind: "road", slope: 1 },
  { a: "parking", b: "road-west", meters: 100, kind: "road", slope: 1 },
  { a: "home", b: "parking", meters: 190, kind: "path", slope: 2 },
  { a: "road-west", b: "middle", meters: 140, kind: "road", slope: 1 },
  { a: "road-west", b: "high", meters: 150, kind: "road", slope: 1 },
  { a: "lobby", b: "hall", meters: 16, kind: "path", slope: 0 },
  { a: "hall", b: "gym", meters: 22, kind: "path", slope: 0 },
  { a: "hall", b: "lounge", meters: 22, kind: "path", slope: 0 },
  { a: "lift", b: "parking-hall", meters: 20, kind: "path", slope: 0 },
  { a: "parking-hall", b: "stall", meters: 46, kind: "road", slope: 0 },
];
export const START: Readonly<Record<Layer, string>> = {
  ground: "home",
  community: "lobby",
  parking: "lift",
};
export function node(id: string): Node {
  const found = NODES.find((entry) => entry.id === id);
  if (!found) throw new RangeError(`Unknown route node: ${id}`);
  return found;
}
export function allowed(edge: Edge, mode: Mode): boolean {
  switch (mode) {
    case "walk":
      return true;
    case "stroller":
    case "bike":
      return edge.kind !== "stairs";
    case "car":
      return edge.kind === "road";
  }
}
