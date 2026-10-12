import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
} from "three";
import type { SpatialWorld, XY } from "../spatial/types";
import type { IslandPalette } from "./palettes";
import { islandHeight, SITE_CENTER, SITE_RING } from "./site";

export function footprintShape(ring: readonly XY[]): Shape {
  const shape = new Shape();
  ring.forEach((p, i) => {
    if (i === 0) shape.moveTo(p[0], -p[1]);
    else shape.lineTo(p[0], -p[1]);
  });
  shape.closePath();
  return shape;
}

export function islandLand(world: SpatialWorld, palette: IslandPalette): Group {
  const group = new Group();
  group.name = "geographic-island";
  const shape = new ShapeGeometry(footprintShape(SITE_RING));
  const top = shape.toNonIndexed();
  shape.dispose();
  const raw = top.getAttribute("position"),
    positions: number[] = [],
    colors: number[] = [];
  const green = new Color(palette.grass);
  const triangle = (vertices: readonly [XY, XY, XY], depth: number): void => {
    const [a, b, c] = vertices;
    if (depth > 0) {
      const ab: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        bc: XY = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2],
        ca: XY = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
      triangle([a, ab, ca], depth - 1);
      triangle([ab, b, bc], depth - 1);
      triangle([ca, bc, c], depth - 1);
      triangle([ab, bc, ca], depth - 1);
      return;
    }
    for (const p of [a, b, c]) {
      const y = islandHeight(world, p);
      positions.push(p[0], y, p[1]);
      const tint = green.clone().multiplyScalar(1 + Math.sin(p[0] * 0.025 + p[1] * 0.017) * 0.045);
      colors.push(tint.r, tint.g, tint.b);
    }
  };
  for (let i = 0; i < raw.count; i += 3)
    triangle(
      [
        [raw.getX(i), -raw.getY(i)],
        [raw.getX(i + 1), -raw.getY(i + 1)],
        [raw.getX(i + 2), -raw.getY(i + 2)],
      ],
      3,
    );
  top.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const surface = new Mesh(
    geometry,
    new MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  surface.name = "island-ground";
  surface.receiveShadow = true;
  group.add(surface);
  const border: XY[] = [];
  SITE_RING.slice(1).forEach((b, i) => {
    const a = SITE_RING[i];
    if (!a) return;
    const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7);
    for (let j = 0; j < count; j++)
      border.push([a[0] + ((b[0] - a[0]) * j) / count, a[1] + ((b[1] - a[1]) * j) / count]);
  });
  const strata = [
    { top: 0, bottom: 3, scale: 1, next: 1, color: palette.edge },
    { top: 3, bottom: 15, scale: 1, next: 0.97, color: palette.soil },
    { top: 15, bottom: 25, scale: 0.97, next: 0.86, color: palette.rock },
  ];
  for (const layer of strata) {
    const vertices: number[] = [];
    const vertex = (p: XY, drop: number, scale: number): number[] => [
      SITE_CENTER[0] + (p[0] - SITE_CENTER[0]) * scale,
      islandHeight(world, p) - drop,
      SITE_CENTER[1] + (p[1] - SITE_CENTER[1]) * scale,
    ];
    border.forEach((a, i) => {
      const b = border[(i + 1) % border.length];
      if (!b) return;
      const at = vertex(a, layer.top, layer.scale),
        bt = vertex(b, layer.top, layer.scale),
        ab = vertex(a, layer.bottom, layer.next),
        bb = vertex(b, layer.bottom, layer.next);
      vertices.push(...at, ...ab, ...bt, ...ab, ...bb, ...bt);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const mesh = new Mesh(
      geometry,
      new MeshStandardMaterial({ color: layer.color, roughness: 1, side: 2 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
