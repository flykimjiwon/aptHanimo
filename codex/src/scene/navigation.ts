import type { Mode } from "../data";
import { heightAt } from "../spatial/height";
import type { SpatialWorld, XY } from "../spatial/types";
import { NavigationQueue } from "./navigation-queue";
import { SpatialCollision } from "./spatial-collision";

const CELL = 2;
const SEARCH_BUDGET_MS = 480;
const MAX_VISITED = 90_000;
const HEURISTIC_WEIGHT = 1.5;

export class SpatialNavigation {
  private readonly columns: number;
  private readonly rows: number;
  private readonly collision: SpatialCollision;
  private readonly passability: Readonly<Record<Mode, Uint8Array>>;
  private readonly edgePassability: Readonly<Record<Mode, Uint8Array>>;

  constructor(private readonly world: SpatialWorld) {
    this.columns = Math.floor((world.bounds.maxX - world.bounds.minX) / CELL) + 1;
    this.rows = Math.floor((world.bounds.maxZ - world.bounds.minZ) / CELL) + 1;
    this.collision = new SpatialCollision(world);
    const cells = this.columns * this.rows;
    this.passability = {
      walk: new Uint8Array(cells),
      stroller: new Uint8Array(cells),
      bike: new Uint8Array(cells),
      car: new Uint8Array(cells),
    };
    this.edgePassability = {
      walk: new Uint8Array(cells * 4),
      stroller: new Uint8Array(cells * 4),
      bike: new Uint8Array(cells * 4),
      car: new Uint8Array(cells * 4),
    };
  }

  heightAt(point: XY): number {
    return heightAt(this.world, point[0], point[1]);
  }

  passable(point: XY, mode: Mode): boolean {
    return this.collision.passable(point, mode);
  }

  sweep(start: XY, end: XY, mode: Mode): XY {
    const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const steps = Math.max(1, Math.ceil(distance / 0.25));
    let current = start;
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const target: XY = [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
      if (this.passable(target, mode)) current = target;
      else break;
    }
    return current;
  }

