import { MODES, type Mode, type Point } from "../data";
import type { Route } from "../routes";
import type { SpatialPOI, SpatialWorld, XY } from "../spatial/types";
import { type MotorPosition, MovementMotor } from "./motor";
import { SpatialNavigation } from "./navigation";
import { hasGroundPoints } from "./route-visual";

type SpatialRoute = Route & { readonly endpointDistance: number };

function project(point: XY, start: XY, end: XY): { readonly point: XY; readonly distance: number } {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const amount =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared),
        );
  const projected: XY = [start[0] + dx * amount, start[1] + dz * amount];
  return {
    point: projected,
    distance: Math.hypot(projected[0] - point[0], projected[1] - point[1]),
  };
}

function pathDistance(points: readonly Point[]): number {
  let meters = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (start && end) meters += Math.hypot(end[0] - start[0], end[2] - start[2]);
  }
  return meters;
}

export class SpatialDriver {
  private readonly navigation: SpatialNavigation;
  private readonly motor: MovementMotor;
  private readonly plannedDestinations = new WeakMap<Route, string>();
  private stops: Point[] = [];
  private destination: string | null = null;
  private routeGoal: XY | null = null;
  private stalledFor = 0;
  private replans = 0;

  constructor(
    readonly data: SpatialWorld,
    private mode: Mode,
  ) {
    this.navigation = new SpatialNavigation(data);
    const spawn = this.navigation.passable(data.spawn, mode)
      ? data.spawn
      : (this.navigation.nearestPassable(data.spawn, mode, 60) ?? data.spawn);
    this.motor = new MovementMotor(this.navigation, mode, spawn);
  }

  get position(): MotorPosition {
    return this.motor.position;
  }

  get moving(): boolean {
    return this.stops.length > 0;
  }

  get nearPlace(): string | null {
    if (Math.hypot(this.data.spawn[0] - this.position.x, this.data.spawn[1] - this.position.z) <= 6)
      return "home";
    const nearest = this.nearestPOI([this.position.x, this.position.z]);
    return nearest &&
      Math.hypot(nearest.position[0] - this.position.x, nearest.position[1] - this.position.z) <= 6
      ? nearest.id
      : null;
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.motor.setMode(mode);
    const point: XY = [this.position.x, this.position.z];
    if (!this.navigation.passable(point, mode)) {
      const nearest = this.navigation.nearestPassable(point, mode, 60);
      if (nearest) this.motor.teleport(nearest);
    }
  }

  heightAt(point: XY): number {
    return this.navigation.heightAt(point);
  }

  teleport(id: string): void {
    const poi = this.data.pois.find((item) => item.id === id);
    const requested = id === "home" ? this.data.spawn : (poi?.position ?? this.data.spawn);
    const point = this.navigation.passable(requested, this.mode)
      ? requested
      : (this.navigation.nearestPassable(requested, this.mode, 60) ?? requested);
    this.motor.teleport(point);
    this.cancel();
  }

