import { buildingProfile } from "../architecture/profiles";
import { heightAt } from "../spatial/height";
import type { SpatialBuilding, SpatialWorld } from "../spatial/types";
import { drawBuilding } from "./buildings";
import { drawCharacter } from "./characters";
import { drawGround, drawMapFrame, type GroundRender } from "./map-ground";
import {
  createProjection,
  intersectsBounds,
  type MapProjection,
  projectedFacing,
  projectPoint,
  unprojectPoint,
  visibleBounds,
  worldDirection,
} from "./map-projection";
import { type MapTheme, mapTheme } from "./map-themes";
import type { BuildingFrame, MapFrame, ScreenPoint } from "./types";

type BuildingEntry = {
  readonly kind: "building";
  readonly depth: number;
  readonly alpha: number;
  readonly frame: BuildingFrame;
};

type PlayerEntry = {
  readonly kind: "player";
  readonly depth: number;
  readonly point: ScreenPoint;
  readonly size: number;
};

type DrawEntry = BuildingEntry | PlayerEntry;

type SceneRender = {
  readonly ctx: CanvasRenderingContext2D;
  readonly frame: MapFrame;
  readonly theme: MapTheme;
  readonly projection: MapProjection;
};

function assertNever(value: never): never {
  throw new TypeError(`Unknown map draw entry: ${String(value)}`);
}

function buildingSeed(id: string): number {
  let value = 2_166_136_261;
  for (const character of id) value = Math.imul(value ^ character.charCodeAt(0), 16_777_619);
  return value >>> 0;
}

function footprint(
  data: SpatialWorld,
  building: SpatialBuilding,
  projection: MapProjection,
): readonly ScreenPoint[] {
  return building.ring.map((point) => projectPoint(projection, point, heightAt(data, ...point)));
}

function projectedBounds(points: readonly ScreenPoint[]): {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
} {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

function occludesPlayer(
  area: ReturnType<typeof projectedBounds>,
  height: number,
  player: ScreenPoint,
): boolean {
  return (
    area.maxY >= player.y - 4 &&
    player.x >= area.minX - 3 &&
    player.x <= area.maxX + 3 &&
    player.y >= area.minY - height - 4 &&
    player.y <= area.maxY + 4
  );
}

function buildingEntries(render: SceneRender, player: ScreenPoint): readonly BuildingEntry[] {
  const { frame, theme, projection } = render;
  const bounds = visibleBounds(projection, theme.maxBuildingHeight + 20);
  return frame.data.buildings.flatMap((building) => {
    if (!intersectsBounds(building.ring, bounds)) return [];
    const points = footprint(frame.data, building, projection);
    if (points.length < 3) return [];
    const area = projectedBounds(points);
    const height = Math.max(
      3,
      Math.min(theme.maxBuildingHeight, building.height * projection.scale * theme.heightScale),
    );
    const width = area.maxX - area.minX;
    const screenHeight = area.maxY - area.minY;
    if (
      area.maxX < -10 ||
      area.minX > frame.width + 10 ||
      area.maxY < -height - 10 ||
      area.minY - height > frame.height + 10 ||
      (building.kind !== "core" && (width < 2.5 || screenHeight < 2.5))
    )
      return [];
    const profile = buildingProfile(building);
    const identity = profile ? { profile, showBrand: true } : {};
    return [
      {
        kind: "building" as const,
        depth: area.maxY,
        alpha: occludesPlayer(area, height, player) ? 0.24 : building.kind === "core" ? 1 : 0.82,
        frame: {
          styleId: frame.buildingStyleId,
          footprint: points,
          height,
          night: frame.night,
          seed: buildingSeed(building.id),
          ...identity,
        },
      },
    ];
  });
}

function drawEntry(render: SceneRender, entry: DrawEntry): void {
  const { ctx, frame, theme } = render;
  switch (entry.kind) {
    case "building":
      ctx.save();
      ctx.globalAlpha = entry.alpha;
      drawBuilding(ctx, entry.frame);
      ctx.restore();
      return;
    case "player":
      drawCharacter(ctx, {
        styleId: frame.characterStyleId,
        x: entry.point.x,
        y: entry.point.y - entry.size * 0.38,
        size: entry.size,
        phase: frame.player.phase,
        facing: projectedFacing(theme, frame.player.facing),
      });
      return;
    default:
      assertNever(entry);
  }
}

export function drawNeighborhood(ctx: CanvasRenderingContext2D, frame: MapFrame): void {
  const theme = mapTheme(frame.styleId);
  const projection = createProjection(theme, {
    width: frame.width,
    height: frame.height,
    camera: frame.camera,
    zoom: frame.camera.zoom,
  });
  const bounds = visibleBounds(projection);
  const ground: GroundRender = { ctx, frame, theme, projection, bounds };
  const render: SceneRender = { ctx, frame, theme, projection };
  drawGround(ground);
  const playerElevation = heightAt(frame.data, frame.player.x, frame.player.z);
  const playerPoint = projectPoint(projection, [frame.player.x, frame.player.z], playerElevation);
  const size = Math.max(40, Math.min(60, 46 * Math.sqrt(Math.max(0.5, frame.camera.zoom))));
  const entries: DrawEntry[] = [
    ...buildingEntries(render, playerPoint),
    { kind: "player", depth: playerPoint.y, point: playerPoint, size },
  ];
  entries.sort((a, b) => a.depth - b.depth || (a.kind === "building" ? -1 : 1));
  if (theme.pattern === "toy") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      frame.width / 2,
      frame.height / 2,
      frame.width * 0.47,
      frame.height * 0.44,
      0,
      0,
      Math.PI * 2,
    );
    ctx.clip();
  }
  for (const entry of entries) drawEntry(render, entry);
  if (theme.pattern === "toy") ctx.restore();
  drawMapFrame(ground);
}

export function screenToWorld(point: ScreenPoint, frame: MapFrame): { x: number; z: number } {
  const projection = createProjection(mapTheme(frame.styleId), {
    width: frame.width,
    height: frame.height,
    camera: frame.camera,
    zoom: frame.camera.zoom,
  });
  return unprojectPoint(projection, point);
}

export function screenDirectionToWorld(
  styleId: string,
  vector: ScreenPoint,
): { x: number; z: number } {
  return worldDirection(mapTheme(styleId), vector);
}

export function drawMapPreview(
  canvas: HTMLCanvasElement,
  styleId: string,
  data: SpatialWorld,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawNeighborhood(ctx, {
    width: canvas.width,
    height: canvas.height,
    styleId,
    buildingStyleId: "soft-isometric",
    characterStyleId: "crew-pixel",
    data,
    camera: { x: data.spawn[0], z: data.spawn[1], zoom: 1.2 },
    player: { x: data.spawn[0], z: data.spawn[1], phase: 0, facing: 0 },
    night: false,
  });
}
