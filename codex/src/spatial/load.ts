import ky from "ky";
import { z } from "zod";
import type { ComplexId } from "../complexes";
import { SpatialLoadError } from "../world-errors";
import type { SpatialWorld } from "./types";

const finiteNumber = z.number().finite();
const xySchema = z.tuple([finiteNumber, finiteNumber]);
const buildingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ring: z.array(xySchema).min(4),
  height: finiteNumber.positive(),
  heightSource: z.string().min(1),
  kind: z.string().min(1),
  source: z.string().url(),
});
const pathSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  points: z.array(xySchema).min(2),
  width: finiteNumber.positive(),
  kind: z.enum(["road", "footpath", "steps", "cycleway"]),
  source: z.string().url(),
});
const poiSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: xySchema,
  source: z.string().url(),
});
const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  checked: z.iso.date(),
  note: z.string().min(1),
});

export const spatialWorldSchema: z.ZodType<SpatialWorld> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  origin: z.object({ longitude: finiteNumber, latitude: finiteNumber, elevation: finiteNumber }),
  bounds: z
    .object({ minX: finiteNumber, maxX: finiteNumber, minZ: finiteNumber, maxZ: finiteNumber })
    .refine(
      (bounds) => bounds.minX < bounds.maxX && bounds.minZ < bounds.maxZ,
      "Spatial bounds must have positive area",
    ),
  spawn: xySchema,
  elevation: z
    .object({
      columns: z.number().int().min(2),
      rows: z.number().int().min(2),
      values: z.array(finiteNumber),
      source: z.string().min(1),
      resolution: z.string().min(1),
      status: z.string().min(1),
    })
    .refine(
      (grid) => grid.values.length === grid.columns * grid.rows,
      "Elevation values must match rows × columns",
    ),
  buildings: z.array(buildingSchema),
  paths: z.array(pathSchema),
  pois: z.array(poiSchema),
  sources: z.array(sourceSchema).min(1),
});

export function parseSpatial(input: unknown): SpatialWorld {
  return spatialWorldSchema.parse(input);
}

export async function loadSpatial(id: ComplexId): Promise<SpatialWorld> {
  try {
    const input = await ky.get(`/worlds/${id}.json`, { retry: 2, timeout: 15_000 }).json<unknown>();
    return parseSpatial(input);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new SpatialLoadError(
      error instanceof z.ZodError || error instanceof SyntaxError ? "invalid" : "network",
      error,
    );
  }
}
