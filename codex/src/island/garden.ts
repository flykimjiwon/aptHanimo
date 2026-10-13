import {
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { Builder, MaterialPalette } from "../scene/materials";
import { pointSegmentDistance } from "../scene/segment-clearance";
import type { SpatialWorld, XY } from "../spatial/types";
import type { IslandPalette } from "./palettes";
import {
  type IslandSite,
  insideRing,
  islandHeight,
  islandPaths,
  ringClearance,
  XI_SITE,
} from "./site";

export function islandGarden(
  world: SpatialWorld,
  palette: IslandPalette,
  site: IslandSite = XI_SITE,
): Group {
  const group = new Group(),
    builder = new Builder(new MaterialPalette()),
    segments = islandPaths(world, site);
  const core = world.buildings.filter((b) => b.kind === "core");
  for (const segment of segments) {
    const a = segment.from,
      b = segment.to;
    const y1 = islandHeight(world, a),
      y2 = islandHeight(world, b);
    builder.beam([a[0], y1 + 0.2, a[1]], [b[0], y2 + 0.2, b[1]], segment.width + 1.3, palette.edge);
    builder.beam([a[0], y1 + 0.32, a[1]], [b[0], y2 + 0.32, b[1]], segment.width, palette.path);
  }
  group.add(builder.finish("island-source-paths"));
  const trees: { readonly p: XY; readonly scale: number }[] = [];
  const random = (x: number, z: number): number => {
    const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let x = site.bounds.minX; x < site.bounds.maxX; x += 8)
    for (let z = site.bounds.minZ; z < site.bounds.maxZ; z += 8) {
      const p: XY = [x + (random(x, z) - 0.5) * 5, z + (random(z, x) - 0.5) * 5];
      if (!insideRing(p, site.ring) || ringClearance(p, site.ring) < 4.5 || random(x + 1, z) < 0.32)
        continue;
      if (Math.hypot(p[0] - site.spawn[0], p[1] - site.spawn[1]) < 12) continue;
      if (core.some((b) => insideRing(p, b.ring) || ringClearance(p, b.ring) < 4.5)) continue;
      if (segments.some((s) => pointSegmentDistance(p, s.from, s.to) < s.width / 2 + 2.5)) continue;
      trees.push({ p, scale: 0.65 + random(x, z) * 0.5 });
    }
  const trunk = new InstancedMesh(
    new CylinderGeometry(0.42, 0.65, 4, 7),
    new MeshStandardMaterial({ color: palette.soil, roughness: 1 }),
    trees.length,
  );
  const foliage = new InstancedMesh(
    new IcosahedronGeometry(1, 1),
    new MeshStandardMaterial({ color: palette.tree, roughness: 1, flatShading: true }),
    trees.length,
  );
  const crowns = new InstancedMesh(
    new IcosahedronGeometry(1, 1),
    new MeshStandardMaterial({ color: palette.leaf, roughness: 1, flatShading: true }),
    trees.length,
  );
  trees.forEach(({ p, scale }, i) => {
    const h = islandHeight(world, p),
      o = new Object3D();
    o.position.set(p[0], h + 2 * scale, p[1]);
    o.scale.setScalar(scale);
    o.updateMatrix();
    trunk.setMatrixAt(i, o.matrix);
    o.position.y = h + 5 * scale;
    o.scale.set(3 * scale, 3.8 * scale, 2.8 * scale);
    o.updateMatrix();
    foliage.setMatrixAt(i, o.matrix);
    o.position.set(p[0] - 1.3 * scale, h + 6.4 * scale, p[1] + 0.5);
    o.scale.set(2.1 * scale, 2.5 * scale, 2.1 * scale);
    o.updateMatrix();
    crowns.setMatrixAt(i, o.matrix);
  });
  for (const mesh of [trunk, foliage, crowns]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.userData.treeCount = trees.length;
  group.userData.pathSegments = segments.length;
  return group;
}
