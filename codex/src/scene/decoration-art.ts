import {
  type BufferGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
} from "three";
import type { SpatialBuilding, SpatialWorld, XY } from "../spatial/types";
import { C, type MaterialPalette } from "./materials";
import { groundHeight, pointInRing, stableUnit } from "./spatial-art";

type Obstacle =
  | { readonly kind: "ring"; readonly ring: readonly XY[] }
  | { readonly kind: "segment"; readonly start: XY; readonly end: XY; readonly radius: number };

type Candidate = {
  readonly point: XY;
  readonly seed: number;
  readonly priority: number;
};

type TreePlacement = {
  readonly point: XY;
  readonly height: number;
  readonly scale: number;
};

type TreePart = {
  readonly name: string;
  readonly geometry: BufferGeometry;
  readonly color: string;
  readonly offset: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
};

const CELL_SIZE = 40;

function cellKey(column: number, row: number): string {
  return `${column}:${row}`;
}

function addObstacle(
  index: Map<string, Obstacle[]>,
  obstacle: Obstacle,
  bounds: readonly [number, number, number, number],
): void {
  const [minX, maxX, minZ, maxZ] = bounds;
  for (let row = Math.floor(minZ / CELL_SIZE); row <= Math.floor(maxZ / CELL_SIZE); row += 1) {
    for (
      let column = Math.floor(minX / CELL_SIZE);
      column <= Math.floor(maxX / CELL_SIZE);
      column += 1
    ) {
      const key = cellKey(column, row);
      const entries = index.get(key) ?? [];
      entries.push(obstacle);
      index.set(key, entries);
    }
  }
}

function obstacleIndex(data: SpatialWorld): ReadonlyMap<string, readonly Obstacle[]> {
  const index = new Map<string, Obstacle[]>();
  for (const building of data.buildings) {
    const xs = building.ring.map((point) => point[0]);
    const zs = building.ring.map((point) => point[1]);
    addObstacle(index, { kind: "ring", ring: building.ring }, [
      Math.min(...xs) - 3.5,
      Math.max(...xs) + 3.5,
      Math.min(...zs) - 3.5,
      Math.max(...zs) + 3.5,
    ]);
  }
  for (const path of data.paths) {
    const radius = path.width / 2 + 3.5;
    for (let pointIndex = 1; pointIndex < path.points.length; pointIndex += 1) {
      const start = path.points[pointIndex - 1];
      const end = path.points[pointIndex];
      if (!start || !end) continue;
      addObstacle(index, { kind: "segment", start, end, radius }, [
        Math.min(start[0], end[0]) - radius,
        Math.max(start[0], end[0]) + radius,
        Math.min(start[1], end[1]) - radius,
        Math.max(start[1], end[1]) + radius,
      ]);
    }
  }
  return index;
}

function segmentDistance(point: XY, start: XY, end: XY): number {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const squared = dx * dx + dz * dz;
  if (squared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const amount = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / squared),
  );
  return Math.hypot(point[0] - start[0] - dx * amount, point[1] - start[1] - dz * amount);
}

function blocked(index: ReadonlyMap<string, readonly Obstacle[]>, point: XY): boolean {
  const entries = index.get(
    cellKey(Math.floor(point[0] / CELL_SIZE), Math.floor(point[1] / CELL_SIZE)),
  );
  if (!entries) return false;
  return entries.some((obstacle) => {
    if (obstacle.kind === "segment") {
      return segmentDistance(point, obstacle.start, obstacle.end) < obstacle.radius;
    }
    if (pointInRing(point, obstacle.ring)) return true;
    for (let vertex = 0; vertex < obstacle.ring.length; vertex += 1) {
      const start = obstacle.ring[vertex];
      const end = obstacle.ring[(vertex + 1) % obstacle.ring.length];
      if (start && end && segmentDistance(point, start, end) < 3.5) return true;
    }
    return false;
  });
}

function buildingCenter(building: SpatialBuilding): XY {
  const sum = building.ring.reduce<XY>(
    (value, point) => [value[0] + point[0], value[1] + point[1]],
    [0, 0],
  );
  const count = Math.max(building.ring.length, 1);
  return [sum[0] / count, sum[1] / count];
}

function candidates(data: SpatialWorld): readonly Candidate[] {
  const spacing = 30;
  const columns = Math.floor((data.bounds.maxX - data.bounds.minX) / spacing);
  const rows = Math.floor((data.bounds.maxZ - data.bounds.minZ) / spacing);
  const anchors = [
    data.spawn,
    ...data.buildings.filter((building) => building.kind === "core").map(buildingCenter),
  ];
  const values: Candidate[] = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const seed = row * Math.max(columns + 1, 1) + column + 1;
      const x = data.bounds.minX + column * spacing + (stableUnit(seed + 17) - 0.5) * 16;
      const z = data.bounds.minZ + row * spacing + (stableUnit(seed + 31) - 0.5) * 16;
      const distance = Math.min(
        ...anchors.map((anchor) => Math.hypot(x - anchor[0], z - anchor[1])),
      );
      values.push({ point: [x, z], seed, priority: distance + stableUnit(seed + 71) * 18 });
    }
  }
  return values.sort((a, b) => a.priority - b.priority);
}

