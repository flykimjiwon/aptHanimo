import type { ComplexProfile } from "../architecture/profiles";
import type { BuildingFrame, ScreenPoint } from "./types";

export type BuildingGeometry = {
  readonly base: readonly ScreenPoint[];
  readonly roof: readonly ScreenPoint[];
  readonly facade: readonly ScreenPoint[];
  readonly lift: number;
};

export type ExtrusionColors = {
  readonly roof: string;
  readonly wall: string;
  readonly side: string;
  readonly outline: string;
};

export function pathPolygon(ctx: CanvasRenderingContext2D, points: readonly ScreenPoint[]): void {
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
}

export function fillStroke(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  fill: string,
  stroke: string,
  width = 1,
): void {
  pathPolygon(ctx, points);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function bounds(points: readonly ScreenPoint[]): DOMRect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return new DOMRect(minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY);
}

export function buildingGeometry(frame: BuildingFrame, heightScale = 1): BuildingGeometry {
  const lift = Math.max(3, frame.height * heightScale);
  const roof = frame.footprint.map((point) => ({ x: point.x, y: point.y - lift }));
  let edge = 0;
  let score = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < frame.footprint.length; index += 1) {
    const start = frame.footprint[index];
    const end = frame.footprint[(index + 1) % frame.footprint.length];
    if (!start || !end) continue;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const value = (start.y + end.y) / 2 + length * 0.08;
    if (value > score) {
      score = value;
      edge = index;
    }
  }
  const a = frame.footprint[edge];
  const b = frame.footprint[(edge + 1) % frame.footprint.length];
  const ra = roof[edge];
  const rb = roof[(edge + 1) % roof.length];
  return {
    base: frame.footprint,
    roof,
    facade: a && b && ra && rb ? [ra, rb, b, a] : [],
    lift,
  };
}

export function drawExtrusion(
  ctx: CanvasRenderingContext2D,
  geometry: BuildingGeometry,
  colors: ExtrusionColors,
  outlineWidth = 1,
): void {
  for (let index = 0; index < geometry.base.length; index += 1) {
    const a = geometry.base[index];
    const b = geometry.base[(index + 1) % geometry.base.length];
    const ra = geometry.roof[index];
    const rb = geometry.roof[(index + 1) % geometry.roof.length];
    if (!a || !b || !ra || !rb) continue;
    fillStroke(
      ctx,
      [ra, rb, b, a],
      index % 2 === 0 ? colors.wall : colors.side,
      colors.outline,
      outlineWidth,
    );
  }
  fillStroke(ctx, geometry.roof, colors.roof, colors.outline, outlineWidth);
}

export function clipPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  draw: () => void,
): void {
  ctx.save();
  pathPolygon(ctx, points);
  ctx.clip();
  draw();
  ctx.restore();
}

export function facadeGrid(
  ctx: CanvasRenderingContext2D,
  facade: readonly ScreenPoint[],
  color: string,
  seed: number,
  shape: "rect" | "dot" | "line" = "rect",
  window?: ComplexProfile["window"],
): void {
  if (facade.length < 4) return;
  const area = bounds(facade);
  const spacing = window?.spacing ?? 2.3;
  const columns = Math.max(2, Math.min(8, Math.floor(area.width / (4.8 + spacing))));
  const rows = Math.max(2, Math.min(9, Math.floor(area.height / (4.8 + spacing))));
  clipPolygon(ctx, facade, () => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (randomUnit(seed, row * columns + column) < 0.12) continue;
        const x = area.x + ((column + 0.5) / columns) * area.width;
        const y = area.y + ((row + 0.55) / rows) * area.height;
        const width = Math.max(1.5, (area.width / columns / 2.8) * (window?.width ?? 1));
        const height = Math.max(1.5, (area.height / rows / 2.8) * (window?.height ?? 1));
        if (shape === "dot") {
          ctx.beginPath();
          ctx.ellipse(x, y, width * 0.55, height * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === "line") {
          ctx.beginPath();
          ctx.moveTo(x - width / 2, y);
          ctx.lineTo(x + width / 2, y);
          ctx.stroke();
        } else ctx.fillRect(x - width / 2, y - height / 2, width, height);
      }
    }
  });
}

export function balconyBands(
  ctx: CanvasRenderingContext2D,
  facade: readonly ScreenPoint[],
  color: string,
  count: number,
  width = 1.4,
): void {
  if (facade.length < 4) return;
  const area = bounds(facade);
  clipPolygon(ctx, facade, () => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (let band = 1; band <= count; band += 1) {
      const y = area.y + (area.height * band) / (count + 1);
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
    }
  });
}

export function entrance(
  ctx: CanvasRenderingContext2D,
  facade: readonly ScreenPoint[],
  color: string,
): void {
  const area = bounds(facade);
  const width = Math.max(3, Math.min(8, area.width * 0.16));
  const height = Math.max(4, Math.min(10, area.height * 0.2));
  ctx.fillStyle = color;
  ctx.fillRect(area.x + area.width * 0.5 - width / 2, area.y + area.height - height, width, height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(area.x + area.width * 0.5, area.y + area.height);
  ctx.lineTo(area.x + area.width * 0.5, area.y + area.height + 8);
  ctx.stroke();
}

export function randomUnit(seed: number, index: number): number {
  const value = Math.sin(seed * 91.345 + index * 47.13) * 43_758.5453;
  return value - Math.floor(value);
}
