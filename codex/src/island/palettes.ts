export type IslandPalette = {
  readonly label: string;
  readonly sky: string;
  readonly grass: string;
  readonly edge: string;
  readonly soil: string;
  readonly rock: string;
  readonly wall: string;
  readonly roof: string;
  readonly glass: string;
  readonly accent: string;
  readonly path: string;
  readonly tree: string;
  readonly leaf: string;
  readonly night: boolean;
};
export const PALETTES = {
  garden: {
    label: "초록 정원",
    sky: "#edf3e9",
    grass: "#b4cc91",
    edge: "#e1e3c9",
    soil: "#b2a68b",
    rock: "#8c9e87",
    wall: "#f7f2df",
    roof: "#9bb6a5",
    glass: "#648e91",
    accent: "#c98b66",
    path: "#e5d5b6",
    tree: "#6f9c68",
    leaf: "#92b575",
    night: false,
  },
  clay: {
    label: "살구빛 점토",
    sky: "#f4e6db",
    grass: "#c7ca9d",
    edge: "#ecdbc5",
    soil: "#ba957a",
    rock: "#a48878",
    wall: "#f9e6ce",
    roof: "#d7977b",
    glass: "#729c99",
    accent: "#b86650",
    path: "#e4c7a8",
    tree: "#8ea47a",
    leaf: "#b1bd8b",
    night: false,
  },
  dusk: {
    label: "파란 저녁",
    sky: "#263c53",
    grass: "#647f78",
    edge: "#869d91",
    soil: "#536b74",
    rock: "#3c5261",
    wall: "#c5d1cc",
    roof: "#637f8b",
    glass: "#f4d29b",
    accent: "#cba07c",
    path: "#aab3a0",
    tree: "#456a61",
    leaf: "#638a74",
    night: true,
  },
} as const satisfies Readonly<Record<string, IslandPalette>>;
export type PaletteId = keyof typeof PALETTES;