function treeInstances(trees: readonly TreePlacement[], palette: MaterialPalette): Group {
  const group = new Group();
  const parts: readonly TreePart[] = [
    {
      name: "tree-trunks",
      geometry: new CylinderGeometry(0.15, 0.21, 2, 8),
      color: C.bark,
      offset: [0, 1, 0],
      scale: [1, 1, 1],
    },
    {
      name: "tree-crowns-main",
      geometry: new IcosahedronGeometry(1, 1),
      color: C.tree,
      offset: [0, 2.7, 0],
      scale: [1.2, 1.6, 1.2],
    },
    {
      name: "tree-crowns-left",
      geometry: new IcosahedronGeometry(1, 1),
      color: C.tree2,
      offset: [-0.65, 2.3, 0.3],
      scale: [0.95, 1.15, 0.95],
    },
    {
      name: "tree-crowns-right",
      geometry: new IcosahedronGeometry(1, 1),
      color: C.tree3,
      offset: [0.6, 2.8, -0.2],
      scale: [0.8, 0.9, 0.85],
    },
  ];
  const transform = new Object3D();
  for (const part of parts) {
    const mesh = new InstancedMesh(part.geometry, palette.material(part.color), trees.length);
    mesh.name = part.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    trees.forEach((placement, index) => {
      transform.position.set(
        placement.point[0] + part.offset[0] * placement.scale,
        placement.height + part.offset[1] * placement.scale,
        placement.point[1] + part.offset[2] * placement.scale,
      );
      transform.scale.set(
        part.scale[0] * placement.scale,
        part.scale[1] * placement.scale,
        part.scale[2] * placement.scale,
      );
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  return group;
}

function flowerInstances(
  flowers: readonly Candidate[],
  data: SpatialWorld,
  palette: MaterialPalette,
): Group {
  const group = new Group();
  const colors = [C.flower, C.yellow, C.white] as const;
  const transform = new Object3D();
  colors.forEach((color, petal) => {
    const mesh = new InstancedMesh(
      new IcosahedronGeometry(1, 0),
      palette.material(color),
      flowers.length,
    );
    mesh.name = `flower-petals-${petal}`;
    flowers.forEach((flower, index) => {
      const angle = stableUnit(flower.seed + petal * 13) * Math.PI * 2;
      const radius = 0.22 + stableUnit(flower.seed + petal * 19) * 0.36;
      transform.position.set(
        flower.point[0] + Math.cos(angle) * radius,
        groundHeight(data, flower.point) + 0.15,
        flower.point[1] + Math.sin(angle) * radius,
      );
      transform.scale.set(0.17, 0.13, 0.17);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
  return group;
}

export function decorativeVegetation(data: SpatialWorld, palette: MaterialPalette): Group {
  const obstacles = obstacleIndex(data);
  const trees: TreePlacement[] = [];
  const flowers: Candidate[] = [];
  let farthestPriority = 0;
  for (const candidate of candidates(data)) {
    const distanceFromSpawn = Math.hypot(
      candidate.point[0] - data.spawn[0],
      candidate.point[1] - data.spawn[1],
    );
    if (distanceFromSpawn < 7 || blocked(obstacles, candidate.point)) continue;
    if (trees.length < 150 && stableUnit(candidate.seed) >= 0.35) {
      trees.push({
        point: candidate.point,
        height: groundHeight(data, candidate.point),
        scale: 0.85 + stableUnit(candidate.seed + 53) * 0.5,
      });
      farthestPriority = Math.max(farthestPriority, candidate.priority);
    }
    if (flowers.length < 28 && candidate.priority < 170 && stableUnit(candidate.seed + 89) > 0.62) {
      flowers.push(candidate);
    }
    if (trees.length >= 150 && flowers.length >= 28) break;
  }
  const group = new Group();
  group.name = "decorative-vegetation";
  group.add(treeInstances(trees, palette), flowerInstances(flowers, data, palette));
  group.userData["kind"] = "decorative-vegetation";
  group.userData["surveyed"] = false;
  group.userData["provenance"] = "procedural scenery; not a tree survey";
  group.userData["treeCount"] = trees.length;
  group.userData["flowerPatchCount"] = flowers.length;
  group.userData["corePriorityRadius"] = Math.round(farthestPriority);
  return group;
}
