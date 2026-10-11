export type MapPattern =
  | "meadow"
  | "plain"
  | "paper"
  | "pixels"
  | "hatch"
  | "topo"
  | "toy"
  | "wash"
  | "lanterns"
  | "grid";

export type MapTheme = {
  readonly id: string;
  readonly angle: number;
  readonly pitch: number;
  readonly elevationScale: number;
  readonly heightScale: number;
  readonly maxBuildingHeight: number;
  readonly roadScale: number;
  readonly contourInterval: number;
  readonly terrainStep: number;
  readonly pixelSize: number;
  readonly pattern: MapPattern;
  readonly background: string;
  readonly landLow: string;
  readonly landHigh: string;
  readonly road: string;
  readonly roadCasing: string;
  readonly footpath: string;
  readonly steps: string;
  readonly contour: string;
  readonly ink: string;
};
