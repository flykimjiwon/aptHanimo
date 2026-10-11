import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  Line,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Sprite,
  SpriteMaterial,
  type Texture,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Point } from "../data";

export const C = {
  grass: "#c6d69a",
  grass2: "#adc389",
  grass3: "#dce4b9",
  tree: "#638d5b",
  tree2: "#83a969",
  tree3: "#a8bd7a",
  bark: "#8e7255",
  path: "#eee4cc",
  road: "#acb5a4",
  lane: "#f8f5df",
  wall: "#f4e8d3",
  wall2: "#e5d5bb",
  wallCool: "#deded5",
  wallButter: "#ead9aa",
  wallRose: "#dfb9ad",
  wallSage: "#bdc9ae",
  clay: "#d8b59b",
  base: "#d4bd9f",
  roof: "#7c8f94",
  roofWarm: "#c98d78",
  roofBrown: "#a87b68",
  glass: "#779da5",
  glass2: "#c1d4cd",
  glassWarm: "#f0dca1",
  metal: "#738479",
  flower: "#e4af96",
  yellow: "#f0dca1",
  water: "#97c2bf",
  ink: "#35463d",
  coral: "#d87857",
  coralBright: "#ed8f6d",
  balconyBlue: "#86a9ac",
  balconySage: "#8ca98d",
  balconyRose: "#d58f83",
  skin: "#f2c6a7",
  white: "#fffef9",
  context: "#d4c8b5",
} as const;

export type MaterialFinish = "matte" | "glass" | "ground" | "accent";

export class MaterialPalette {
  private readonly cache = new Map<string, MeshStandardMaterial>();

  material(color: string, finish: MaterialFinish = "matte"): MeshStandardMaterial {
    const key = `${color}:${finish}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const material = new MeshStandardMaterial({
      color,
      roughness: finish === "glass" ? 0.42 : finish === "accent" ? 0.62 : 0.9,
      metalness: finish === "accent" ? 0.08 : 0,
      transparent: finish === "glass",
      opacity: finish === "glass" ? 0.9 : 1,
      vertexColors: finish === "ground",
    });
    material.name = `world-${finish}-${color}`;
    this.cache.set(key, material);
    return material;
  }
}

export class Builder {
  private readonly batches = new Map<string, BufferGeometry[]>();

  constructor(private readonly palette = new MaterialPalette()) {}

  shape(geometry: BufferGeometry, color: string, position: Point): void {
    const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
    if (prepared !== geometry) geometry.dispose();
    prepared.deleteAttribute("uv");
    prepared.translate(...position);
    const batch = this.batches.get(color) ?? [];
    batch.push(prepared);
    this.batches.set(color, batch);
  }

  box(position: Point, size: Point, color: string, angle = 0): void {
    const geometry = new BoxGeometry(...size);
    geometry.rotateY(angle);
    this.shape(geometry, color, position);
  }

  orb(position: Point, size: Point, color: string): void {
    const geometry = new IcosahedronGeometry(1, 1);
    geometry.scale(...size);
    this.shape(geometry, color, position);
  }

  cylinder(position: Point, size: Point, color: string): void {
    this.shape(new CylinderGeometry(size[0], size[1], size[2], 10), color, position);
  }

  beam(from: Point, to: Point, width: number, color: string): void {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const delta = end.clone().sub(start);
    const geometry = new BoxGeometry(width, Math.min(width * 0.12, 0.22), delta.length());
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), delta.normalize());
    geometry.applyMatrix4(new Matrix4().makeRotationFromQuaternion(rotation));
    this.shape(geometry, color, start.add(end).multiplyScalar(0.5).toArray());
  }

  finish(name = "batched-decoration"): Group {
    const group = new Group();
    group.name = name;
    for (const [color, geometries] of this.batches) {
      const merged = mergeGeometries(geometries, false);
      for (const geometry of geometries) geometry.dispose();
      if (!merged) continue;
      const mesh = new Mesh(merged, this.palette.material(color));
      mesh.name = `${name}-${color}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData["kind"] = "batched-decoration";
      group.add(mesh);
    }
    this.batches.clear();
    return group;
  }
}

export function tree(builder: Builder, position: Point, scale = 1): void {
  const [x, y, z] = position;
  builder.cylinder([x, y + scale, z], [0.15 * scale, 0.21 * scale, 2 * scale], C.bark);
  builder.orb([x, y + 2.7 * scale, z], [1.2 * scale, 1.6 * scale, 1.2 * scale], C.tree);
  builder.orb(
    [x - 0.65 * scale, y + 2.3 * scale, z + 0.3],
    [0.95 * scale, 1.15 * scale, 0.95 * scale],
    C.tree2,
  );
  builder.orb(
    [x + 0.6 * scale, y + 2.8 * scale, z - 0.2],
    [0.8 * scale, 0.9 * scale, 0.85 * scale],
    C.tree3,
  );
}

export function bench(builder: Builder, position: Point): void {
  const [x, y, z] = position;
  builder.box([x, y + 0.65, z], [2, 0.18, 0.65], C.bark);
  builder.box([x, y + 1.15, z - 0.32], [2, 0.7, 0.14], C.bark);
  for (const dx of [-0.75, 0.75]) {
    builder.box([x + dx, y + 0.3, z], [0.16, 0.6, 0.5], C.metal);
  }
}

export function disposeGroup(group: Group): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  group.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof Line) && !(object instanceof Sprite))
      return;
    if (object instanceof Mesh || object instanceof Line) geometries.add(object.geometry);
    const objectMaterials =
      object instanceof Sprite
        ? [object.material]
        : Array.isArray(object.material)
          ? object.material
          : [object.material];
    for (const material of objectMaterials) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    if (
      (material instanceof SpriteMaterial ||
        material instanceof MeshBasicMaterial ||
        material instanceof MeshStandardMaterial) &&
      material.map
    )
      textures.add(material.map);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  group.clear();
}

export function meshBox(size: Point, color: string, position: Point): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(...size),
    new MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  return mesh;
}

export const FACE_FORWARD = new Euler(0, 0, 0);
