import type { SpatialWorld, XY } from "../spatial/types";

const CELL_SIZE = 2;

export class NavigationGrid {
  readonly columns: number;
  readonly rows: number;
  readonly edges: Uint8Array;
  private readonly cells: Uint8Array;
  private readonly size: number;
  private readonly projected = new Map<number, XY>();

  constructor(
    private readonly bounds: SpatialWorld["bounds"],
    private readonly resolve: (point: XY) => XY | null,
  ) {
    this.size = CELL_SIZE;
    this.columns = Math.floor((bounds.maxX - bounds.minX) / this.size) + 1;
    this.rows = Math.floor((bounds.maxZ - bounds.minZ) / this.size) + 1;
    this.cells = new Uint8Array(this.columns * this.rows);
    this.edges = new Uint8Array(this.columns * this.rows * 4);
  }

  pointAt(x: number, z: number): XY {
    return (
      this.projected.get(z * this.columns + x) ?? [
        this.bounds.minX + x * this.size,
        this.bounds.minZ + z * this.size,
      ]
    );
  }

  indices(key: number): XY {
    return [key % this.columns, Math.floor(key / this.columns)];
  }

  cellPassable(x: number, z: number): boolean {
    if (x < 0 || z < 0 || x >= this.columns || z >= this.rows) return false;
    const key = z * this.columns + x;
    const cached = this.cells[key];
    if (cached !== 0) return cached === 2;
    const point = this.pointAt(x, z);
    const resolved = this.resolve(point);
    const allowed = resolved !== null;
    if (resolved && (resolved[0] !== point[0] || resolved[1] !== point[1]))
      this.projected.set(key, resolved);
    this.cells[key] = allowed ? 2 : 1;
    return allowed;
  }

  nearestKey(
    point: XY,
    maximumMeters: number,
    reachable: (candidate: XY) => boolean = () => true,
  ): number | null {
    const x = Math.round((point[0] - this.bounds.minX) / this.size);
    const z = Math.round((point[1] - this.bounds.minZ) / this.size);
    const maximum = Math.ceil(maximumMeters / this.size);
    for (let radius = 0; radius <= maximum; radius += 1) {
      for (let dz = -radius; dz <= radius; dz += 1)
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius || !this.cellPassable(x + dx, z + dz))
            continue;
          if (!reachable(this.pointAt(x + dx, z + dz))) continue;
          return (z + dz) * this.columns + x + dx;
        }
    }
    return null;
  }
}
