import { CHARACTER_STYLES } from "./character-catalog";
import { crewFace, crewScarf, crewSilhouette } from "./character-shapes";
import type { CharacterFrame } from "./types";

export { CHARACTER_STYLES } from "./character-catalog";

function voxelBody(ctx: CanvasRenderingContext2D, color: string): void {
  for (let y = -16; y < 14; y += 3) {
    for (let x = -13; x < 14; x += 3) {
      if (
        (y < -10 && Math.abs(x) > 10 + (y + 10) * 0.7) ||
        (y > 8 && Math.abs(x) > 3 && Math.abs(x) < 9)
      )
        continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 3, 3);
      ctx.fillStyle = "#ffffff50";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1.5, y - 1.5);
      ctx.lineTo(x + 4.5, y - 1.5);
      ctx.lineTo(x + 3, y);
      ctx.fill();
      ctx.fillStyle = "#326b7535";
      ctx.beginPath();
      ctx.moveTo(x + 3, y);
      ctx.lineTo(x + 4.5, y - 1.5);
      ctx.lineTo(x + 4.5, y + 1.5);
      ctx.lineTo(x + 3, y + 3);
      ctx.fill();
    }
  }
}

function beadBody(ctx: CanvasRenderingContext2D, color: string): void {
  for (let y = -16; y < 14; y += 3) {
    for (let x = -12; x < 14; x += 3) {
      if (
        (y < -10 && Math.abs(x) > 11 + (y + 10) * 0.6) ||
        (y > 8 && Math.abs(x) > 3 && Math.abs(x) < 9)
      )
        continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffffaa";
      ctx.beginPath();
      ctx.arc(x - 0.4, y - 0.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawCharacter(ctx: CanvasRenderingContext2D, frame: CharacterFrame): void {
  const id = frame.styleId;
  const color = frame.color ?? (id === "leaf-guide" ? "#9dd48d" : "#6ed8e8");
  const stride = Math.sin(frame.phase) * 1.6;
  const round = ["round-buddy", "plush-crew", "leaf-guide", "rubber-hose"].includes(id);
  ctx.save();
  ctx.translate(frame.x, frame.y);
  ctx.scale(frame.size / 40, frame.size / 40);
  if (frame.shadow !== false) {
    ctx.fillStyle = "#36574120";
    ctx.beginPath();
    ctx.ellipse(0, 18, 13, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(0, -Math.abs(stride));
  if (id === "paper-scout") {
    ctx.save();
    ctx.translate(3, 3);
    crewSilhouette(ctx, false);
    ctx.fillStyle = "#617c6935";
    ctx.fill();
    ctx.restore();
  }
  if (id === "rubber-hose") {
    ctx.strokeStyle = "#35574e";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 8, 9);
      ctx.quadraticCurveTo(side * (8 + stride), 20, side * 12 + stride * 2, 24);
      ctx.stroke();
      ctx.fillStyle = "#fff7dd";
      ctx.beginPath();
      ctx.ellipse(side * 12 + stride * 2, 24, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side * 12, -2);
      ctx.quadraticCurveTo(side * 20, 4 + stride, side * 22, -2 + stride * 2);
      ctx.stroke();
    }
    ctx.scale(0.85, 0.85);
  }
  if (id === "voxel-walker") voxelBody(ctx, color);
  else if (id === "bead-crew") beadBody(ctx, color);
  else {
    crewSilhouette(ctx, round);
    if (id === "round-buddy") {
      const gradient = ctx.createLinearGradient(-15, -15, 18, 12);
      gradient.addColorStop(0, "#9fe8ed");
      gradient.addColorStop(1, "#58becb");
      ctx.fillStyle = gradient;
    } else
      ctx.fillStyle = id === "ink-friend" ? "#fbfaf0" : id === "plush-crew" ? "#9bc8be" : color;
    ctx.fill();
    ctx.strokeStyle = id === "sticker-pop" ? "#fffaf0" : "#3c6658";
    ctx.lineWidth =
      id === "sticker-pop" ? 3 : id === "ink-friend" ? 0.75 : id === "paper-scout" ? 0.4 : 0;
    if (ctx.lineWidth > 0.3 && id !== "crew-pixel") ctx.stroke();
    if (id === "plush-crew") {
      ctx.save();
      ctx.scale(0.85, 0.85);
      crewSilhouette(ctx, true);
      ctx.strokeStyle = "#eff8dd";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([1.2, 1.2]);
      ctx.stroke();
      ctx.restore();
    }
    if (id === "paper-scout") {
      ctx.fillStyle = "#ffffff40";
      ctx.beginPath();
      ctx.moveTo(-7, -17);
      ctx.lineTo(-2, -17);
      ctx.lineTo(5, 4);
      ctx.lineTo(-8, 4);
      ctx.fill();
    }
    if (id === "round-buddy") {
      ctx.fillStyle = "#ffffff55";
      ctx.beginPath();
      ctx.ellipse(-7, -13, 3, 5, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  crewFace(ctx, id, frame.facing);
  crewScarf(ctx, id === "leaf-guide");
  if (id === "leaf-guide") {
    ctx.fillStyle = "#6e9954";
    ctx.beginPath();
    ctx.ellipse(-3, -22, 5, 2, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -24, 5, 2, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (id === "crew-pixel" || id === "sticker-pop") {
    ctx.save();
    ctx.translate(17, 3 + stride * 0.5);
    ctx.rotate(-0.5);
    ctx.fillStyle = "#a77749";
    ctx.fillRect(-1, -1, 3, 12);
    ctx.fillStyle = "#fff8dc";
    ctx.fillRect(-1, -3, 3, 3);
    ctx.restore();
  }
  ctx.restore();
}

export function drawCharacterPreview(canvas: HTMLCanvasElement, styleId: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new TypeError("Character preview unavailable");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f0f1e7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#dbe1d1";
  ctx.lineWidth = 1;
  for (let x = 20; x < width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, height - 28);
    ctx.lineTo(x, height - 24);
    ctx.stroke();
  }
  const index = CHARACTER_STYLES.findIndex((s) => s.id === styleId);
  drawCharacter(ctx, {
    styleId,
    x: width / 2,
    y: height * (styleId === "rubber-hose" ? 0.43 : 0.52),
    size: height * (styleId === "rubber-hose" || styleId === "leaf-guide" ? 0.72 : 0.8),
    phase: index % 2 ? 0.8 : 0,
    facing: 0.2,
  });
}
