import { brandImage } from "../architecture/brand-images";
import { BRAND_MARKS } from "../architecture/brands";
import type { FacadePalette } from "../architecture/profiles";
import { buildingGeometry, clipPolygon } from "./building-draw";
import type { BuildingFrame, ScreenPoint } from "./types";

type PaletteKey = keyof FacadePalette;

const HEIGHT_SCALES: Readonly<Record<string, number>> = {
  "soft-isometric": 1,
  "pixel-blocks": 0.9,
  "paper-cut": 0.82,
  "clay-toy": 0.76,
  "ink-plan": 1,
  woodblock: 0.9,
  "flat-roof": 0,
  watercolor: 0.86,
  "manga-cel": 1.05,
  "white-model": 0.95,
};

function nightColor(color: string): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return color;
  const channel = (value: string | undefined): number =>
    Math.round(Number.parseInt(value ?? "00", 16) * 0.58);
  const hex = (value: number): string => value.toString(16).padStart(2, "0");
  return `#${hex(channel(match[1]))}${hex(channel(match[2]))}${hex(channel(match[3]))}`;
}

export function identityColor(frame: BuildingFrame, key: PaletteKey, fallback: string): string {
  const color = frame.profile?.palette[key];
  if (!color) return fallback;
  if (frame.night && key !== "glass") return nightColor(color);
  return frame.night && key === "glass" ? "#f3d37c" : color;
}

export function identityHeightScale(styleId: string): number {
  return HEIGHT_SCALES[styleId] ?? 1;
}

function normalizedPoint(
  topLeft: ScreenPoint,
  topRight: ScreenPoint,
  bottomLeft: ScreenPoint,
  x: number,
  y: number,
): ScreenPoint {
  return {
    x: topLeft.x + (topRight.x - topLeft.x) * x + (bottomLeft.x - topLeft.x) * y,
    y: topLeft.y + (topRight.y - topLeft.y) * x + (bottomLeft.y - topLeft.y) * y,
  };
}

function fillFaceRect(
  ctx: CanvasRenderingContext2D,
  facade: readonly ScreenPoint[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  const topLeft = facade[0];
  const topRight = facade[1];
  const bottomLeft = facade[3];
  if (!topLeft || !topRight || !bottomLeft) return;
  const points = [
    normalizedPoint(topLeft, topRight, bottomLeft, x, y),
    normalizedPoint(topLeft, topRight, bottomLeft, x + width, y),
    normalizedPoint(topLeft, topRight, bottomLeft, x + width, y + height),
    normalizedPoint(topLeft, topRight, bottomLeft, x, y + height),
  ];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.fill();
}

function drawStructure(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const profile = frame.profile;
  if (!profile || frame.styleId === "flat-roof") return;
  const geometry = buildingGeometry(frame, identityHeightScale(frame.styleId));
  const facade = geometry.facade;
  if (facade.length < 4) return;
  clipPolygon(ctx, facade, () => {
    fillFaceRect(
      ctx,
      facade,
      0,
      1 - profile.baseRatio,
      1,
      profile.baseRatio,
      identityColor(frame, "base", profile.palette.base),
    );
    if (profile.facade === "teal-crown") {
      fillFaceRect(
        ctx,
        facade,
        0,
        0,
        1,
        0.055,
        identityColor(frame, "accent", profile.palette.accent),
      );
      fillFaceRect(
        ctx,
        facade,
        0.46,
        0.08,
        0.08,
        0.72,
        identityColor(frame, "side", profile.palette.side),
      );
    } else if (profile.facade === "terracotta-bays") {
      fillFaceRect(
        ctx,
        facade,
        0.16,
        0.08,
        0.065,
        0.72,
        identityColor(frame, "accent", profile.palette.accent),
      );
      fillFaceRect(
        ctx,
        facade,
        0.77,
        0.08,
        0.065,
        0.72,
        identityColor(frame, "accent", profile.palette.accent),
      );
    } else {
      for (let fin = 1; fin < 6; fin += 1)
        fillFaceRect(
          ctx,
          facade,
          fin / 6 - 0.009,
          0.06,
          0.018,
          0.77,
          identityColor(frame, "mullion", profile.palette.mullion),
        );
    }
  });
}

function drawBrand(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const profile = frame.profile;
  if (!profile || !frame.showBrand || frame.styleId === "flat-roof") return;
  const image = brandImage(profile.brand);
  if (!image) return;
  const geometry = buildingGeometry(frame, identityHeightScale(frame.styleId));
  const [topLeft, topRight, , bottomLeft] = geometry.facade;
  if (!topLeft || !topRight || !bottomLeft) return;
  const faceWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const faceHeight = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  if (faceWidth < 24 || faceHeight < 28) return;
  const mark = BRAND_MARKS[profile.brand];
  const scaleX = image.naturalWidth / mark.imageWidth;
  const scaleY = image.naturalHeight / mark.imageHeight;
  const crop = mark.crop;
  const aspect = crop.width / crop.height;
  const screenWidth = Math.min(18, faceWidth * 0.2);
  const width = screenWidth / faceWidth;
  const height = screenWidth / aspect / faceHeight;
  ctx.save();
  clipPolygon(ctx, geometry.facade, () => {
    ctx.transform(
      topRight.x - topLeft.x,
      topRight.y - topLeft.y,
      bottomLeft.x - topLeft.x,
      bottomLeft.y - topLeft.y,
      topLeft.x,
      topLeft.y,
    );
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0.08,
      Math.min(0.7, 0.82 - height),
      width,
      height,
    );
  });
  ctx.restore();
}

export function drawBuildingIdentity(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  drawStructure(ctx, frame);
  drawBrand(ctx, frame);
}
