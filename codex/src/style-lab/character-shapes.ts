export function crewSilhouette(ctx: CanvasRenderingContext2D, round: boolean): void {
  ctx.beginPath();
  if (round) {
    ctx.moveTo(-13, 10);
    ctx.bezierCurveTo(-19, -12, -9, -21, 0, -21);
    ctx.bezierCurveTo(11, -21, 17, -12, 15, 10);
    ctx.quadraticCurveTo(14, 18, 8, 14);
    ctx.lineTo(5, 11);
    ctx.quadraticCurveTo(0, 20, -5, 11);
    ctx.quadraticCurveTo(-10, 18, -13, 10);
  } else {
    const points = [
      [-14, 13],
      [-14, -11],
      [-11, -11],
      [-11, -15],
      [-7, -15],
      [-7, -18],
      [6, -18],
      [6, -15],
      [10, -15],
      [10, -11],
      [14, -11],
      [14, 13],
      [9, 13],
      [9, 8],
      [4, 8],
      [4, 14],
      [-4, 14],
      [-4, 8],
      [-9, 8],
      [-9, 13],
    ];
    points.forEach(([x, y], i) => {
      if (x === undefined || y === undefined) return;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  }
  ctx.closePath();
}

export function crewFace(ctx: CanvasRenderingContext2D, style: string, facing: number): void {
  const shift = Math.sin(facing) * 2;
  const outline = style === "ink-friend";
  const round = ["round-buddy", "plush-crew", "leaf-guide", "rubber-hose"].includes(style);
  if (Math.cos(facing) < -0.75) return;
  for (const x of [-6 + shift, 6 + shift]) {
    ctx.fillStyle = "#fffef4";
    ctx.beginPath();
    if (round) ctx.ellipse(x, -6, 3, 4.2, 0, 0, Math.PI * 2);
    else ctx.rect(x - 2.5, -9, 5, 6);
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = "#36554b";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.fillStyle = "#2d4843";
    if (round) {
      ctx.beginPath();
      ctx.ellipse(x + shift * 0.35, -5, 1.2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(x + shift * 0.3, -6, 1.8, 2.5);
  }
  ctx.fillStyle = "#f49bb1";
  for (const x of [-9 + shift, 9 + shift]) {
    if (round) {
      ctx.beginPath();
      ctx.ellipse(x, -0.5, 2.7, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(x - 3, -1, 6, 2);
  }
  ctx.beginPath();
  ctx.moveTo(-1 + shift, 0);
  ctx.quadraticCurveTo(shift, 2, 2 + shift, 0);
  ctx.strokeStyle = "#4d7161";
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

export function crewScarf(ctx: CanvasRenderingContext2D, leaf: boolean): void {
  ctx.fillStyle = leaf ? "#638d52" : "#f5ce68";
  ctx.beginPath();
  ctx.moveTo(-14, 4);
  ctx.lineTo(14, 4);
  ctx.lineTo(14, 7);
  ctx.lineTo(11, 7);
  ctx.lineTo(14, 13);
  ctx.lineTo(9, 13);
  ctx.lineTo(7, 7);
  ctx.lineTo(-14, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = leaf ? "#91b36c" : "#ffe8a0";
  ctx.fillRect(-12, 4, 21, 1);
}
