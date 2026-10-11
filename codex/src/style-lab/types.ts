import type { ComplexProfile } from "../architecture/profiles";
import type { SpatialWorld } from "../spatial/types";

export type StyleOption = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly cost: "가벼움" | "보통";
};
export type ScreenPoint = { readonly x: number; readonly y: number };
export type BuildingFrame = {
  readonly styleId: string;
  readonly footprint: readonly ScreenPoint[];
  readonly height: number;
  readonly night: boolean;
  readonly seed: number;
  readonly profile?: ComplexProfile;
  readonly showBrand?: boolean;
};
export type CharacterFrame = {
  readonly styleId: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly phase: number;
  readonly facing: number;
  readonly color?: string;
  readonly shadow?: boolean;
};
export type MapFrame = {
  readonly width: number;
  readonly height: number;
  readonly styleId: string;
  readonly buildingStyleId: string;
  readonly characterStyleId: string;
  readonly data: SpatialWorld;
  readonly camera: { readonly x: number; readonly z: number; readonly zoom: number };
  readonly player: {
    readonly x: number;
    readonly z: number;
    readonly phase: number;
    readonly facing: number;
  };
  readonly night: boolean;
};
