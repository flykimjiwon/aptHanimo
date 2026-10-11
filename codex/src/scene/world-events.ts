import type { GroundPoint } from "../spatial/types";

export type WorldEvents = {
  readonly onSelect: (id: string) => void;
  readonly onGround: (point: GroundPoint) => boolean;
  readonly onArrive: (id: string) => void;
  readonly onPosition: (x: number, z: number, y: number, heading?: number) => void;
  readonly onManual?: (moving: boolean) => void;
};
