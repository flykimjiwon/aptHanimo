import { BoxGeometry, Color, type Group, InstancedMesh, Object3D } from "three";
import { buildingProfile } from "../architecture/profiles";
import type { SpatialBuilding } from "../spatial/types";
import { facadeEdges, signEdge } from "./facade-geometry";
import { C, type MaterialPalette } from "./materials";

export function addFacadeWindows(
  group: Group,
  building: SpatialBuilding,
  palette: MaterialPalette,
): void {
  const transforms: Object3D[] = [];
  const profile = buildingProfile(building);
  const edges = facadeEdges(building.ring);
  const markedEdge = signEdge(edges);
  const floors = Math.max(1, Math.floor(building.height / 3));
  const rows = Math.min(14, floors);
  for (const edge of edges) {
    const a = edge.start;
    const b = edge.end;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const columns = Math.min(12, Math.floor(length / (profile?.window.spacing ?? 4.2)));
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const transform = new Object3D();
        const ratio = (column + 0.5) / columns;
        const y = ((row + 0.75) / (rows + 0.25)) * building.height;
        if (
          edge.index === markedEdge?.index &&
          Math.abs(ratio - 0.5) < 0.33 &&
          y > building.height * 0.65 &&
          y < building.height * 0.9
        )
          continue;
        transform.position.set(
          a[0] + dx * ratio + edge.normal[0] * 0.34,
          y,
          a[1] + dz * ratio + edge.normal[1] * 0.34,
        );
        transform.rotation.y = -Math.atan2(dz, dx);
        transform.updateMatrix();
        transforms.push(transform);
      }
    }
  }
  if (transforms.length === 0) return;
  const material = palette.material(profile?.palette.glass ?? C.glass).clone();
  material.name = "facade-window-material";
  material.emissive = new Color(C.glassWarm);
  material.emissiveIntensity = 0;
  material.userData["worldWindow"] = true;
  const windows = new InstancedMesh(
    new BoxGeometry(profile?.window.width ?? 1.35, profile?.window.height ?? 1.3, 0.22),
    material,
    transforms.length,
  );
  windows.name = "stylized-facade-windows";
  windows.userData["surveyed"] = false;
  transforms.forEach((transform, index) => {
    windows.setMatrixAt(index, transform.matrix);
  });
  windows.instanceMatrix.needsUpdate = true;
  group.add(windows);
}
