import { Group } from "three";
import { animateAvatar } from "../scene/avatar-motion";
import { MaterialPalette } from "../scene/materials";
import { MovementMotor } from "../scene/motor";
import { solidPerson } from "../scene/solid-person";
import type { SpatialWorld, XY } from "../spatial/types";
import { IslandNavigation, islandPaths } from "./site";

export class IslandWalk {
  readonly group = new Group();
  readonly navigation: IslandNavigation;
  private readonly motor: MovementMotor;
  private targets: XY[] = [];
  private distance = 0;
  private readonly stops: readonly XY[];
  private stopIndex = 0;
  active = false;
  constructor(world: SpatialWorld) {
    this.navigation = new IslandNavigation(world);
    const spawn = this.navigation.nearestPassable([40, 85], "walk", 30);
    if (!spawn) throw new RangeError("No walkable starting point in the island");
    this.motor = new MovementMotor(this.navigation, "walk", spawn);
    const palette = new MaterialPalette();
    const person = solidPerson("island-friend", "round-buddy", { color: "#8dd3cf", palette });
    person.scale.setScalar(1.7);
    this.group.add(person);
    this.group.name = "island-walker";
    this.stops = islandPaths(world)
      .filter((_, i) => i % 25 === 0)
      .map((s) => s.from)
      .filter((p) => this.navigation.passable(p, "walk"));
    this.update(0, [0, 0], false);
  }
  get position() {
    return this.motor.position;
  }
  get route(): readonly XY[] {
    return this.targets;
  }
  start(): void {
    this.active = true;
    if (!this.targets.length) this.next();
  }
  pause(): void {
    this.active = false;
    this.motor.stop();
    this.update(0, [0, 0], true);
  }
  goTo(point: XY): boolean {
    if (!this.navigation.passable(point, "walk")) return false;
    const path = this.navigation.path([this.position.x, this.position.z], point, "walk");
    if (!path) return false;
    this.targets = [...path.slice(1)];
    this.active = true;
    return true;
  }
  private next(): void {
    for (let i = 0; i < this.stops.length; i++) {
      const target = this.stops[this.stopIndex++ % this.stops.length];
      if (
        target &&
        Math.hypot(target[0] - this.position.x, target[1] - this.position.z) > 15 &&
        this.goTo(target)
      )
        return;
    }
    this.pause();
  }
  update(delta: number, input: XY, reduced: boolean): number {
    const before = this.position;
    if (this.active) {
      const manual = Math.hypot(...input) > 0.01;
      if (manual) this.targets = [];
      let target = this.targets[0];
      if (target && Math.hypot(target[0] - before.x, target[1] - before.z) < 0.02) {
        this.targets.shift();
        target = this.targets[0];
      }
      const dx = target ? target[0] - before.x : 0,
        dz = target ? target[1] - before.z : 0,
        length = Math.hypot(dx, dz);
      this.motor.step(
        delta,
        manual ? input : length > 0 ? [dx / length, dz / length] : [0, 0],
        manual ? undefined : target,
      );
      if (!manual && !this.targets.length) this.next();
    }
    const pos = this.position,
      moved = Math.hypot(pos.x - before.x, pos.z - before.z);
    this.distance += moved;
    this.group.position.set(pos.x, pos.y + 0.35, pos.z);
    this.group.rotation.y = pos.heading;
    animateAvatar(this.group, {
      heading: pos.heading,
      cameraAngle: 0,
      movedDistance: moved,
      traveledDistance: this.distance / 7.5,
      reducedMotion: reduced,
    });
    return moved;
  }
}
