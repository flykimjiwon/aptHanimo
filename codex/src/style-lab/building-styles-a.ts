import {
  balconyBands,
  bounds,
  buildingGeometry,
  clipPolygon,
  drawExtrusion,
  entrance,
  facadeGrid,
  fillStroke,
  pathPolygon,
  randomUnit,
} from "./building-draw";
import { identityColor } from "./building-identity";
import type { BuildingFrame } from "./types";

function roofBox(ctx: CanvasRenderingContext2D, frame: BuildingFrame, color: string): void {
  const geometry = buildingGeometry(frame);
  const area = bounds(geometry.roof);
  const width = Math.max(3, Math.min(12, area.width * 0.22));
  const height = Math.max(2, Math.min(7, area.height * 0.2));
  ctx.fillStyle = color;
  ctx.fillRect(area.x + area.width * 0.5 - width / 2, area.y + area.height * 0.45, width, height);
}

export function drawSoftIsometric(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame);
  ctx.save();
  ctx.shadowColor = "#33483c35";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  drawExtrusion(ctx, geometry, {
    roof: identityColor(frame, "roof", frame.night ? "#687778" : "#91a5a2"),
    wall: identityColor(frame, "wall", frame.night ? "#78867f" : "#f6ead5"),
    side: identityColor(frame, "side", frame.night ? "#66786f" : "#e5d4b9"),
    outline: "#42574d99",
  });
  ctx.shadowColor = "transparent";
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#f3d88c" : "#79a3a3"),
    frame.seed,
    "rect",
    frame.profile?.window,
  );
  balconyBands(ctx, geometry.facade, identityColor(frame, "accent", "#d9856d"), 4, 1.6);
  entrance(ctx, geometry.facade, "#426455");
  roofBox(ctx, frame, frame.night ? "#d9c383" : "#f5eee0");
  ctx.restore();
}

export function drawPixelBlocks(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame, 0.9);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawExtrusion(
    ctx,
    geometry,
    {
      roof: identityColor(frame, "roof", frame.night ? "#364b64" : "#7096a0"),
      wall: identityColor(frame, "wall", frame.night ? "#44536a" : "#efd6a8"),
      side: identityColor(frame, "side", frame.night ? "#303d54" : "#d29b78"),
      outline: "#283641",
    },
    2,
  );
  const area = bounds(geometry.facade);
  clipPolygon(ctx, geometry.facade, () => {
    const tile = Math.max(3, Math.min(7, Math.floor(area.width / 7)));
    for (let y = Math.ceil(area.y / tile) * tile; y < area.y + area.height; y += tile) {
      for (let x = Math.ceil(area.x / tile) * tile; x < area.x + area.width; x += tile) {
        const on = randomUnit(frame.seed, x * 3 + y) > 0.23;
        ctx.fillStyle = on
          ? identityColor(frame, "glass", frame.night ? "#ffd978" : "#315f68")
          : identityColor(frame, "base", "#9d735f");
        ctx.fillRect(x, y, tile - 1, Math.max(2, tile - 2));
      }
    }
  });
  balconyBands(ctx, geometry.facade, "#fff0c8", 3, 2);
  entrance(ctx, geometry.facade, "#263d43");
  roofBox(ctx, frame, "#354e58");
  ctx.restore();
}

export function drawPaperCut(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame, 0.82);
  ctx.save();
  for (let layer = 3; layer >= 1; layer -= 1) {
    ctx.save();
    ctx.translate(layer * 2.2, layer * 2.4);
    fillStroke(ctx, geometry.base, layer === 3 ? "#b9897c55" : "#6b776a32", "transparent", 0);
    ctx.restore();
  }
  drawExtrusion(
    ctx,
    geometry,
    {
      roof: identityColor(frame, "roof", "#e6aa91"),
      wall: identityColor(frame, "wall", frame.night ? "#5c695f" : "#f7e7c6"),
      side: identityColor(frame, "side", frame.night ? "#48564e" : "#d9c39f"),
      outline: "#fffaf0",
    },
    1.8,
  );
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#f5d582" : "#6f8d82"),
    frame.seed,
    "rect",
    frame.profile?.window,
  );
  balconyBands(ctx, geometry.facade, identityColor(frame, "accent", "#bd765f"), 3, 1);
  entrance(ctx, geometry.facade, "#725549");
  const roof = bounds(geometry.roof);
  ctx.fillStyle = "#fff4d7";
  ctx.beginPath();
  ctx.arc(
    roof.x + roof.width * 0.55,
    roof.y + roof.height * 0.5,
    Math.max(2, roof.width * 0.07),
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

export function drawClayToy(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame, 0.76);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "#513e322d";
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 5;
  drawExtrusion(
    ctx,
    geometry,
    {
      roof: identityColor(frame, "roof", "#ce826c"),
      wall: identityColor(frame, "wall", frame.night ? "#667469" : "#edcda5"),
      side: identityColor(frame, "side", frame.night ? "#4f5d55" : "#d9aa88"),
      outline: "#795f50",
    },
    2.5,
  );
  ctx.shadowColor = "transparent";
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#f6d477" : "#557b73"),
    frame.seed,
    "dot",
    frame.profile?.window,
  );
  balconyBands(ctx, geometry.facade, identityColor(frame, "accent", "#f1b39e"), 3, 3.2);
  entrance(ctx, geometry.facade, "#765449");
  const roof = bounds(geometry.roof);
  for (let blob = 0; blob < 3; blob += 1) {
    ctx.fillStyle = blob === 1 ? "#f1d2a8" : "#b85f55";
    ctx.beginPath();
    ctx.arc(
      roof.x + roof.width * (0.35 + blob * 0.15),
      roof.y + roof.height * 0.5,
      2.4 + blob * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

export function drawInkPlan(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame);
  ctx.save();
  drawExtrusion(
    ctx,
    geometry,
    {
      roof: identityColor(frame, "roof", frame.night ? "#43515a" : "#f7f1df"),
      wall: identityColor(frame, "wall", frame.night ? "#3b494d" : "#eee6d5"),
      side: identityColor(frame, "side", frame.night ? "#313d42" : "#ddd4c3"),
      outline: "#263f3b",
    },
    1.4,
  );
  const area = bounds(geometry.facade);
  clipPolygon(ctx, geometry.facade, () => {
    ctx.strokeStyle = frame.night ? "#9daaa0" : "#6d776d88";
    ctx.lineWidth = 0.7;
    for (let line = -area.height; line < area.width; line += 6) {
      ctx.beginPath();
      ctx.moveTo(area.x + line, area.y + area.height);
      ctx.lineTo(area.x + line + area.height, area.y);
      ctx.stroke();
    }
  });
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#f1cf73" : "#263f3b"),
    frame.seed,
    "line",
    frame.profile?.window,
  );
  for (let pass = 0; pass < 2; pass += 1) {
    ctx.save();
    ctx.translate(randomUnit(frame.seed, pass) - 0.5, randomUnit(frame.seed + 2, pass) - 0.5);
    pathPolygon(ctx, geometry.roof);
    ctx.strokeStyle = "#263f3b";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
  entrance(ctx, geometry.facade, "#263f3b");
  roofBox(ctx, frame, "#899186");
  ctx.restore();
}
