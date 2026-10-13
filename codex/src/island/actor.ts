import type { Group } from "three";
import type { MotorPosition } from "../scene/motor";
import type { XY } from "../spatial/types";

export interface IslandActor {
  readonly group: Group;
  readonly position: MotorPosition;
  readonly route: readonly XY[];
  readonly active: boolean;
  start(): void;
  pause(): void;
  goTo(point: XY): boolean;
  update(delta: number, input: XY, reduced: boolean): number;
  needsAnimation?(reduced: boolean): boolean;
  dispose?(): void;
}
