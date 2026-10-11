import {
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Shape,
} from "three";
import { buildingProfile } from "../architecture/profiles";
import type { Point } from "../data";
import type { SpatialBuilding, XY } from "../spatial/types";
import { addComplexFacade } from "./complex-facade";
import { addFacadeWindows } from "./facade-windows";
import { type Builder, C, type MaterialFinish, type MaterialPalette, tree } from "./materials";
import { stableUnit } from "./spatial-art";

const UNKNOWN_HEIGHT = /unknown|estimated|default|model|미상|추정/i;

function buildingMaterial(
  palette: MaterialPalette,
  color: string,
  finish: MaterialFinish = "matte",
) {
  const material = palette.material(color, finish).clone();
  material.name = `building-${finish}-${color}`;
  return material;
}

function isCoreBuilding(building: SpatialBuilding): boolean {
  return building.kind === "core";
}

function paletteIndex(id: string): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 3;
}

function buildingShape(ring: readonly XY[]): Shape | null {
  const first = ring[0];
  if (!first || ring.length < 3) return null;
  const shape = new Shape();
  shape.moveTo(first[0], -first[1]);
  for (const point of ring.slice(1)) shape.lineTo(point[0], -point[1]);
  shape.closePath();
  return shape;
}

function addCoreOutline(group: Group, geometry: ExtrudeGeometry): void {
  const outline = new LineSegments(
    new EdgesGeometry(geometry, 34),
    new LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.34 }),
  );
  outline.name = "core-footprint-outline";
  outline.renderOrder = 2;
  group.add(outline);
}

export function spatialBuilding(
  building: SpatialBuilding,
  ground: number,
  palette: MaterialPalette,
): Group {
  const group = new Group();
  const core = isCoreBuilding(building);
  group.name = `building-${building.id}`;
  group.position.y = ground;
  group.userData["kind"] = "building";
  group.userData["buildingId"] = building.id;
  group.userData["buildingName"] = building.name;
  group.userData["height"] = building.height;
  group.userData["heightSource"] = building.heightSource;
  group.userData["heightKnown"] = !UNKNOWN_HEIGHT.test(building.heightSource);
  group.userData["source"] = building.source;
  group.userData["architectureProfile"] = buildingProfile(building)?.id ?? "context";
  group.userData["fadeWithCamera"] = true;
  const shape = buildingShape(building.ring);
  if (!shape) return group;
  const profile = buildingProfile(building);
  const contextWalls = [C.wallButter, C.wallRose, C.wallSage] as const;
  const wallColor = core
    ? (profile?.palette.wall ?? C.wall)
    : (contextWalls[paletteIndex(building.id)] ?? C.context);
  const roofColor = core
    ? (profile?.palette.roof ?? C.roof)
    : stableUnit(paletteIndex(building.id)) > 0.45
      ? C.roofWarm
      : C.roofBrown;
  const geometry = new ExtrudeGeometry(shape, {
    depth: building.height,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  const mass = new Mesh(geometry, [
    buildingMaterial(palette, roofColor),
    buildingMaterial(palette, wallColor),
  ]);
  mass.name = "footprint-extrusion";
  mass.castShadow = true;
  mass.receiveShadow = true;
  group.add(mass);
  if (core) {
    addCoreOutline(group, geometry);
    if (profile) addComplexFacade(group, building, profile);
    addFacadeWindows(group, building, palette);
  }
  return group;
}

export function apartment(
  builder: Builder,
  position: Point,
  floors: number,
  variant: number,
): void {
  const [x, y, z] = position;
  const height = floors * 0.65;
  const wall = variant % 3 === 0 ? C.wall2 : C.wall;
  builder.box([x, y + height / 2, z], [4.7, height, 3.7], wall);
  builder.box([x, y + 0.5, z], [4.75, 1, 3.75], C.base);
  builder.box([x, y + height + 0.18, z], [4.85, 0.35, 3.85], C.roof);
  builder.box([x - 0.8, y + height + 0.65, z - 0.45], [1.4, 0.75, 1.65], wall);
}

export function school(builder: Builder, position: Point): void {
  const [x, y, z] = position;
  builder.box([x, y + 1.9, z], [7, 3.8, 3], C.wall);
  builder.box([x, y + 3.9, z], [7.3, 0.3, 3.3], C.roofWarm);
  builder.box([x, y + 0.06, z + 5], [7.5, 0.1, 4], C.path);
  tree(builder, [x - 4.5, y, z + 1], 0.7);
}

export function car(builder: Builder, position: Point, color: string): void {
  const [x, y, z] = position;
  builder.box([x, y + 0.48, z], [1.55, 0.55, 2.75], color);
  builder.box([x, y + 0.95, z - 0.22], [1.32, 0.5, 1.5], C.glass);
  for (const dx of [-0.8, 0.8]) {
    for (const dz of [-0.86, 0.86]) {
      builder.orb([x + dx, y + 0.3, z + dz], [0.2, 0.32, 0.32], C.ink);
    }
  }
}
