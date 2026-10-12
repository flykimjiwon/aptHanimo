import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { facadeEdges } from "../scene/facade-geometry";
import type { SpatialBuilding, SpatialWorld } from "../spatial/types";
import { footprintShape } from "./land";
import type { IslandPalette } from "./palettes";
import { buildingBase, HEIGHT_SCALE } from "./site";

export function islandBuilding(
  building: SpatialBuilding,
  world: SpatialWorld,
  palette: IslandPalette,
): Group {
  const group = new Group();
  group.name = building.id;
  group.userData.buildingId = building.id;
  group.position.y = buildingBase(world, building);
  const height = building.height * HEIGHT_SCALE;
  const shape = footprintShape(building.ring);
  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.35,
    bevelSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  const material = new MeshStandardMaterial({ color: palette.wall, roughness: 0.85 });
  const mass = new Mesh(geometry, material);
  mass.name = "island-building-mass";
  mass.castShadow = true;
  mass.receiveShadow = true;
  group.add(mass);
  const roofGeometry = new ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: false, steps: 1 });
  roofGeometry.rotateX(-Math.PI / 2);
  const roof = new Mesh(
    roofGeometry,
    new MeshStandardMaterial({ color: palette.roof, roughness: 0.8 }),
  );
  roof.position.y = height;
  roof.castShadow = true;
  group.add(roof);
  const transforms: Object3D[] = [],
    accents: Object3D[] = [];
  for (const edge of facadeEdges(building.ring)) {
    if (edge.length < 4.5) continue;
    const cols = Math.max(1, Math.floor(edge.length / 4.3)),
      rows = Math.max(2, Math.floor(height / 4.4));
    for (let col = 0; col < cols; col++)
      for (let row = 0; row < rows; row++) {
        const t = (col + 0.5) / cols,
          o = new Object3D();
        o.position.set(
          edge.start[0] + (edge.end[0] - edge.start[0]) * t + edge.normal[0] * 0.45,
          3 + (row * (height - 5)) / rows,
          edge.start[1] + (edge.end[1] - edge.start[1]) * t + edge.normal[1] * 0.45,
        );
        o.rotation.y = edge.angle;
        o.updateMatrix();
        transforms.push(o);
      }
    if (edge.length > 12) {
      const o = new Object3D();
      o.position.set(
        edge.start[0] + (edge.end[0] - edge.start[0]) * 0.13 + edge.normal[0] * 0.45,
        height / 2,
        edge.start[1] + (edge.end[1] - edge.start[1]) * 0.13 + edge.normal[1] * 0.45,
      );
      o.rotation.y = edge.angle;
      o.updateMatrix();
      accents.push(o);
    }
  }
  const windowMaterial = new MeshStandardMaterial({
    color: palette.glass,
    roughness: 0.55,
    emissive: palette.night ? palette.glass : "#000000",
    emissiveIntensity: palette.night ? 0.55 : 0,
  });
  const windows = new InstancedMesh(
    new BoxGeometry(1.7, 2.15, 0.28),
    windowMaterial,
    transforms.length,
  );
  transforms.forEach((t, i) => {
    windows.setMatrixAt(i, t.matrix);
  });
  group.add(windows);
  const stripes = new InstancedMesh(
    new BoxGeometry(1.2, height - 2, 0.35),
    new MeshStandardMaterial({ color: palette.accent, roughness: 0.9 }),
    accents.length,
  );
  accents.forEach((t, i) => {
    stripes.setMatrixAt(i, t.matrix);
  });
  group.add(stripes);
  return group;
}
