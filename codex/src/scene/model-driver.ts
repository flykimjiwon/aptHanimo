import type { Group } from "three";
import type { Layer, Mode } from "../data";
import { NODES, node } from "../graph";
import { route as modelRoute, type Route } from "../routes";
import type { XY } from "../spatial/types";

const SPEEDS: Readonly<Record<Mode, number>> = {
  walk: 2.4,
  stroller: 1.8,
  bike: 5,
  car: 7,
};

export class ModelDriver {
  private stops: string[] = [];

  constructor(private mode: Mode) {}

  get moving(): boolean {
    return this.stops.length > 0;
  }

  plan(player: Group, layer: Layer, destination: string): Route | null {
    const origin = this.nearestNode(player, layer);
    return origin ? modelRoute(origin, destination, this.mode) : null;
  }

  nearPlace(player: Group, layer: Layer): string | null {
    const nearest = this.nearestNode(player, layer);
    if (!nearest) return null;
    const point = node(nearest).position;
    return Math.hypot(point[0] - player.position.x, point[2] - player.position.z) <= 2.5
      ? nearest
      : null;
  }

  move(route: Route, player: Group): void {
    const first = route.nodes[0];
    const point = first ? node(first).position : null;
    const startsNear = point
      ? Math.hypot(point[0] - player.position.x, point[2] - player.position.z) <= 0.75
      : true;
    this.stops = [...(startsNear ? route.nodes.slice(1) : route.nodes)];
  }

  cancel(): void {
    this.stops = [];
  }

  setMode(mode: Mode): void {
    this.mode = mode;
  }

  manual(player: Group, delta: number, input: XY): void {
    const length = Math.hypot(input[0], input[1]);
    if (length < 0.01) return;
    const radius = this.mode === "car" ? 1.2 : 0.5;
    const distance = SPEEDS[this.mode] * delta;
    const x = player.position.x + (input[0] / length) * distance;
    const z = player.position.z + (input[1] / length) * distance;
    player.position.x = Math.max(-19 + radius, Math.min(19 - radius, x));
    player.position.z = Math.max(-13 + radius, Math.min(13 - radius, z));
    player.rotation.y = Math.atan2(input[0], input[1]);
  }

  step(player: Group, delta: number, paused: boolean): string | null {
    const id = this.stops[0];
    if (!id || paused) return null;
    const target = node(id).position;
    const dx = target[0] - player.position.x;
    const dy = target[1] + 0.75 - player.position.y;
    const dz = target[2] - player.position.z;
    const remaining = Math.hypot(dx, dy, dz);
    const amount = remaining === 0 ? 1 : Math.min(1, (6 * delta) / remaining);
    player.position.set(
      player.position.x + dx * amount,
      player.position.y + dy * amount,
      player.position.z + dz * amount,
    );
    player.rotation.y = Math.atan2(dx, dz);
    if (amount < 1) return null;
    this.stops.shift();
    return this.stops.length === 0 ? id : null;
  }

  private nearestNode(player: Group, layer: Layer): string | null {
    return (
      NODES.filter((candidate) => candidate.layer === layer).sort((left, right) => {
        const leftDistance = Math.hypot(
          left.position[0] - player.position.x,
          left.position[2] - player.position.z,
        );
        const rightDistance = Math.hypot(
          right.position[0] - player.position.x,
          right.position[2] - player.position.z,
        );
        return leftDistance - rightDistance;
      })[0]?.id ?? null
    );
  }
}
