import { z } from "zod";
import cherbo from "../../research/spatial/cherbo-hogang-polygon.json";
import haiver from "../../research/spatial/haiver-hogang-polygon.json";
import xi from "../../research/spatial/xi-hogang-polygon.json";
import type { IslandSite } from "../island/site";
import type { SpatialWorld, XY } from "../spatial/types";

const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const sourceSchema = z.object({
  body: z.object({
    data: z.object({
      groupPolygons: z.array(z.array(z.array(z.array(point).min(4)))),
    }),
  }),
});
const sources: Readonly<Record<string, unknown>> = { haiver, xi, cherbo };

export function siteFor(world: SpatialWorld): IslandSite {
  const source = sourceSchema.parse(sources[world.id]);
  const coordinates = source.body.data.groupPolygons[0]?.[0]?.[0];
  if (!coordinates) throw new RangeError(`Missing site boundary: ${world.id}`);
  const ring: XY[] = coordinates.map((p) => [
    Math.round(
      (p.x - world.origin.longitude) *
        111320 *
        Math.cos((world.origin.latitude * Math.PI) / 180) *
        100,
    ) / 100,
    Math.round(-(p.y - world.origin.latitude) * 111320 * 100) / 100,
  ]);
  const bounds = {
    minX: Math.min(...ring.map((p) => p[0])),
    maxX: Math.max(...ring.map((p) => p[0])),
    minZ: Math.min(...ring.map((p) => p[1])),
    maxZ: Math.max(...ring.map((p) => p[1])),
  };
  return {
    ring,
    bounds,
    center: [(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2],
    spawn: world.id === "xi" ? [40, 85] : world.spawn,
  };
}
