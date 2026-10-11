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
import type { BuildingFrame, ScreenPoint } from "./types";

function inset(points: readonly ScreenPoint[], amount: number): readonly ScreenPoint[] {
  const area = bounds(points);
  const center = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  return points.map((point) => ({
    x: point.x + (center.x - point.x) * amount,
    y: point.y + (center.y - point.y) * amount,
  }));
}

export function drawWoodblock(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame, 0.9);
  ctx.save();
  drawExtrusion(
    ctx,
    geometry,
    {
      roof: identityColor(frame, "roof", "#b96548"),
      wall: identityColor(frame, "wall", frame.night ? "#4b4d45" : "#d9a76f"),
      side: identityColor(frame, "side", frame.night ? "#383c38" : "#b97a55"),
      outline: "#362f2a",
    },
    2.2,
  );
  const area = bounds(geometry.facade);
  clipPolygon(ctx, geometry.facade, () => {
    ctx.strokeStyle = frame.night ? "#8a846f" : "#724a3577";
    ctx.lineWidth = 1;
    for (let grain = 0; grain < 14; grain += 1) {
      const y = area.y + randomUnit(frame.seed, grain) * area.height;
      ctx.beginPath();
      ctx.moveTo(area.x - 3, y);
      ctx.bezierCurveTo(
        area.x + area.width * 0.3,
        y + 2,
        area.x + area.width * 0.7,
        y - 2,
        area.x + area.width + 3,
        y + 1,
      );
      ctx.stroke();
    }
  });
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#efc96e" : "#343735"),
    frame.seed,
    "line",
    frame.profile?.window,
  );
  balconyBands(ctx, geometry.facade, identityColor(frame, "accent", "#3d332e"), 3, 2.4);
  entrance(ctx, geometry.facade, "#302c29");
  ctx.restore();
}

export function drawFlatRoof(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  ctx.save();
  ctx.shadowColor = "#2e463322";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  fillStroke(
    ctx,
    frame.footprint,
    identityColor(frame, "roof", frame.night ? "#465854" : "#d9c79f"),
    "#405d53",
    1.6,
  );
  ctx.shadowColor = "transparent";
  const inner = inset(frame.footprint, 0.18);
  fillStroke(ctx, inner, frame.night ? "#60726a" : "#f5e8ca", "#a7725e", 1.2);
  const core = inset(frame.footprint, 0.45);
  fillStroke(ctx, core, frame.night ? "#f1cf76" : "#8fa9a0", "#405d53", 1);
  const area = bounds(frame.footprint);
  const centerX = area.x + area.width / 2;
  ctx.strokeStyle = "#d87857";
  ctx.lineWidth = 2.2;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(centerX, area.y + area.height * 0.72);
  ctx.lineTo(centerX, area.y + area.height + 9);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#355b49";
  ctx.fillRect(centerX - 2.5, area.y + area.height - 3, 5, 5);
  ctx.restore();
}

export function drawWatercolor(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame, 0.86);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (let wash = 0; wash < 3; wash += 1) {
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.translate(
      (randomUnit(frame.seed, wash) - 0.5) * 3,
      (randomUnit(frame.seed + 4, wash) - 0.5) * 3,
    );
    drawExtrusion(
      ctx,
      geometry,
      {
        roof: identityColor(frame, "roof", wash === 1 ? "#e59c91" : "#efb579"),
        wall: identityColor(frame, "wall", frame.night ? "#60736e" : "#f2d7b0"),
        side: identityColor(frame, "side", frame.night ? "#4d6260" : "#b9c4a0"),
        outline: "transparent",
      },
      0,
    );
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  pathPolygon(ctx, geometry.roof);
  ctx.strokeStyle = frame.night ? "#b7c4b4" : "#6c756b88";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#ffd97f" : "#6b9a9a99"),
    frame.seed,
    "dot",
    frame.profile?.window,
  );
  balconyBands(ctx, geometry.facade, identityColor(frame, "accent", "#ce827499"), 3, 1.4);
  entrance(ctx, geometry.facade, "#556c61aa");
  ctx.restore();
}

export function drawMangaCel(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame, 1.05);
  ctx.save();
  ctx.translate(4, 5);
  fillStroke(ctx, geometry.base, "#243c3d55", "transparent", 0);
  ctx.translate(-4, -5);
  drawExtrusion(
    ctx,
    geometry,
    {
      roof: identityColor(frame, "roof", frame.night ? "#445775" : "#78a7b0"),
      wall: identityColor(frame, "wall", frame.night ? "#56626f" : "#fff0cf"),
      side: identityColor(frame, "side", frame.night ? "#323f50" : "#d8aa82"),
      outline: "#1c2d31",
    },
    3,
  );
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#ffd45f" : "#253d44"),
    frame.seed,
    "rect",
    frame.profile?.window,
  );
  balconyBands(ctx, geometry.facade, identityColor(frame, "accent", "#d65e50"), 4, 3.2);
  entrance(ctx, geometry.facade, "#192d31");
  const roof = bounds(geometry.roof);
  ctx.strokeStyle = "#1c2d31";
  ctx.lineWidth = 2;
  for (let ray = 0; ray < 4; ray += 1) {
    ctx.beginPath();
    ctx.moveTo(roof.x + roof.width * (0.2 + ray * 0.18), roof.y - 2);
    ctx.lineTo(roof.x + roof.width * (0.25 + ray * 0.18), roof.y + roof.height * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawWhiteModel(ctx: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const geometry = buildingGeometry(frame, 0.95);
  ctx.save();
  ctx.shadowColor = "#263b3433";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;
  drawExtrusion(ctx, geometry, {
    roof: identityColor(frame, "roof", "#d8ded8"),
    wall: identityColor(frame, "wall", frame.night ? "#677570" : "#fffdf4"),
    side: identityColor(frame, "side", frame.night ? "#52615d" : "#e2e4da"),
    outline: "#9aa59e",
  });
  ctx.shadowColor = "transparent";
  facadeGrid(
    ctx,
    geometry.facade,
    identityColor(frame, "glass", frame.night ? "#f3d377" : "#78999a"),
    frame.seed,
    "rect",
    frame.profile?.window,
  );
  balconyBands(ctx, geometry.facade, identityColor(frame, "accent", "#d87857"), 4, 1.6);
  const facade = bounds(geometry.facade);
  ctx.fillStyle = identityColor(frame, "accent", "#d87857");
  ctx.fillRect(
    facade.x + facade.width * 0.18,
    facade.y,
    Math.max(2, facade.width * 0.045),
    facade.height,
  );
  entrance(ctx, geometry.facade, "#36594f");
  const roof = bounds(geometry.roof);
  ctx.fillStyle = "#f6f3e8";
  ctx.strokeStyle = "#a4ada5";
  ctx.lineWidth = 1;
  ctx.fillRect(
    roof.x + roof.width * 0.42,
    roof.y + roof.height * 0.38,
    Math.max(4, roof.width * 0.18),
    Math.max(3, roof.height * 0.18),
  );
  ctx.strokeRect(
    roof.x + roof.width * 0.42,
    roof.y + roof.height * 0.38,
    Math.max(4, roof.width * 0.18),
    Math.max(3, roof.height * 0.18),
  );
  ctx.restore();
}
