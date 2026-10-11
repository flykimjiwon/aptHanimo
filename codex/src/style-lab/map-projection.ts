import type { MapTheme } from "./map-themes";
import type { ScreenPoint } from "./types";

export type MapProjection = {
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly cameraX: number;
  readonly cameraZ: number;
  readonly scale: number;
  readonly angle: number;
  readonly pitch: number;
  readonly elevationScale: number;
  readonly pixelSize: number;
};

export type ProjectionInput = {
  readonly width: number;
  readonly height: number;
  readonly camera: { readonly x: number; readonly z: number };
  readonly zoom: number;
};

export type WorldBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export function createProjection(theme: MapTheme, input: ProjectionInput): MapProjection {
  const radius = 180 / clamp(input.zoom, 0.35, 3.2);
  const scale = Math.max(input.width, input.height) / (radius * 2);
  return {
    width: input.width,
    height: input.height,
    centerX: input.width / 2,
    centerY: input.height * (theme.pattern === "toy" ? 0.54 : 0.52),
    cameraX: input.camera.x,
    cameraZ: input.camera.z,
    scale,
    angle: theme.angle,
    pitch: theme.pitch,
    elevationScale: theme.elevationScale,
    pixelSize: theme.pixelSize,
  };
}

export function projectPoint(
  projection: MapProjection,
  point: readonly [number, number],
  elevation: number,
): ScreenPoint {
  const dx = point[0] - projection.cameraX;
  const dz = point[1] - projection.cameraZ;
  const cosine = Math.cos(projection.angle);
  const sine = Math.sin(projection.angle);
  const across = dx * cosine - dz * sine;
  const depth = dx * sine + dz * cosine;
  const x = projection.centerX + across * projection.scale;
  const y =
    projection.centerY +
    depth * projection.scale * projection.pitch -
    elevation * projection.scale * projection.elevationScale;
  if (projection.pixelSize === 0) return { x, y };
  return {
    x: Math.round(x / projection.pixelSize) * projection.pixelSize,
    y: Math.round(y / projection.pixelSize) * projection.pixelSize,
  };
}

export function unprojectPoint(
  projection: MapProjection,
  point: ScreenPoint,
): { x: number; z: number } {
  const across = (point.x - projection.centerX) / projection.scale;
  const depth = (point.y - projection.centerY) / (projection.scale * projection.pitch);
  const cosine = Math.cos(projection.angle);
  const sine = Math.sin(projection.angle);
  return {
    x: projection.cameraX + across * cosine + depth * sine,
    z: projection.cameraZ - across * sine + depth * cosine,
  };
}

export function worldDirection(theme: MapTheme, vector: ScreenPoint): { x: number; z: number } {
  const across = vector.x;
  const depth = vector.y / theme.pitch;
  const cosine = Math.cos(theme.angle);
  const sine = Math.sin(theme.angle);
  const x = across * cosine + depth * sine;
  const z = -across * sine + depth * cosine;
  const length = Math.hypot(x, z);
  return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

export function projectedFacing(theme: MapTheme, facing: number): number {
  const worldX = Math.sin(facing);
  const worldZ = Math.cos(facing);
  const screenX = worldX * Math.cos(theme.angle) - worldZ * Math.sin(theme.angle);
  const screenY = (worldX * Math.sin(theme.angle) + worldZ * Math.cos(theme.angle)) * theme.pitch;
  return Math.atan2(screenY, screenX);
}

export function visibleBounds(projection: MapProjection, margin = 30): WorldBounds {
  const corners = [
    unprojectPoint(projection, { x: -margin, y: -margin }),
    unprojectPoint(projection, { x: projection.width + margin, y: -margin }),
    unprojectPoint(projection, { x: -margin, y: projection.height + margin }),
    unprojectPoint(projection, { x: projection.width + margin, y: projection.height + margin }),
  ];
  return {
    minX: Math.min(...corners.map((point) => point.x)),
    maxX: Math.max(...corners.map((point) => point.x)),
    minZ: Math.min(...corners.map((point) => point.z)),
    maxZ: Math.max(...corners.map((point) => point.z)),
  };
}

export function intersectsBounds(
  points: readonly (readonly [number, number])[],
  bounds: WorldBounds,
): boolean {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point[0]);
    maxX = Math.max(maxX, point[0]);
    minZ = Math.min(minZ, point[1]);
    maxZ = Math.max(maxZ, point[1]);
  }
  return minX <= bounds.maxX && maxX >= bounds.minX && minZ <= bounds.maxZ && maxZ >= bounds.minZ;
}
