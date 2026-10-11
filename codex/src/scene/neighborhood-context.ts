import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShapeUtils,
  Vector2,
} from "three";
import { z } from "zod";
import cherbo from "../../public/context/cherbo.json";
import haiver from "../../public/context/haiver.json";
import xi from "../../public/context/xi.json";
import type { SpatialWorld, XY } from "../spatial/types";
import { Builder } from "./materials";
import { groundHeight, pointInRing } from "./spatial-art";

const xy = z.tuple([z.number().finite(), z.number().finite()]);
const schema = z.object({
  id: z.string(),
  areas: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["park", "wood", "grass", "playground"]),
      ring: z.array(xy).min(4),
      source: z.string().url(),
    }),
  ),
  lines: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["rail", "retaining-wall"]),
      points: z.array(xy).min(2),
      source: z.string().url(),
    }),
  ),
  checked: z.string(),
  source: z.string().url(),
});
const worlds = [schema.parse(haiver), schema.parse(xi), schema.parse(cherbo)];
type ContextArea = z.infer<typeof schema>["areas"][number];
type LandKind = ContextArea["kind"];
type LandColors = Readonly<Record<LandKind, string>>;
const LAND_OFFSET = 0.035;

export function neighborhoodContext(id: string) {
  return worlds.find((world) => world.id === id) ?? null;
}

export function mappedLandAt(
  id: string,
  point: XY,
): "park" | "wood" | "grass" | "playground" | null {
  return neighborhoodContext(id)?.areas.find((area) => pointInRing(point, area.ring))?.kind ?? null;
}

function appendArea(positions: number[], data: SpatialWorld, area: ContextArea): number {
  const ring = area.ring.slice(0, -1);
  const triangles = ShapeUtils.triangulateShape(
    ring.map((point) => new Vector2(point[0], point[1])),
    [],
  );
  for (const triangle of triangles) {
    const a = triangle[0] === undefined ? undefined : ring[triangle[0]];
    const b = triangle[1] === undefined ? undefined : ring[triangle[1]];
    const c = triangle[2] === undefined ? undefined : ring[triangle[2]];
    if (!a || !b || !c) continue;
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const ordered = cross > 0 ? [a, c, b] : [a, b, c];
    for (const point of ordered)
      positions.push(point[0], groundHeight(data, point) + LAND_OFFSET, point[1]);
  }
  return triangles.length;
}

export function mappedLandAreas(data: SpatialWorld, colors: LandColors): Group {
  const group = new Group();
  group.name = "mapped-land-areas";
  const batches = new Map<LandKind, number[]>();
  const triangleCounts: Record<string, number> = {};
  const context = neighborhoodContext(data.id);
  for (const area of context?.areas ?? []) {
    const positions = batches.get(area.kind) ?? [];
    triangleCounts[area.id] = appendArea(positions, data, area);
    batches.set(area.kind, positions);
  }
  for (const [kind, positions] of batches) {
    if (positions.length === 0) continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const material = new MeshStandardMaterial({
      color: colors[kind],
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new Mesh(geometry, material);
    mesh.name = `mapped-land-${kind}`;
    mesh.receiveShadow = true;
    mesh.userData["kind"] = kind;
    mesh.userData["source"] = context?.source;
    group.add(mesh);
  }
  group.userData["areaTriangleCounts"] = triangleCounts;
  group.userData["sources"] = [...new Set(context?.areas.map((area) => area.source) ?? [])];
  group.userData["collision"] = false;
  return group;
}

export function mappedRailways(data: SpatialWorld) {
  const builder = new Builder();
  const context = neighborhoodContext(data.id);
  for (const line of context?.lines ?? []) {
    if (line.kind !== "rail") continue;
    for (let i = 1; i < line.points.length; i += 1) {
      const a = line.points[i - 1];
      const b = line.points[i];
      if (!a || !b) continue;
      const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / Math.max(distance, 0.01);
      const nz = (b[0] - a[0]) / Math.max(distance, 0.01);
      const parts = Math.max(1, Math.ceil(distance / 4));
      for (let p = 0; p < parts; p += 1) {
        const x = a[0] + ((b[0] - a[0]) * p) / parts;
        const z = a[1] + ((b[1] - a[1]) * p) / parts;
        const nextX = a[0] + ((b[0] - a[0]) * (p + 1)) / parts;
        const nextZ = a[1] + ((b[1] - a[1]) * (p + 1)) / parts;
        const y = groundHeight(data, [x, z]) + 0.2;
        const nextY = groundHeight(data, [nextX, nextZ]) + 0.2;
        builder.beam([x, y, z], [nextX, nextY, nextZ], 2.4, "#929085");
        for (const side of [-0.7, 0.7]) {
          builder.beam(
            [x + nx * side, y + 0.1, z + nz * side],
            [nextX + nx * side, nextY + 0.1, nextZ + nz * side],
            0.12,
            "#56615f",
          );
        }
        builder.beam([x - nx, y + 0.04, z - nz], [x + nx, y + 0.04, z + nz], 0.18, "#6b6257");
      }
    }
  }
  const group = builder.finish("mapped-railways");
  group.userData.source = context?.source;
  group.userData.verticalAccuracy = "DEM-draped; track and sleeper dimensions estimated";
  return group;
}
