import type { Mode } from "../data";
import type { XY } from "../spatial/types";
import type { SpatialNavigation } from "./navigation";

const SPEEDS: Readonly<Record<Mode, number>> = {
  walk: 2.4,
  stroller: 1.8,
  bike: 5,
  car: 7,
};

const ACCELERATION: Readonly<Record<Mode, number>> = {
  walk: 8,
  stroller: 6,
  bike: 7,
  car: 5,
};

export type MotorPosition = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly heading: number;
};

function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function distanceSquared(a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return dx * dx + dz * dz;
}

export class MovementMotor {
  private x: number;
  private z: number;
  private y: number;
  private heading = 0;
  private speed = 0;

  constructor(
    private readonly navigation: SpatialNavigation,
    private mode: Mode,
    spawn: XY,
  ) {
    this.x = spawn[0];
    this.z = spawn[1];
    this.y = navigation.heightAt(spawn);
  }

  get position(): MotorPosition {
    return { x: this.x, y: this.y, z: this.z, heading: this.heading };
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.speed = Math.min(this.speed, SPEEDS[mode]);
  }

  teleport(point: XY, heading = this.heading): void {
    this.x = point[0];
    this.z = point[1];
    this.y = this.navigation.heightAt(point);
    this.heading = heading;
    this.speed = 0;
  }

  stop(): void {
    this.speed = 0;
  }

  step(delta: number, input: XY): boolean {
    const magnitude = Math.min(1, Math.hypot(input[0], input[1]));
    const desiredSpeed = SPEEDS[this.mode] * magnitude;
    const acceleration = magnitude > 0 ? ACCELERATION[this.mode] : ACCELERATION[this.mode] * 2;
    this.speed += Math.max(
      -acceleration * delta,
      Math.min(acceleration * delta, desiredSpeed - this.speed),
    );
    if (magnitude > 0.001) {
      const desiredHeading = Math.atan2(input[0], input[1]);
      if (this.mode === "car" || this.mode === "bike") {
        const turnRate = this.mode === "car" ? 1.8 : 2.8;
        const turn = Math.max(
          -turnRate * delta,
          Math.min(turnRate * delta, angleDelta(this.heading, desiredHeading)),
        );
        this.heading += turn;
      } else {
        this.heading = desiredHeading;
      }
    }
    if (this.speed < 0.001) return false;
    const start: XY = [this.x, this.z];
    const end: XY = [
      this.x + Math.sin(this.heading) * this.speed * delta,
      this.z + Math.cos(this.heading) * this.speed * delta,
    ];
    const direct = this.navigation.sweep(start, end, this.mode);
    let result = direct;
    if (distanceSquared(direct, end) > 0.0001) {
      const alongX = this.navigation.sweep(start, [end[0], start[1]], this.mode);
      const xThenZ = this.navigation.sweep(alongX, [alongX[0], end[1]], this.mode);
      const alongZ = this.navigation.sweep(start, [start[0], end[1]], this.mode);
      const zThenX = this.navigation.sweep(alongZ, [end[0], alongZ[1]], this.mode);
      result = distanceSquared(start, xThenZ) >= distanceSquared(start, zThenX) ? xThenZ : zThenX;
      if (distanceSquared(start, result) < 0.000001) this.speed = 0;
    }
    const moved = distanceSquared(start, result) > 0.000001;
    this.x = result[0];
    this.z = result[1];
    this.y = this.navigation.heightAt(result);
    return moved;
  }
}
