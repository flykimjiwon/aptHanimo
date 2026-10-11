import { heightAt } from "../spatial/height";
import type { SpatialPath } from "../spatial/types";
import { drawContours } from "./map-contours";
import {
  intersectsBounds,
  type MapProjection,
  projectPoint,
  type WorldBounds,
} from "./map-projection";
import type { MapTheme } from "./map-themes";
import type { MapFrame, ScreenPoint } from "./types";

export type GroundRender = {
  readonly ctx: CanvasRenderingContext2D;
  readonly frame: MapFrame;
  readonly theme: MapTheme;
  readonly projection: MapProjection;
  readonly bounds: WorldBounds;
};

function polygon(ctx: CanvasRenderingContext2D, points: readonly ScreenPoint[]): void {
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
}

function worldClip(render: GroundRender): void {
  const { ctx, frame, theme } = render;
  ctx.beginPath();
  if (theme.pattern === "toy")
    ctx.ellipse(
      frame.width / 2,
      frame.height / 2,
      frame.width * 0.47,
      frame.height * 0.44,
      0,
      0,
      Math.PI * 2,
    );
  else ctx.rect(0, 0, frame.width, frame.height);
  ctx.clip();
}

function terrain(render: GroundRender): void {
  const { ctx, frame, theme, projection, bounds } = render;
  const data = frame.data;
  const step = Math.max(
    theme.terrainStep,
    (bounds.maxX - bounds.minX) / 36,
    (bounds.maxZ - bounds.minZ) / 30,
  );
  const minX = Math.max(data.bounds.minX, Math.floor(bounds.minX / step) * step);
  const maxX = Math.min(data.bounds.maxX, bounds.maxX + step);
  const minZ = Math.max(data.bounds.minZ, Math.floor(bounds.minZ / step) * step);
  const maxZ = Math.min(data.bounds.maxZ, bounds.maxZ + step);
  const low = Math.min(...data.elevation.values) - data.origin.elevation;
  const high = Math.max(...data.elevation.values) - data.origin.elevation;
  const range = Math.max(1, high - low);
  for (let z = minZ; z < maxZ; z += step) {
    for (let x = minX; x < maxX; x += step) {
      const corners = [
        [x, z],
        [x + step, z],
        [x + step, z + step],
        [x, z + step],
      ] as const;
      const elevations = corners.map((point) => heightAt(data, point[0], point[1]));
      const points = corners.map((point, index) =>
        projectPoint(projection, point, elevations[index] ?? 0),
      );
      const average = elevations.reduce((sum, value) => sum + value, 0) / elevations.length;
      polygon(ctx, points);
      ctx.fillStyle = theme.landLow;
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(0.78, (average - low) / range));
      ctx.fillStyle = theme.landHigh;
      ctx.fill();
      ctx.restore();
    }
  }
}

function pattern(render: GroundRender): void {
  const { ctx, frame, theme } = render;
  ctx.save();
  ctx.globalAlpha = theme.pattern === "hatch" ? 0.15 : 0.1;
  ctx.strokeStyle = theme.ink;
  ctx.fillStyle = theme.ink;
  if (theme.pattern === "pixels" || theme.pattern === "grid") {
    const gap = theme.pattern === "pixels" ? 12 : 28;
    ctx.lineWidth = theme.pattern === "pixels" ? 2 : 0.7;
    for (let x = 0; x < frame.width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, frame.height);
      ctx.stroke();
    }
    for (let y = 0; y < frame.height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(frame.width, y);
      ctx.stroke();
    }
  } else if (theme.pattern === "hatch" || theme.pattern === "paper") {
    for (
      let offset = -frame.height;
      offset < frame.width;
      offset += theme.pattern === "hatch" ? 15 : 31
    ) {
      ctx.beginPath();
      ctx.moveTo(offset, frame.height);
      ctx.lineTo(offset + frame.height, 0);
      ctx.stroke();
    }
  } else if (theme.pattern === "wash") {
    for (let index = 0; index < 9; index += 1) {
      ctx.beginPath();
      ctx.ellipse(
        (index * 173) % frame.width,
        (index * 97) % frame.height,
        80,
        34,
        index * 0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (theme.pattern === "meadow" || theme.pattern === "toy") {
    for (let index = 0; index < 42; index += 1) {
      const x = (index * 89 + 31) % frame.width;
      const y = (index * 53 + 17) % frame.height;
      ctx.fillRect(x, y, theme.pattern === "toy" ? 3 : 1.5, theme.pattern === "toy" ? 3 : 1.5);
    }
  }
  ctx.restore();
}

function drawPath(render: GroundRender, path: SpatialPath): void {
  const { ctx, frame, projection, theme } = render;
  const points = path.points.map((point) =>
    projectPoint(projection, point, heightAt(frame.data, ...point)),
  );
  const first = points[0];
  if (!first) return;
  const trace = (): void => {
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  };
  ctx.lineCap = theme.pattern === "pixels" ? "butt" : "round";
  ctx.lineJoin = theme.pattern === "pixels" ? "miter" : "round";
  const width = Math.max(1.4, path.width * projection.scale * theme.roadScale);
  trace();
  ctx.strokeStyle = theme.roadCasing;
  ctx.lineWidth = width + (theme.pattern === "hatch" ? 2 : 3);
  ctx.stroke();
  trace();
  ctx.setLineDash(path.kind === "steps" ? [3, 3] : []);
  ctx.strokeStyle =
    path.kind === "road" ? theme.road : path.kind === "steps" ? theme.steps : theme.footpath;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawGround(render: GroundRender): void {
  const { ctx, frame, theme, projection, bounds } = render;
  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, frame.width, frame.height);
  ctx.save();
  worldClip(render);
  terrain(render);
  pattern(render);
  if (
    theme.pattern === "topo" ||
    theme.pattern === "paper" ||
    theme.pattern === "hatch" ||
    theme.pattern === "grid"
  ) {
    drawContours({
      ctx,
      data: frame.data,
      projection,
      bounds,
      interval: theme.contourInterval,
      color: theme.contour,
      sampleStep: Math.max(
        theme.terrainStep,
        (bounds.maxX - bounds.minX) / 36,
        (bounds.maxZ - bounds.minZ) / 30,
      ),
    });
  }
  for (const path of frame.data.paths)
    if (intersectsBounds(path.points, bounds)) drawPath(render, path);
  if (frame.night) {
    ctx.fillStyle = "#10213b33";
    ctx.fillRect(0, 0, frame.width, frame.height);
  }
  ctx.restore();
}

export function drawMapFrame(render: GroundRender): void {
  const { ctx, frame, theme } = render;
  ctx.save();
  ctx.strokeStyle = theme.ink;
  ctx.fillStyle = theme.pattern === "lanterns" ? "#f2b85b" : theme.ink;
  ctx.globalAlpha = 0.72;
  if (theme.pattern === "toy") {
    ctx.lineWidth = 8;
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
    ctx.stroke();
  } else if (theme.pattern === "lanterns") {
    for (let x = 24; x < frame.width; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 15);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, 21, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme.pattern === "meadow" || theme.pattern === "wash") {
    for (const [x, y] of [
      [18, 30],
      [42, 12],
      [frame.width - 24, 36],
      [frame.width - 48, frame.height - 20],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 13, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
