import { Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import type { Point } from "../data";
import { node } from "../graph";
import type { Route } from "../routes";
import { C } from "./materials";

type GroundRoute = Route & { readonly points: readonly Point[] };

function isPoint(value: unknown): value is Point {
  return (
    Array.isArray(value) && value.length === 3 && value.every((part) => typeof part === "number")
  );
}

export function hasGroundPoints(route: Route): route is GroundRoute {
  if (!("points" in route)) return false;
  const points: unknown = route.points;
  return Array.isArray(points) && points.every(isPoint);
}

export function routeVisual(route: Route | null): Group {
  const group = new Group();
  if (!route) return group;
  const points = hasGroundPoints(route) ? route.points : route.nodes.map((id) => node(id).position);
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) continue;
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const distance = start.distanceTo(end);
    for (let traveled = 0; traveled < distance; traveled += 2) {
      const dot = new Mesh(
        new SphereGeometry(0.16, 6, 4),
        new MeshBasicMaterial({ color: C.coral, depthTest: false }),
      );
      dot.position.copy(start).lerp(end, traveled / distance);
      dot.position.y += 0.16;
      dot.renderOrder = 2;
      group.add(dot);
    }
  }
  return group;
}
