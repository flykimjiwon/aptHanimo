import { z } from "zod";

export const CHARACTER_IDS = [
  "crew-pixel",
  "round-buddy",
  "voxel-walker",
  "paper-scout",
  "ink-friend",
  "plush-crew",
  "bead-crew",
  "rubber-hose",
  "leaf-guide",
  "sticker-pop",
] as const;
export const BUILDING_IDS = [
  "soft-isometric",
  "pixel-blocks",
  "paper-cut",
  "clay-toy",
  "ink-plan",
  "woodblock",
  "flat-roof",
  "watercolor",
  "manga-cel",
  "white-model",
  "realistic",
] as const;
export const MAP_IDS = [
  "soft-village",
  "flat-neighborhood",
  "paper-layers",
  "pixel-grid",
  "ink-notebook",
  "topo-outdoor",
  "toy-island",
  "watercolor-park",
  "evening-market",
  "clean-architect",
  "realistic-neighborhood",
] as const;
export const VIEW_IDS = ["flat", "isometric", "perspective"] as const;

export const worldStyleSchema = z.object({
  character: z.enum(CHARACTER_IDS),
  building: z.enum(BUILDING_IDS),
  map: z.enum(MAP_IDS),
  view: z.enum(VIEW_IDS),
});
export type CharacterStyle = (typeof CHARACTER_IDS)[number];
export type BuildingStyle = (typeof BUILDING_IDS)[number];
export type MapStyle = (typeof MAP_IDS)[number];
export type WorldView = (typeof VIEW_IDS)[number];
export type WorldStyle = Readonly<z.infer<typeof worldStyleSchema>>;

export const DEFAULT_WORLD_STYLE: WorldStyle = {
  character: "round-buddy",
  building: "soft-isometric",
  map: "soft-village",
  view: "isometric",
};