  path(start: XY, goal: XY, mode: Mode): readonly XY[] | null {
    const deadline = performance.now() + SEARCH_BUDGET_MS;
    const startKey = this.nearestKey(start, mode);
    const goalKey = this.nearestKey(goal, mode);
    if (startKey === null || goalKey === null || performance.now() > deadline) return null;
    const [startX, startZ] = this.indices(startKey);
    const [goalX, goalZ] = this.indices(goalKey);
    const usableStart = this.passable(start, mode) ? start : this.pointAt(startX, startZ);
    const usableGoal = this.passable(goal, mode) ? goal : this.pointAt(goalX, goalZ);
    if (this.linePassable(usableStart, usableGoal, mode)) return [usableStart, usableGoal];
    const open = new NavigationQueue();
    const costs = new Map<number, number>([[startKey, 0]]);
    const previous = new Map<number, number>();
    const closed = new Set<number>();
    open.push({ key: startKey, score: 0 });
    while (open.length > 0) {
      const candidate = open.pop();
      if (!candidate || closed.has(candidate.key)) continue;
      if (candidate.key === goalKey)
        return this.reconstruct(
          usableStart,
          usableGoal,
          previous,
          startKey,
          goalKey,
          mode,
          deadline,
        );
      closed.add(candidate.key);
      if (closed.size > MAX_VISITED || (closed.size % 16 === 0 && performance.now() > deadline))
        return null;
      const [x, z] = this.indices(candidate.key);
      for (const [dx, dz] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ] as const) {
        const nx = x + dx;
        const nz = z + dz;
        if (!this.cellPassable(nx, nz, mode)) continue;
        if (
          dx !== 0 &&
          dz !== 0 &&
          (!this.cellPassable(x + dx, z, mode) || !this.cellPassable(x, z + dz, mode))
        )
          continue;
        const nextKey = nz * this.columns + nx;
        if (!this.edgePassable(candidate.key, nextKey, mode)) continue;
        const nextCost = (costs.get(candidate.key) ?? Infinity) + Math.hypot(dx, dz);
        if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, nextCost);
        previous.set(nextKey, candidate.key);
        const [gx, gz] = this.indices(goalKey);
        open.push({
          key: nextKey,
          score: nextCost + Math.hypot(gx - nx, gz - nz) * HEURISTIC_WEIGHT,
        });
      }
    }
    return null;
  }

  private nearestKey(point: XY, mode: Mode): number | null {
    const nearest = this.nearestPassable(point, mode, mode === "car" ? 80 : 12);
    if (!nearest) return null;
    const x = Math.round((nearest[0] - this.world.bounds.minX) / CELL);
    const z = Math.round((nearest[1] - this.world.bounds.minZ) / CELL);
    return z * this.columns + x;
  }

  nearestPassable(point: XY, mode: Mode, maximumMeters: number): XY | null {
    const x = Math.round((point[0] - this.world.bounds.minX) / CELL);
    const z = Math.round((point[1] - this.world.bounds.minZ) / CELL);
    const maximum = Math.ceil(maximumMeters / CELL);
    for (let radius = 0; radius <= maximum; radius += 1) {
      for (let dz = -radius; dz <= radius; dz += 1)
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (
            Math.max(Math.abs(dx), Math.abs(dz)) !== radius ||
            !this.cellPassable(x + dx, z + dz, mode)
          )
            continue;
          return this.pointAt(x + dx, z + dz);
        }
    }
    return null;
  }

  private cellPassable(x: number, z: number, mode: Mode): boolean {
    if (x < 0 || z < 0 || x >= this.columns || z >= this.rows) return false;
    const key = z * this.columns + x;
    const cache = this.passability[mode];
    const cached = cache[key];
    if (cached !== 0) return cached === 2;
    const passable = this.passable(this.pointAt(x, z), mode);
    cache[key] = passable ? 2 : 1;
    return passable;
  }

  private pointAt(x: number, z: number): XY {
    return [this.world.bounds.minX + x * CELL, this.world.bounds.minZ + z * CELL];
  }

  private edgePassable(from: number, to: number, mode: Mode): boolean {
    const [fromX, fromZ] = this.indices(from);
    const [toX, toZ] = this.indices(to);
    const horizontal = fromZ === toZ;
    const vertical = fromX === toX;
    const base = fromZ < toZ || (fromZ === toZ && fromX < toX) ? from : to;
    const baseX = base === from ? fromX : toX;
    const otherX = base === from ? toX : fromX;
    const slot = horizontal ? 0 : vertical ? 1 : otherX > baseX ? 2 : 3;
    const key = base * 4 + slot;
    const cache = this.edgePassability[mode];
    const cached = cache[key];
    if (cached !== 0) return cached === 2;
    const passable = this.linePassable(this.pointAt(fromX, fromZ), this.pointAt(toX, toZ), mode);
    cache[key] = passable ? 2 : 1;
    return passable;
  }

  private indices(key: number): readonly [number, number] {
    return [key % this.columns, Math.floor(key / this.columns)];
  }

  private reconstruct(
    start: XY,
    goal: XY,
    previous: ReadonlyMap<number, number>,
    startKey: number,
    goalKey: number,
    mode: Mode,
    deadline: number,
  ): readonly XY[] {
    const cells: XY[] = [];
    let key = goalKey;
    while (key !== startKey) {
      const [x, z] = this.indices(key);
      cells.unshift(this.pointAt(x, z));
      const parent = previous.get(key);
      if (parent === undefined) return [start, goal];
      key = parent;
    }
    const raw: readonly XY[] = [start, ...cells, goal];
    const smooth: XY[] = [start];
    for (let anchor = 0; anchor < raw.length - 1; ) {
      if (performance.now() > deadline) return [...smooth, ...raw.slice(anchor + 1)];
      let next = raw.length - 1;
      while (
        next > anchor + 1 &&
        !this.linePassable(raw[anchor] ?? start, raw[next] ?? goal, mode)
      ) {
        if (performance.now() > deadline) return [...smooth, ...raw.slice(anchor + 1)];
        next -= 1;
      }
      smooth.push(raw[next] ?? goal);
      anchor = next;
    }
    return smooth;
  }

  private linePassable(start: XY, end: XY, mode: Mode): boolean {
    const reached = this.sweep(start, end, mode);
    return Math.hypot(reached[0] - end[0], reached[1] - end[1]) < 0.01;
  }
}
