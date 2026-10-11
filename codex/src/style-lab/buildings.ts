import { BUILDING_STYLES } from "./building-catalog";
import { drawBuildingIdentity } from "./building-identity";
import {
  drawClayToy,
  drawInkPlan,
  drawPaperCut,
  drawPixelBlocks,
  drawSoftIsometric,
} from "./building-styles-a";
import {
  drawFlatRoof,
  drawMangaCel,
  drawWatercolor,
  drawWhiteModel,
  drawWoodblock,
} from "./building-styles-b";
import type { BuildingFrame } from "./types";

type BuildingRenderer = (ctx: CanvasRenderingContext2D, frame: BuildingFrame) => void;

const RENDERERS: Readonly<Record<string, BuildingRenderer>> = {
  "soft-isometric": drawSoftIsometric,
  "pixel-blocks": drawPixelBlocks,
  "paper-cut": drawPaperCut,
  "clay-toy": drawClayToy,
  "ink-plan": drawInkPlan,
  woodblock: drawWoodblock,
  "flat-roof": drawFlatRoof,
  watercolor: drawWatercolor,
  "manga-cel": drawMangaCel,
  "white-model": drawWhiteModel,
};

function styleSeed(styleId: string): number {
  let value = 17;
  for (const character of styleId) value = (value * 31 + character.charCodeAt(0)) % 10_007;
  return value;
}

export function drawBuilding(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  if (frame.footprint.length < 3) return;
  const renderer = RENDERERS[frame.styleId] ?? drawSoftIsometric;
  renderer(ctx, frame);
  drawBuildingIdentity(ctx, frame);
}

export function drawBuildingPreview(canvas: HTMLCanvasElement, styleId: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#f3f0dc");
  background.addColorStop(0.62, "#dce7c4");
  background.addColorStop(1, "#b9cf9f");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#92ad7948";
  ctx.beginPath();
  ctx.ellipse(width * 0.51, height * 0.8, width * 0.42, height * 0.13, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f7edcf";
  ctx.lineWidth = Math.max(3, width * 0.025);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.92);
  ctx.bezierCurveTo(
    width * 0.28,
    height * 0.78,
    width * 0.58,
    height * 0.9,
    width * 0.92,
    height * 0.72,
  );
  ctx.stroke();
  drawBuilding(ctx, {
    styleId,
    footprint: [
      { x: width * 0.25, y: height * 0.7 },
      { x: width * 0.47, y: height * 0.61 },
      { x: width * 0.77, y: height * 0.68 },
      { x: width * 0.83, y: height * 0.78 },
      { x: width * 0.53, y: height * 0.88 },
      { x: width * 0.18, y: height * 0.8 },
    ],
    height: height * 0.45,
    night: false,
    seed: styleSeed(styleId),
  });
}

export { BUILDING_STYLES };
