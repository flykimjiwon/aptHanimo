import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  Mesh,
  type MeshStandardMaterial,
} from "three";
import type { SpatialBuilding, SpatialWorld, XY } from "../spatial/types";
import { groundHeight } from "./spatial-art";

export function buildingLevel(data: SpatialWorld, building: SpatialBuilding): number {
  return Math.max(...building.ring.map((point) => groundHeight(data, point)));
}

export function addGroundedPlinth(
  group: Group,
  data: SpatialWorld,
  building: SpatialBuilding,
): void {
  const positions: number[] = [];
  const floor = group.position.y;
  for (let i = 0; i < building.ring.length; i += 1) {
    const a = building.ring[i];
    const b = building.ring[(i + 1) % building.ring.length];
    if (!a || !b) continue;
    const baseA = groundHeight(data, a) - floor - 0.05;
    const baseB = groundHeight(data, b) - floor - 0.05;
    positions.push(
      a[0],
      0,
      a[1],
      b[0],
      baseB,
      b[1],
      b[0],
      0,
      b[1],
      a[0],
      0,
      a[1],
      a[0],
      baseA,
      a[1],
      b[0],
      baseB,
      b[1],
    );
  }
  const mass = group.getObjectByName("footprint-extrusion");
  if (!(mass instanceof Mesh) || !Array.isArray(mass.material)) return;
  const source = mass.material[1];
  if (!source) return;
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, source.clone());
  mesh.material.side = DoubleSide;
  mesh.name = "dem-grounded-foundation";
  mesh.scale.y = 1 / group.scale.y;
  mesh.userData.surveyed = false;
  mesh.userData.provenance = "DEM support mesh, not a surveyed retaining wall";
  mesh.receiveShadow = true;
  group.add(mesh);
}

export function terrainSection(data: SpatialWorld, material: MeshStandardMaterial): Mesh {
  const { minX, maxX, minZ, maxZ } = data.bounds;
  const ring: XY[] = [];
  for (let n = 0; n < 64; n += 1) ring.push([minX + ((maxX - minX) * n) / 64, minZ]);
  for (let n = 0; n < 64; n += 1) ring.push([maxX, minZ + ((maxZ - minZ) * n) / 64]);
  for (let n = 0; n < 64; n += 1) ring.push([maxX - ((maxX - minX) * n) / 64, maxZ]);
  for (let n = 0; n < 64; n += 1) ring.push([minX, maxZ - ((maxZ - minZ) * n) / 64]);
  const bottom = Math.min(...data.elevation.values) - data.origin.elevation - 8;
  const positions: number[] = [];
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    const topA = groundHeight(data, a);
    const topB = groundHeight(data, b);
    positions.push(
      a[0],
      topA,
      a[1],
      b[0],
      bottom,
      b[1],
      b[0],
      topB,
      b[1],
      a[0],
      topA,
      a[1],
      a[0],
      bottom,
      a[1],
      b[0],
      bottom,
      b[1],
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const sectionMaterial = material.clone();
  sectionMaterial.side = DoubleSide;
  const mesh = new Mesh(geometry, sectionMaterial);
  mesh.name = "dem-boundary-section";
  mesh.userData.surveyed = false;
  return mesh;
}
