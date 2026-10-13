import { Group } from "three";
import { IslandNavigation, type IslandSite, islandPaths } from "../island/site";
import { MovementMotor } from "../scene/motor";
import type { SpatialWorld, XY } from "../spatial/types";
import { Buddy } from "./buddy";
import type { Pose, Preferences } from "./options";

export class VillageWalker {
  readonly group = new Group();
  readonly navigation: IslandNavigation;
  private readonly motor: MovementMotor;
  private buddy: Buddy;
  private targets: XY[] = [];
  private readonly stops: readonly XY[];
  private stopIndex = 0;
  private time = 0;
  private distance = 0;
  private arrivalTime = 0;
  private intent: "stroll" | "destination" | "manual" = "stroll";
  active = false;
  pose: Pose = "auto";
  state: "idle" | "moving" | "paused" | "arrived" | "blocked" = "idle";
  routeVersion = 0;
  constructor(world: SpatialWorld, site: IslandSite, preferences: Preferences) {
    this.navigation = new IslandNavigation(world, site);
    const spawn = this.navigation.nearestPassable(site.spawn, "walk", 80);
    if (!spawn) throw new RangeError(`No walkable starting point: ${world.id}`);
    this.motor = new MovementMotor(this.navigation, "walk", spawn);
    this.buddy = new Buddy(preferences.buddy, preferences.species);
    this.group.add(this.buddy.group);
    const openGround: XY[] = [];
    for (let x = site.bounds.minX; x < site.bounds.maxX; x += 12)
      for (let z = site.bounds.minZ; z < site.bounds.maxZ; z += 12)
        if (this.navigation.passable([x, z], "walk")) openGround.push([x, z]);
    this.stops = [
      ...islandPaths(world, site)
        .filter((_, i) => i % 25 === 0)
        .map((s) => s.from),
      ...openGround,
    ].filter((p) => this.navigation.passable(p, "walk"));
    this.update(0, [0, 0], false);
  }
  get position() {
    return this.motor.position;
  }
  get route(): readonly XY[] {
    return this.targets;
  }
  setBuddy(preferences: Preferences): void {
    const next = new Buddy(preferences.buddy, preferences.species);
    this.group.remove(this.buddy.group);
    this.buddy.dispose();
    this.buddy = next;
    this.group.add(next.group);
    this.update(0, [0, 0], false);
  }
  setPose(pose: Pose): void {
    this.pause();
    this.targets = [];
    this.routeVersion++;
    this.pose = pose;
    this.arrivalTime = 0;
    this.state = "idle";
  }
  needsAnimation(reduced: boolean): boolean {
    return this.active || this.arrivalTime > 0 || (!reduced && this.pose !== "auto");
  }
  start(): void {
    this.pose = "auto";
    this.arrivalTime = 0;
    if (this.state === "paused" && this.targets.length) {
      this.active = true;
      this.state = "moving";
      return;
    }
    this.intent = "stroll";
    this.next();
  }
  pause(): void {
    this.active = false;
    this.motor.stop();
    if (this.state === "moving") this.state = "paused";
  }
  manual(): void {
    this.intent = "manual";
    this.targets = [];
    this.routeVersion++;
    this.pose = "auto";
    this.arrivalTime = 0;
    this.active = true;
    this.state = "moving";
  }
  goTo(point: XY): boolean {
    if (!this.navigation.passable(point, "walk")) return false;
    const path = this.navigation.path([this.position.x, this.position.z], point, "walk");
    if (!path) return false;
    this.intent = "destination";
    this.targets = [...path.slice(1)];
    this.routeVersion++;
    this.pose = "auto";
    this.arrivalTime = 0;
    this.active = true;
    this.state = "moving";
    return true;
  }
  private next(): void {
    for (let i = 0; i < this.stops.length; i++) {
      const p = this.stops[this.stopIndex++ % this.stops.length];
      if (p && Math.hypot(p[0] - this.position.x, p[1] - this.position.z) > 15 && this.goTo(p)) {
        this.intent = "stroll";
        return;
      }
    }
    this.pause();
    this.state = "blocked";
  }
  update(delta: number, input: XY, reduced: boolean): number {
    this.time += delta;
    this.arrivalTime = Math.max(0, this.arrivalTime - delta);
    const before = this.position;
    for (let step = 0; step < 4 && this.active; step++) {
      const manual = Math.hypot(...input) > 0.01;
      if (manual && this.intent !== "manual") this.manual();
      const p = this.position;
      let target = this.targets[0];
      if (target && Math.hypot(target[0] - p.x, target[1] - p.z) < 0.02) {
        this.targets.shift();
        target = this.targets[0];
      }
      if (!manual && !target) {
        this.motor.stop();
        switch (this.intent) {
          case "stroll":
            this.next();
            break;
          case "destination":
            this.pause();
            this.state = "arrived";
            this.arrivalTime = 1.8;
            this.routeVersion++;
            break;
          case "manual":
            this.pause();
            this.state = "idle";
            break;
        }
        continue;
      }
      const dx = target ? target[0] - p.x : 0,
        dz = target ? target[1] - p.z : 0,
        length = Math.hypot(dx, dz);
      this.motor.step(
        delta,
        manual ? input : length ? [dx / length, dz / length] : [0, 0],
        manual ? undefined : target,
      );
    }
    const p = this.position,
      moved = Math.hypot(p.x - before.x, p.z - before.z);
    this.distance += moved;
    this.group.position.set(p.x, p.y + 0.35, p.z);
    this.group.rotation.y = p.heading;
    this.buddy.animate({
      pose: this.arrivalTime > 0 ? "happy" : this.pose,
      time: this.time,
      distance: this.distance,
      moving: moved > 0.001,
      reduced,
    });
    return moved;
  }
  dispose(): void {
    this.buddy.dispose();
    this.group.clear();
  }
}
