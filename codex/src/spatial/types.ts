import type { Group } from "three";
export type XY = readonly [number, number];
export type GroundPoint = readonly [number, number, number];
export type SpatialBuilding = {
  readonly id: string;
  readonly name: string;
  readonly ring: readonly XY[];
  readonly height: number;
  readonly heightSource: string;
  readonly kind: string;
  readonly source: string;
};
export type SpatialPath = {
  readonly id: string;
  readonly name: string;
  readonly points: readonly XY[];
  readonly width: number;
  readonly kind: "road" | "footpath" | "steps" | "cycleway";
  readonly source: string;
};
export type SpatialPOI = {
  readonly id: string;
  readonly name: string;
  readonly position: XY;
  readonly source: string;
};
export type SpatialWorld = {
  readonly id: string;
  readonly name: string;
  readonly origin: {
    readonly longitude: number;
    readonly latitude: number;
    readonly elevation: number;
  };
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
  readonly spawn: XY;
  readonly elevation: {
    readonly columns: number;
    readonly rows: number;
    readonly values: readonly number[];
    readonly source: string;
    readonly resolution: string;
    readonly status: string;
  };
  readonly buildings: readonly SpatialBuilding[];
  readonly paths: readonly SpatialPath[];
  readonly pois: readonly SpatialPOI[];
  readonly sources: readonly {
    readonly title: string;
    readonly url: string;
    readonly checked: string;
    readonly note: string;
  }[];
};
export type GroundScene = { readonly group: Group; readonly buildings: readonly Group[] };
