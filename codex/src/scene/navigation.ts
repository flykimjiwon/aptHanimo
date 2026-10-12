import type { Mode } from "../data";
import { heightAt } from "../spatial/height";
import type { SpatialWorld, XY } from "../spatial/types";
import { NavigationGrid } from "./navigation-grid";
import { NavigationQueue } from "./navigation-queue";
import { SpatialCollision } from "./spatial-collision";

const SEARCH_BUDGET_MS = 480;
const MAX_VISITED = 90_000;
const HEURISTIC_WEIGHT = 1.5;

export class SpatialNavigation {
  private readonly collision: SpatialCollision;
  private readonly grids: Partial<Record<Mode, NavigationGrid>> = {};

  constructor(private readonly world: SpatialWorld) {
    this.collision = new SpatialCollision(world);
  }

  private grid(mode: Mode): NavigationGrid {
    this.grids[mode] ??= new NavigationGrid(this.world.bounds, (point) => {
      if (this.passable(point, mode)) return point;
      return mode === "car" ? this.collision.carPoint(point) : null;
    });
    return this.grids[mode];
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
    const grid = this.grid(mode);
    const deadline = performance.now() + SEARCH_BUDGET_MS;
    const startPassable = this.passable(start, mode),
      goalPassable = this.passable(goal, mode);
    const startKey = grid.nearestKey(
      start,
      mode === "car" ? 80 : 12,
      (point) => !startPassable || this.linePassable(start, point, mode),
    );
    const goalKey = grid.nearestKey(
      goal,
      mode === "car" ? 80 : 12,
      (point) => !goalPassable || this.linePassable(point, goal, mode),
    );
    if (startKey === null || goalKey === null || performance.now() > deadline) return null;
    const [startX, startZ] = grid.indices(startKey);
    const [goalX, goalZ] = grid.indices(goalKey);
    const usableStart = this.passable(start, mode) ? start : grid.pointAt(startX, startZ);
    const usableGoal = this.passable(goal, mode) ? goal : grid.pointAt(goalX, goalZ);
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
      const [x, z] = grid.indices(candidate.key);
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
        if (!grid.cellPassable(nx, nz)) continue;
        if (
          mode !== "car" &&
          dx !== 0 &&
          dz !== 0 &&
          (!grid.cellPassable(x + dx, z) || !grid.cellPassable(x, z + dz))
        )
          continue;
        const nextKey = nz * grid.columns + nx;
        if (!this.edgePassable(candidate.key, nextKey, mode)) continue;
        const nextCost = (costs.get(candidate.key) ?? Infinity) + Math.hypot(dx, dz);
        if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, nextCost);
        previous.set(nextKey, candidate.key);
        const [gx, gz] = grid.indices(goalKey);
        open.push({
          key: nextKey,
          score: nextCost + Math.hypot(gx - nx, gz - nz) * HEURISTIC_WEIGHT,
        });
      }
    }
    return null;
  }

  nearestPassable(point: XY, mode: Mode, maximumMeters: number): XY | null {
    const grid = this.grid(mode);
    const key = grid.nearestKey(point, maximumMeters);
    return key === null ? null : grid.pointAt(...grid.indices(key));
  }

  private edgePassable(from: number, to: number, mode: Mode): boolean {
    const grid = this.grid(mode);
    const [fromX, fromZ] = grid.indices(from);
    const [toX, toZ] = grid.indices(to);
    const horizontal = fromZ === toZ;
    const vertical = fromX === toX;
    const base = fromZ < toZ || (fromZ === toZ && fromX < toX) ? from : to;
    const baseX = base === from ? fromX : toX;
    const otherX = base === from ? toX : fromX;
    const slot = horizontal ? 0 : vertical ? 1 : otherX > baseX ? 2 : 3;
    const key = base * 4 + slot;
    const cache = grid.edges;
    const cached = cache[key];
    if (cached !== 0) return cached === 2;
    const passable = this.linePassable(grid.pointAt(fromX, fromZ), grid.pointAt(toX, toZ), mode);
    cache[key] = passable ? 2 : 1;
    return passable;
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
    const grid = this.grid(mode);
    const cells: XY[] = [];
    let key = goalKey;
    while (key !== startKey) {
      const [x, z] = grid.indices(key);
      cells.unshift(grid.pointAt(x, z));
      const parent = previous.get(key);
      if (parent === undefined) return [start, goal];
      key = parent;
    }
    const raw: readonly XY[] = [start, grid.pointAt(...grid.indices(startKey)), ...cells, goal];
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
    if (mode === "car") return this.collision.carSegmentPassable(start, end);
    const reached = this.sweep(start, end, mode);
    return Math.hypot(reached[0] - end[0], reached[1] - end[1]) < 0.01;
  }
}