  teleportGround(point: XY): boolean {
    if (
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1]) ||
      point[0] < this.data.bounds.minX ||
      point[0] > this.data.bounds.maxX ||
      point[1] < this.data.bounds.minZ ||
      point[1] > this.data.bounds.maxZ
    )
      return false;
    const destination = this.navigation.passable(point, this.mode)
      ? point
      : this.navigation.nearestPassable(point, this.mode, 16);
    if (!destination) return false;
    this.motor.teleport(destination);
    this.cancel();
    return true;
  }

  planTo(placeId: string): Route | null {
    const poi = this.data.pois.find((item) => item.id === placeId);
    const goal = placeId === "home" ? this.data.spawn : poi?.position;
    if (!goal) return null;
    const approach =
      placeId === "home" && this.mode !== "car"
        ? { point: goal, distance: 0 }
        : this.approach(goal);
    const route = this.planPoint(approach.point, approach.distance);
    if (route && approach.distance <= 6) {
      this.plannedDestinations.set(route, placeId);
    }
    return route;
  }

  planPoint(goal: XY, endpointDistance = 0): Route | null {
    const path = this.navigation.path([this.position.x, this.position.z], goal, this.mode);
    if (!path) return null;
    const points: readonly Point[] = path.map((point) => [
      point[0],
      this.navigation.heightAt(point),
      point[1],
    ]);
    const meters = pathDistance(points);
    const route: SpatialRoute = {
      points,
      basis: "spatial",
      endpointDistance,
      nodes: [],
      edges: [],
      meters,
      minutes: Math.ceil(meters / MODES[this.mode].speed),
      stairs: 0,
      slope: 0,
    };
    return route;
  }

  move(route: Route): boolean {
    if (!hasGroundPoints(route)) return false;
    this.stops = [...route.points.slice(1)];
    this.destination = this.plannedDestinations.get(route) ?? null;
    const goal = route.points.at(-1);
    this.routeGoal = goal ? [goal[0], goal[2]] : null;
    this.stalledFor = 0;
    this.replans = 0;
    return true;
  }

  cancel(): void {
    this.stops = [];
    this.destination = null;
    this.routeGoal = null;
    this.stalledFor = 0;
    this.replans = 0;
    this.motor.stop();
  }

  step(
    delta: number,
    input: XY,
    paused: boolean,
  ): { readonly kind: "arrived"; readonly id: string } | { readonly kind: "complete" } | null {
    const manual = Math.hypot(input[0], input[1]) > 0.01;
    const direction = manual ? input : this.autoInput(paused);
    const target = this.stops[0];
    const distanceBefore = target
      ? Math.hypot(target[0] - this.position.x, target[2] - this.position.z)
      : 0;
    this.motor.step(delta, paused ? [0, 0] : direction);
    if (!manual && !paused && target) {
      const distanceAfter = Math.hypot(target[0] - this.position.x, target[2] - this.position.z);
      this.stalledFor = distanceAfter < distanceBefore - 0.001 ? 0 : this.stalledFor + delta;
      if (this.stalledFor >= 0.75 && this.recover()) return { kind: "complete" };
    }
    if (this.stops.length > 0 || !this.routeGoal) return null;
    const arrived = this.destination;
    this.destination = null;
    this.routeGoal = null;
    this.motor.stop();
    return arrived ? { kind: "arrived", id: arrived } : { kind: "complete" };
  }

  private recover(): boolean {
    const goal = this.routeGoal;
    if (!goal || this.replans >= 2) {
      this.stops = [];
      this.destination = null;
      this.routeGoal = null;
      this.motor.stop();
      return true;
    }
    this.replans += 1;
    this.stalledFor = 0;
    const path = this.navigation.path([this.position.x, this.position.z], goal, this.mode);
    if (!path) return false;
    this.stops = path
      .slice(1)
      .map((point) => [point[0], this.navigation.heightAt(point), point[1]]);
    return false;
  }

  private autoInput(paused: boolean): XY {
    if (paused) return [0, 0];
    let target = this.stops[0];
    while (target) {
      const dx = target[0] - this.position.x;
      const dz = target[2] - this.position.z;
      const remaining = Math.hypot(dx, dz);
      if (remaining >= 0.65) return [dx / remaining, dz / remaining];
      this.stops.shift();
      target = this.stops[0];
    }
    return [0, 0];
  }

  private nearestPOI(point: XY): SpatialPOI | null {
    return this.data.pois.reduce<SpatialPOI | null>((closest, poi) => {
      if (!closest) return poi;
      const distance = Math.hypot(poi.position[0] - point[0], poi.position[1] - point[1]);
      const closestDistance = Math.hypot(
        closest.position[0] - point[0],
        closest.position[1] - point[1],
      );
      return distance < closestDistance ? poi : closest;
    }, null);
  }

  private approach(goal: XY): { readonly point: XY; readonly distance: number } {
    const candidates = this.data.paths
      .flatMap((path) => {
        if (this.mode === "car" && (path.kind !== "road" || path.width < 2.4)) return [];
        if ((this.mode === "stroller" || this.mode === "bike") && path.kind === "steps") return [];
        return path.points.slice(1).flatMap((end, index) => {
          const start = path.points[index];
          return start ? [project(goal, start, end)] : [];
        });
      })
      .sort((left, right) => left.distance - right.distance);
    const nearest = candidates.find((candidate) =>
      this.navigation.passable(candidate.point, this.mode),
    );
    if (!nearest || (this.mode !== "car" && nearest.distance <= 40)) {
      return { point: goal, distance: 0 };
    }
    return nearest;
  }
}
