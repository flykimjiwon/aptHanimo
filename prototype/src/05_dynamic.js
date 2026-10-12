// ---------- 캔버스·카메라 ----------
const cv = document.getElementById('world'), ctx = cv.getContext('2d');
const mm = document.getElementById('minimap'), mctx = mm.getContext('2d');
let VW = 0, VH = 0;
function resize() { VW = window.innerWidth; VH = window.innerHeight; cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; const r = mm.getBoundingClientRect(); mm.width = Math.max(1, r.width * DPR); mm.height = Math.max(1, r.height * DPR); drawMinimapStatic(); }
window.addEventListener('resize', resize);
function worldToScreen(wx, wy) { return [ (wx - S.camX) * S.zoom + VW / 2, (wy - S.camY) * S.zoom + VH / 2 ]; }
function screenToWorld(sx, sy) { return [ (sx - VW / 2) / S.zoom + S.camX, (sy - VH / 2) / S.zoom + S.camY ]; }
function pickTile(sx, sy) {
  const [wx, wy] = screenToWorld(sx, sy);
  if (TOP) { const x = Math.floor(wx / TT), y = Math.floor(wy / TT); return inb(x, y) ? [x, y] : null; }
  const ax = (wx / (TW / 2) + wy / (TH / 2)) / 2, ay = (wy / (TH / 2) - wx / (TW / 2)) / 2;
  let best = null, bd = 1e9;
  for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) {
    const x = Math.floor(ax) + dx, y = Math.floor(ay) + dy; if (!inb(x, y)) continue;
    const p = proj(x + 0.5, y + 0.5, zCenter(idx(x, y))); const d = Math.hypot((p[0] - wx) / (TW / 2), (p[1] - wy) / (TH / 2)); if (d < bd) { bd = d; best = [x, y]; }
  }
  return bd < 1.2 ? best : null;
}
// ---------- 미니맵 ----------
let mmStatic = null;
function drawMinimapStatic() {
  const w = mm.width, h = mm.height; mmStatic = document.createElement('canvas'); mmStatic.width = w; mmStatic.height = h; const g = mmStatic.getContext('2d');
  const sx = w / W, sy = h / H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); const k = K[i]; const t = 0.9 + ((TIERZ[i] - 16) / 100) * 0.35; g.fillStyle = k === 1 ? (R[i] >= 7 ? '#b4b9c3' : '#d9d4c6') : k === 2 ? '#e6dcbf' : k === 4 ? '#cdbfa8' : k === 5 ? shade('#8bc262', t) : k === 6 ? '#ebd9a3' : k === 7 ? '#d6cba9' : shade('#a3cf74', t); g.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy)); }
  for (const c of DATA.complexes) { g.fillStyle = c.color; for (const b of BLDS) if (b.complex === c.id) g.fillRect(b.cx * sx - 1.5, b.cy * sy - 1.5, 3.5, 3.5); }
  for (const st of DATA.stations) { g.fillStyle = '#2f6fcf'; g.beginPath(); g.arc(st.x * sx, st.y * sy, 2.5 * DPR, 0, 7); g.fill(); }
}
function drawMinimap() { if (!mmStatic) return; mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.drawImage(mmStatic, 0, 0); const sx = mm.width / W, sy = mm.height / H;
  // 뷰포트 테두리(타일 좌표 근사)
  const [wx0, wy0] = screenToWorld(0, 0), [wx1, wy1] = screenToWorld(VW, VH); const tx = TOP ? (wx, wy) => [wx / TT, wy / TT] : (wx, wy) => [(wx / (TW / 2) + wy / (TH / 2)) / 2, (wy / (TH / 2) - wx / (TW / 2)) / 2];
  const c0 = tx(wx0, wy0), c1 = tx(wx1, wy0), c2 = tx(wx1, wy1), c3 = tx(wx0, wy1); mctx.strokeStyle = 'rgba(74,59,47,.6)'; mctx.lineWidth = 1 * DPR; mctx.beginPath(); mctx.moveTo(c0[0] * sx, c0[1] * sy); mctx.lineTo(c1[0] * sx, c1[1] * sy); mctx.lineTo(c2[0] * sx, c2[1] * sy); mctx.lineTo(c3[0] * sx, c3[1] * sy); mctx.closePath(); mctx.stroke();
  if (S.traveling) { const gi = S.traveling.path[S.traveling.path.length - 1]; mctx.fillStyle = '#d95f4b'; mctx.beginPath(); mctx.arc((gi % W) * sx + sx / 2, ((gi / W) | 0) * sy + sy / 2, 2.2 * DPR, 0, 7); mctx.fill(); }
  mctx.fillStyle = '#fffdf6'; mctx.beginPath(); mctx.arc(S.px * sx + sx / 2, S.py * sy + sy / 2, 3.4 * DPR, 0, 7); mctx.fill(); mctx.fillStyle = '#f08a66'; mctx.beginPath(); mctx.arc(S.px * sx + sx / 2, S.py * sy + sy / 2, 2.4 * DPR, 0, 7); mctx.fill(); }

// ---------- 캐릭터: STYLE.char 로 선택. (1) 'pixelcrew' = PixelCrew 도트 유령(정본 sprites.js 그대로 — src/vendor/NOTICE.md, 조명·배치만 여기서) (2) 'villager' = 동숲풍 주민(스타일 랩 villager 이식). 둘 다 (x,y)=발 중심(월드 px), 전부 연출용 ----------
// (1) 픽셀크루
const PX = self.PixelSprites, CREW = self.PixelCrewRoster.CREW;
const SPR = new Map(); // (crew|state|frame|flip) → 24×22 캔버스(픽셀 1=1px). 그릴 때 nearest-neighbor 확대
function ghostCanvas(crew, state, frame, flip) {
  const key = crew + '|' + state + '|' + frame + '|' + (flip ? 1 : 0); let c = SPR.get(key); if (c) return c;
  const fr = PX.renderFrame({crew, state, frame, flip}); c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h; const g = c.getContext('2d');
  // fx.js 'shaded' 요지: 오른쪽·아래 가장자리 어둡게(0.78), 왼쪽·위 밝게(1.18), 행당 감쇠, 윗가장자리 하이라이트 — 픽셀맵 자체는 수정하지 않음
  const has = new Set(fr.pixels.map(q => q.x + ',' + q.y)); const edge = (q, dx, dy) => !has.has((q.x + dx) + ',' + (q.y + dy));
  for (const q of fr.pixels) { let f = 1 - q.y * 0.012; if (edge(q, 1, 0) || edge(q, 0, 1)) f *= 0.78; if (edge(q, -1, 0) || edge(q, 0, -1)) f *= 1.18; g.fillStyle = shade(q.c, f); g.fillRect(q.x, q.y, 1, 1); if (edge(q, 0, -1)) { g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(q.x, q.y, 1, 1); } }
  SPR.set(key, c); return c;
}
const frameOf = (state, ts) => Math.floor(ts / PX.frameMs(state)) % PX.frameCount(state);
function drawGhost(g, x, y, o) { // (x,y)=발바닥 중심(월드 px). 몸체는 그리드 x 1~16(기본) / 7~22(반전)
  const sc = o.scale || 1.15; const flip = !!o.flip; const c = ghostCanvas(o.crew, o.state || 'idle', o.frame || 0, flip);
  if (!o.noShadow) { g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y + 0.6, 8.2 * sc, 2.8 * sc, 0, 0, 7); g.fill(); }
  g.imageSmoothingEnabled = false; g.drawImage(c, x - (flip ? 15.5 : 8.5) * sc, y - 22 * sc + 1, 24 * sc, 22 * sc); g.imageSmoothingEnabled = true;
}
// (2) 동숲풍 주민
const INK = '#4a3b2f', EAR_IN = '#f7b1a0';
// 종족 = 귀 모양·털색·무늬(귀·무늬로 변주). 이름은 배역(CAST·NPC_CAST)에서
const SPECIES = {
  cat:{ears:'cat', fur:'#f6d9b0'}, dog:{ears:'floppy', fur:'#e8c79a'}, bear:{ears:'round', fur:'#c99a6b'}, bunny:{ears:'bunny', fur:'#f7ece4'},
  fox:{ears:'cat', fur:'#f0a35e', mark:'muzzle'}, frog:{ears:'none', fur:'#9ad17a'}, mouse:{ears:'round', fur:'#d9d2c9', earBig:true},
  panda:{ears:'round', fur:'#f5f1ea', mark:'patch'}, deer:{ears:'side', fur:'#d9b48a', mark:'spots'}, koala:{ears:'round', fur:'#b9b4ad', earBig:true},
};
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
function drawEars(g, sp, s, hy, fur) { // 머리 뒤에 먼저 그린다
  if (sp.ears === 'none') { for (const ex of [-6, 6]) { g.fillStyle = fur; g.beginPath(); g.arc(ex * s, hy - 11 * s, 4 * s, 0, 7); g.fill(); g.stroke(); } return; }
  if (sp.ears === 'cat') { for (const d of [-1, 1]) { g.fillStyle = fur; g.beginPath(); g.moveTo(d * 4 * s, hy - 10.5 * s); g.lineTo(d * 11.5 * s, hy - 20 * s); g.lineTo(d * 12.5 * s, hy - 7 * s); g.closePath(); g.fill(); g.stroke(); g.fillStyle = EAR_IN; g.beginPath(); g.moveTo(d * 6.8 * s, hy - 11 * s); g.lineTo(d * 10.9 * s, hy - 17 * s); g.lineTo(d * 11.5 * s, hy - 9.5 * s); g.closePath(); g.fill(); } return; }
  if (sp.ears === 'bunny') { for (const d of [-1, 1]) { g.fillStyle = fur; g.beginPath(); g.ellipse(d * 5.5 * s, hy - 19 * s, 3.2 * s, 9 * s, d * 0.12, 0, 7); g.fill(); g.stroke(); g.fillStyle = EAR_IN; g.beginPath(); g.ellipse(d * 5.5 * s, hy - 19 * s, 1.6 * s, 6.5 * s, d * 0.12, 0, 7); g.fill(); } return; }
  if (sp.ears === 'floppy') { for (const d of [-1, 1]) { g.fillStyle = shade(fur, 0.84); g.beginPath(); g.ellipse(d * 12.5 * s, hy - 1 * s, 3.4 * s, 7.5 * s, d * 0.18, 0, 7); g.fill(); g.stroke(); } return; }
  if (sp.ears === 'side') { for (const d of [-1, 1]) { g.fillStyle = fur; g.beginPath(); g.ellipse(d * 14 * s, hy - 7 * s, 5 * s, 2.6 * s, d * -0.5, 0, 7); g.fill(); g.stroke(); g.fillStyle = EAR_IN; g.beginPath(); g.ellipse(d * 14 * s, hy - 7 * s, 3 * s, 1.3 * s, d * -0.5, 0, 7); g.fill(); } return; }
  const r = sp.earBig ? 6 : 4.6; for (const ex of [-9, 9]) { g.fillStyle = fur; g.beginPath(); g.arc(ex * s, hy - 10 * s, r * s, 0, 7); g.fill(); g.stroke(); g.fillStyle = EAR_IN; g.beginPath(); g.arc(ex * s, hy - 10 * s, r * 0.5 * s, 0, 7); g.fill(); }
}
function drawVillager(g, x, y, o) { // o={sp, col(옷), face(±1), state(idle|walk|talk|happy|think), t(초), scale, seed, hat(sprout|ribbon|cap), bust(머리만), noShadow}
  const sp = SPECIES[o.sp] || SPECIES.cat; const s = 0.68 * (o.scale || 1); const f = o.face < 0 ? -1 : 1; const t = (o.t || 0) + (o.seed || 0); const st = o.state || 'idle';
  const walking = st === 'walk', happy = st === 'happy'; const fur = sp.fur, col = o.col || '#8fc4b8';
  const bob = walking ? Math.abs(Math.sin(t * 12)) * 1.6 * s : happy ? Math.abs(Math.sin(t * 9)) * 2.2 * s : Math.sin(t * 2.5) * 0.35 * s; const leg = walking ? Math.sin(t * 12) * 2.6 * s : 0;
  const lw = Math.max(0.9, 1.6 * s); const hy = -30 * s;
  g.save(); g.translate(x, y);
  if (!o.noShadow) { g.fillStyle = C.shadow; g.beginPath(); g.ellipse(0, 1, 8 * s, 3 * s, 0, 0, 7); g.fill(); }
  g.translate(0, -bob); g.scale(f, 1); g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = INK;
  if (!o.bust) {
    g.fillStyle = fur; rr(g, -5 * s, -6 * s + Math.max(0, leg), 4 * s, 6 * s, 1.6 * s); g.fill(); g.stroke(); rr(g, 1 * s, -6 * s + Math.max(0, -leg), 4 * s, 6 * s, 1.6 * s); g.fill(); g.stroke();
    g.fillStyle = col; rr(g, -7 * s, -17 * s, 14 * s, 12 * s, 4 * s); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(0, -13.5 * s, 1 * s, 0, 7); g.fill(); g.beginPath(); g.arc(0, -10 * s, 1 * s, 0, 7); g.fill();
    g.fillStyle = fur; for (const ex of [-8.5, 8.5]) { g.beginPath(); g.arc(ex * s, -12 * s, 2.4 * s, 0, 7); g.fill(); g.stroke(); }
  }
  drawEars(g, sp, s, hy, fur);
  g.fillStyle = fur; g.beginPath(); g.arc(0, hy, 13 * s, 0, 7); g.fill(); g.stroke();
  if (sp.mark === 'muzzle') { g.fillStyle = '#fff5e8'; g.beginPath(); g.ellipse(0, hy + 5 * s, 6.5 * s, 4.5 * s, 0, 0, 7); g.fill(); }
  else if (sp.mark === 'patch') { g.fillStyle = '#3b2c22'; for (const ex of [-4.8, 4.8]) { g.beginPath(); g.ellipse(ex * s, hy - 1 * s, 4.8 * s, 5.8 * s, ex < 0 ? 0.3 : -0.3, 0, 7); g.fill(); } }
  else if (sp.mark === 'spots') { g.fillStyle = 'rgba(255,255,255,.8)'; for (const [dx, dy] of [[-6, -8], [6, -8], [0, -11], [-9.5, -2], [9.5, -2]]) { g.beginPath(); g.arc(dx * s, hy + dy * s, 1.3 * s, 0, 7); g.fill(); } }
  const blink = !happy && (t % 3.7) < 0.12; const look = st === 'think' ? [0.8, -1.2] : [0, 0];
  for (const ex of [-4.8, 4.8]) {
    if (happy || blink) { g.strokeStyle = '#2b1f17'; g.lineWidth = Math.max(0.9, 1.4 * s); g.beginPath(); if (happy) g.arc(ex * s, hy - 0.2 * s, 2.8 * s, Math.PI * 1.15, Math.PI * 1.85); else { g.moveTo((ex - 2.4) * s, hy - 1 * s); g.lineTo((ex + 2.4) * s, hy - 1 * s); } g.stroke(); g.strokeStyle = INK; g.lineWidth = lw; }
    else { const ox = (ex + look[0]) * s, oy = hy + (-1 + look[1]) * s; g.fillStyle = sp.mark === 'patch' ? '#fff' : '#2b1f17'; g.beginPath(); g.ellipse(ox, oy, 3.1 * s, 4.4 * s, 0, 0, 7); g.fill(); if (sp.mark === 'patch') { g.fillStyle = '#2b1f17'; g.beginPath(); g.ellipse(ox, oy, 2 * s, 3 * s, 0, 0, 7); g.fill(); } g.fillStyle = '#fff'; g.beginPath(); g.arc(ox + 1.1 * s, oy - 1.6 * s, 1.2 * s, 0, 7); g.fill(); }
  }
  g.fillStyle = '#3b2c22'; g.beginPath(); g.ellipse(0, hy + 3.5 * s, 1.4 * s, 1 * s, 0, 0, 7); g.fill();
  g.strokeStyle = '#3b2c22'; g.lineWidth = Math.max(0.8, 1.1 * s);
  if (st === 'talk') { g.fillStyle = '#c0504a'; g.beginPath(); g.ellipse(0, hy + 6 * s, 1.9 * s, ((Math.floor(t * 8) % 2) ? 1.7 : 0.7) * s, 0, 0, 7); g.fill(); }
  else if (happy) { g.beginPath(); g.arc(0, hy + 4.2 * s, 3 * s, 0.15, Math.PI - 0.15); g.stroke(); }
  else if (st === 'think') { g.beginPath(); g.moveTo(-1.6 * s, hy + 5.6 * s); g.lineTo(1.6 * s, hy + 5.2 * s); g.stroke(); }
  else { g.beginPath(); g.arc(0, hy + 4.5 * s, 2.4 * s, 0.2, Math.PI - 0.2); g.stroke(); }
  g.fillStyle = 'rgba(247,160,140,.75)'; g.beginPath(); g.ellipse(-8 * s, hy + 4 * s, 2.4 * s, 1.4 * s, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(8 * s, hy + 4 * s, 2.4 * s, 1.4 * s, 0, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = Math.max(0.9, 1.3 * s);
  if (o.hat === 'sprout') { g.strokeStyle = '#4f9a46'; g.beginPath(); g.moveTo(0, hy - 13 * s); g.lineTo(0, hy - 17 * s); g.stroke(); g.strokeStyle = INK; g.fillStyle = '#7cc06a'; g.beginPath(); g.ellipse(-2.8 * s, hy - 17.6 * s, 3 * s, 1.7 * s, -0.5, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(2.8 * s, hy - 17.6 * s, 3 * s, 1.7 * s, 0.5, 0, 7); g.fill(); g.stroke(); }
  else if (o.hat === 'ribbon') { g.fillStyle = '#f08a66'; g.beginPath(); g.ellipse(3.6 * s, hy - 13.5 * s, 3.4 * s, 2.1 * s, -0.55, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(9.4 * s, hy - 14.6 * s, 3.4 * s, 2.1 * s, 0.85, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(6.5 * s, hy - 12.2 * s, 1.5 * s, 0, 7); g.fill(); g.stroke(); }
  else if (o.hat === 'cap') { g.fillStyle = o.hatCol || '#e76f51'; g.beginPath(); g.arc(0, hy - 5 * s, 11.5 * s, Math.PI * 1.04, Math.PI * 1.96); g.closePath(); g.fill(); g.stroke(); g.fillStyle = shade(o.hatCol || '#e76f51', 0.85); rr(g, -12 * s, hy - 10 * s, 24 * s, 3.4 * s, 1.5 * s); g.fill(); g.stroke(); g.fillStyle = '#fff4e6'; g.beginPath(); g.arc(0, hy - 16.5 * s, 2.4 * s, 0, 7); g.fill(); g.stroke(); }
  if (st === 'think') { g.fillStyle = 'rgba(255,253,246,.95)'; g.strokeStyle = INK; g.lineWidth = Math.max(0.7, 0.9 * s); for (const [dx, dy, r] of [[11, -9, 1.2], [14, -13, 1.8], [19.5, -19, 4.2]]) { g.beginPath(); g.arc(dx * s, hy + dy * s, r * s, 0, 7); g.fill(); g.stroke(); } g.fillStyle = INK; for (const dx of [-1.7, 0, 1.7]) { g.beginPath(); g.arc((19.5 + dx) * s, hy - 19 * s, 0.6 * s, 0, 7); g.fill(); } }
  g.restore();
}
function drawStroller(g, x, y, f, s = 1, baby) { g.save(); g.translate(x, y); g.scale(f, 1); g.fillStyle = C.shadow; g.beginPath(); g.ellipse(9 * s, 1, 7 * s, 2.6 * s, 0, 0, 7); g.fill(); g.strokeStyle = '#5a4634'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(1 * s, -9 * s); g.lineTo(6 * s, -5 * s); g.stroke(); g.fillStyle = '#8fb8e6'; g.beginPath(); g.roundRect(5 * s, -9 * s, 10 * s, 6.5 * s, 2.5 * s); g.fill(); g.strokeStyle = C.outline; g.lineWidth = 1; g.stroke(); g.fillStyle = '#3b2c22'; g.beginPath(); g.arc(7 * s, -1.5 * s, 1.9 * s, 0, 7); g.arc(13.5 * s, -1.5 * s, 1.9 * s, 0, 7); g.fill(); g.restore();
  if (baby) { if (STYLE.char === 'pixelcrew') drawGhost(g, x + 10 * f * s, y - 7 * s, {crew:baby.crew, state:'idle', frame:0, flip:f < 0, scale:0.42 * s, noShadow:true}); else drawVillager(g, x + 10 * f * s, y - 3 * s, Object.assign({}, baby, {face:f, state:'idle', scale:0.4 * s, noShadow:true, bust:true})); } // 아기: 유령은 통째로, 주민은 머리만
  g.save(); g.translate(x, y); g.scale(f, 1); g.fillStyle = '#6a9ad0'; g.beginPath(); g.arc(13 * s, -9 * s, 4.8 * s, Math.PI, Math.PI * 1.9); g.lineTo(13 * s, -9 * s); g.closePath(); g.fill(); g.restore(); }
function drawBike(g, x, y, f, s = 1) { g.save(); g.translate(x, y); g.scale(f, 1); g.strokeStyle = '#4a3b2f'; g.lineWidth = 1.4; g.beginPath(); g.arc(-6 * s, -2 * s, 3.6 * s, 0, 7); g.moveTo(9.6 * s, -2 * s); g.arc(6 * s, -2 * s, 3.6 * s, 0, 7); g.stroke(); g.strokeStyle = '#d95f4b'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6 * s, -2 * s); g.lineTo(-1 * s, -8 * s); g.lineTo(5 * s, -8 * s); g.lineTo(6 * s, -2 * s); g.moveTo(-1 * s, -8 * s); g.lineTo(1 * s, -3 * s); g.lineTo(6 * s, -2 * s); g.stroke(); g.restore(); }
function drawCar(g, x, y, f, col, s = 1) { g.save(); g.translate(x, y); g.scale(f, 1); g.fillStyle = C.shadow; g.beginPath(); g.ellipse(0, 1, 13 * s, 4 * s, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(-12 * s, -9 * s, 24 * s, 8 * s, 3 * s); g.fill(); g.strokeStyle = C.outline; g.lineWidth = 1; g.stroke(); g.fillStyle = shade(col, 1.1); g.beginPath(); g.roundRect(-7 * s, -15 * s, 13 * s, 7 * s, 3 * s); g.fill(); g.stroke(); g.fillStyle = '#bfe0f2'; g.beginPath(); g.roundRect(-5 * s, -14 * s, 4.5 * s, 4.5 * s, 1.5 * s); g.roundRect(0.5 * s, -14 * s, 4.5 * s, 4.5 * s, 1.5 * s); g.fill(); g.fillStyle = '#ffe9a8'; g.fillRect(10 * s, -7 * s, 2 * s, 2 * s); g.fillStyle = '#3b2c22'; g.beginPath(); g.arc(-7 * s, -1 * s, 2.6 * s, 0, 7); g.arc(7 * s, -1 * s, 2.6 * s, 0, 7); g.fill(); g.fillStyle = '#9a9a9a'; g.beginPath(); g.arc(-7 * s, -1 * s, 1 * s, 0, 7); g.arc(7 * s, -1 * s, 1 * s, 0, 7); g.fill(); g.restore(); }
// 컨셉별 배역(가상). 한 배역이 두 스타일 값을 가진다 — 주민: sp·col·hat·name / 픽셀크루: crew·pname
// 1인 나비(고양이)=픽셀(cyan) · 커플 +토토(토끼)=+루마(pink) · 가족 곰돌(곰)=비트(orange)+콩알(아기 곰)=닷(blue, 유모차 탑승/동행) · 길잡이 보리(강아지)=픽셀
const CAST = {
  solo:[{sp:'cat', col:'#8fc4b8', crew:'cyan', name:'나비', pname:'픽셀'}],
  couple:[{sp:'cat', col:'#8fc4b8', crew:'cyan', name:'나비', pname:'픽셀'}, {sp:'bunny', col:'#f4a6a6', hat:'ribbon', crew:'pink', name:'토토', pname:'루마'}],
  family:[{sp:'bear', col:'#e9b96e', hat:'cap', crew:'orange', name:'곰돌', pname:'비트'}, {sp:'bear', col:'#a8d8ea', crew:'blue', name:'콩알', pname:'닷'}],
};
const BABY = {sp:'cat', col:'#ffe08a', crew:'blue'}; // 가족이 아닌데 유모차를 고르면
const GUIDE = {sp:'dog', col:'#f6d36b', hat:'sprout', crew:'cyan', name:STYLE.char === 'pixelcrew' ? '길잡이 픽셀' : '길잡이 보리'};
const castName = (w) => STYLE.char === 'pixelcrew' ? w.pname : w.name;
const CONCEPT_CAR = STYLE.char === 'pixelcrew' ? {solo:'#6ee7ff', couple:'#f472b6', family:'#ffa94d'} : {solo:'#8fc4b8', couple:'#f4a6a6', family:'#e9b96e'};
function drawActor(g, x, y, o) { // NPC·라인업 공통: o={who, face, state, t, seed, scale}
  const st = o.state || 'idle';
  if (STYLE.char === 'pixelcrew') drawGhost(g, x, y, {crew:o.who.crew, state:st, frame:frameOf(st, ((o.t || 0) + (o.seed || 0)) * 1000), flip:o.face < 0, scale:(o.scale || 1) * 1.05});
  else drawVillager(g, x, y, Object.assign({}, o.who, {face:o.face, state:st, t:o.t, seed:o.seed, scale:(o.scale || 1) * 0.95}));
}
function drawParty(g, wx, wy, ts, walking, face, mode, concept) {
  const cast = CAST[concept] || CAST.solo; const t = ts / 1000; const st = walking ? 'walk' : 'idle'; const baby = concept === 'family' ? cast[1] : BABY;
  if (STYLE.char === 'pixelcrew') { // v3 배치: 유령 1.15배, 동행 뒤쪽, 차는 머리 0.5배
    const flip = face < 0; const fr = frameOf(st, ts); const c0 = cast[0].crew, c1 = (cast[1] || cast[0]).crew;
    if (mode === 'car') { drawCar(g, wx, wy, face, CONCEPT_CAR[concept] || CONCEPT_CAR.solo); drawGhost(g, wx - 2 * face, wy - 9, {crew:c0, state:'idle', frame:0, flip, scale:0.5, noShadow:true}); return; }
    if (concept === 'couple') drawGhost(g, wx - 10 * face, wy + 3, {crew:c1, state:st, frame:(fr + 1) % 2, flip});
    if (concept === 'family' && mode !== 'stroller') drawGhost(g, wx - 11 * face, wy + 2.5, {crew:c1, state:st, frame:(fr + 1) % 2, flip, scale:0.78});
    if (mode === 'bike') drawBike(g, wx, wy, face);
    drawGhost(g, wx, wy - (mode === 'bike' ? 4 : 0), {crew:c0, state:st, frame:fr, flip});
    if (mode === 'stroller') drawStroller(g, wx + 3 * face, wy, face, 1, baby);
    return;
  }
  // v4 배치: 주민, 차는 머리만 0.6배, 아이 0.72배
  if (mode === 'car') { drawCar(g, wx, wy, face, CONCEPT_CAR[concept] || CONCEPT_CAR.solo); drawVillager(g, wx - 2 * face, wy + 1, Object.assign({}, cast[0], {face, state:'idle', t, scale:0.6, noShadow:true, bust:true})); return; }
  if (concept === 'couple') drawVillager(g, wx - 10 * face, wy + 3, Object.assign({}, cast[1], {face, state:st, t:t + 0.35}));
  if (concept === 'family' && mode !== 'stroller') drawVillager(g, wx - 11 * face, wy + 2.5, Object.assign({}, cast[1], {face, state:st, t:t + 0.3, scale:0.72}));
  if (mode === 'bike') drawBike(g, wx, wy, face);
  drawVillager(g, wx, wy - (mode === 'bike' ? 4 : 0), Object.assign({}, cast[0], {face, state:st, t}));
  if (mode === 'stroller') drawStroller(g, wx + 3 * face, wy, face, 1, Object.assign({}, baby, {t}));
}
function drawActorOccluded(g, wx, wy, key, w, hgt, fn) { fn(g); const x0 = wx - w, x1 = wx + w, y0 = wy - hgt, y1 = wy + 4; const th = key + 0.35; let lo = 0, hi = OCC.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (OCC[mid].key <= th) lo = mid + 1; else hi = mid; } /* OCC는 key 오름차순(buildStatic 끝 정렬) → 이진탐색으로 시작점(v10) */ for (let k = lo; k < OCC.length; k++) { const o = OCC[k]; if (o.x1 < x0 || o.x0 > x1 || o.y1 < y0 || o.y0 > y1) continue; o.draw(g); } }

// ---------- 주민 NPC(연출): 10명이 골목·보도를 걷는다. 주민 스타일이면 종족 10, 픽셀크루면 나머지 크루. 실제 이용자 아님 ----------
const NPC_CAST = [{sp:'dog', col:'#f6a99a', crew:'purple'}, {sp:'frog', col:'#fff1b8', crew:'green'}, {sp:'fox', col:'#9fd3c7', crew:'yellow'}, {sp:'panda', col:'#f2a7b8', crew:'lime'}, {sp:'mouse', col:'#b9c6f2', crew:'red'}, {sp:'deer', col:'#c6e3a1', crew:'blue'}, {sp:'koala', col:'#ffd9a8', crew:'pink'}, {sp:'bunny', col:'#d9c5f0', crew:'cyan'}, {sp:'cat', col:'#ffe08a', crew:'orange'}, {sp:'bear', col:'#a8d8ea', crew:'green'}];
function spawnNpcs() {
  const roads = []; for (let i = 0; i < W * H; i++) if ((K[i] === KIND.ROAD && R[i] <= 7) || K[i] === KIND.FOOT) roads.push(i);
  S.npcs = []; let seed = 7;
  for (let n = 0; n < 10; n++) { seed = (seed * 9301 + 49297) % 233280; const i = roads[(seed / 233280 * roads.length) | 0]; S.npcs.push({x:(i % W) + 0.5, y:((i / W) | 0) + 0.5, tx:i % W, ty:(i / W) | 0, dir:[1, 0], step:0, face:1, who:NPC_CAST[n], seed:n * 1.37, wait:0, idle:n % 3 === 0, mood:['think', 'idle', 'happy'][n % 3]}); }
}
function tickNpcs(dt) {
  const sp = 0.9; // 타일/초(연출)
  for (const n of S.npcs) { if (n.idle) continue; if (n.wait > 0) { n.wait -= dt; continue; }
    const gx = n.tx + 0.5, gy = n.ty + 0.5; const dx = gx - n.x, dy = gy - n.y; const d = Math.hypot(dx, dy);
    if (d < 0.05) { // 다음 타일: 직진 우선, 막히면 회전, 길 타일만
      const opts = [[n.dir[0], n.dir[1]], [n.dir[1], -n.dir[0]], [-n.dir[1], n.dir[0]], [-n.dir[0], -n.dir[1]]];
      let moved = false; for (let k = 0; k < opts.length; k++) { const o = opts[k === 0 || Math.random() < 0.7 ? k : (1 + (Math.random() * 2 | 0))]; const nx = n.tx + o[0], ny = n.ty + o[1]; if (!inb(nx, ny)) continue; const i = idx(nx, ny); if (!((K[i] === KIND.ROAD && R[i] <= 7) || K[i] === KIND.FOOT)) continue; n.tx = nx; n.ty = ny; n.dir = o; moved = true; break; }
      if (!moved) n.wait = 1.5; if (Math.random() < 0.03) n.wait = 1.2 + Math.random() * 2; continue; }
    const mv = Math.min(d, sp * dt); n.x += dx / d * mv; n.y += dy / d * mv; n.step = (n.step + dt * 2.2) % 1; const sxp = (dx - dy); if (Math.abs(sxp) > 0.01) n.face = sxp > 0 ? 1 : -1; }
}

// ---------- 그리기 ----------
let lastTs = 0;
const skyCache = new Map();
function drawOnewayArrows() { // 차 모드: 일방통행 타일에 진행 방향 화살표(OSM oneway, 추정). 월드 좌표계 안에서 호출
  ctx.fillStyle = 'rgba(40,70,140,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.8 / S.zoom; const s = 7 / S.zoom; // 화면 7px
  for (let i = 0; i < W * H; i++) {
    if (!OW[i] || OD[i] < 0 || K[i] !== KIND.ROAD) continue;
    const x = i % W, y = (i / W) | 0; const c = proj(x + 0.5, y + 0.5, zCenter(i) + 0.2); const sc = worldToScreen(c[0], c[1]); if (sc[0] < -20 || sc[1] < -20 || sc[0] > VW + 20 || sc[1] > VH + 20) continue;
    const v = DIRV[OD[i]]; const q = proj(x + 0.5 + v[0] * 0.5, y + 0.5 + v[1] * 0.5, zCenter(i) + 0.2); let dx = q[0] - c[0], dy = q[1] - c[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    ctx.beginPath(); ctx.moveTo(c[0] + dx * s, c[1] + dy * s); ctx.lineTo(c[0] - dx * s * .6 + dy * s * .6, c[1] - dy * s * .6 - dx * s * .6); ctx.lineTo(c[0] - dx * s * .6 - dy * s * .6, c[1] - dy * s * .6 + dx * s * .6); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
function draw(ts) {
  if (!staticCv) return;
  const dt = Math.min(0.1, (ts - lastTs) / 1000 || 0); lastTs = ts; tickNpcs(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const night = S.night; const skyKey = (night ? 'n' : 'd') + (SK || TOP ? 's' : 'i') + S.clock + '|' + VH; let sky = skyCache.get(skyKey); if (!sky) { sky = ctx.createLinearGradient(0, 0, 0, VH); if (night) { sky.addColorStop(0, '#1b2238'); sky.addColorStop(1, '#2a3450'); } else if (SK || TOP) { const pc = S.clock === 'pm' ? C.paper2 : C.paper; sky.addColorStop(0, pc); sky.addColorStop(1, pc); } else if (S.clock === 'pm') { sky.addColorStop(0, '#f6dfc4'); sky.addColorStop(1, '#f1e6cf'); } else { sky.addColorStop(0, '#d9efe3'); sky.addColorStop(1, '#eef3dc'); } skyCache.set(skyKey, sky); } // 하늘 그라데이션은 (밤·스타일·시계·높이)별로 한 번만 만든다(v9)
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  if (S.follow) { const p = proj(S.px + 0.5, S.py + 0.5, surfZ(S.px + 0.5, S.py + 0.5)); S.camX += (p[0] - S.camX) * 0.18; S.camY += (p[1] - 10 - S.camY) * 0.18; }
  ctx.translate(VW / 2, VH / 2); ctx.scale(S.zoom, S.zoom); ctx.translate(-S.camX, -S.camY);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(staticCv, WX0, WY0, (WX1 - WX0), (WY1 - WY0));
  if (S.mode === 'car' && OW && OD && S.zoom >= 1.1) drawOnewayArrows(); // v9
  // 경로 미리보기(점선 + 깃발)
  if (S.traveling) { const t = S.traveling; ctx.strokeStyle = 'rgba(240,138,102,.95)'; ctx.lineWidth = 2.2 / S.zoom + 1; ctx.lineCap = 'round'; ctx.setLineDash([5, 5]); ctx.beginPath(); t.path.forEach((i, n) => { const x = i % W, y = (i / W) | 0; const p = proj(x + 0.5, y + 0.5, zCenter(i) + 0.3); n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.setLineDash([]); const gi = t.path[t.path.length - 1]; const gp = proj((gi % W) + 0.5, ((gi / W) | 0) + 0.5, zCenter(gi)); drawFlag(gp[0], gp[1], '#d95f4b'); }
  // NPC(가림 처리) → 플레이어(가림 처리)
  for (const n of S.npcs) { const z = surfZ(n.x, n.y); const p = proj(n.x, n.y + (TOP ? 0.3 : 0), z); const sp = worldToScreen(p[0], p[1]); if (sp[0] < -60 || sp[1] < -60 || sp[0] > VW + 60 || sp[1] > VH + 60) continue; const st = n.idle ? n.mood : (n.wait > 0 ? 'idle' : 'walk'); drawActorOccluded(ctx, p[0], p[1], n.x + n.y, 14, 30, (g) => drawActor(g, p[0], p[1], {who:n.who, face:n.face, state:st, t:ts / 1000, seed:n.seed})); }
  { const z = surfZ(S.px + 0.5, S.py + 0.5); const p = proj(S.px + 0.5, S.py + 0.5 + (TOP ? 0.3 : 0), z); const walking = !!S.traveling; drawActorOccluded(ctx, p[0], p[1], S.px + S.py + 1, 24, 36, (g) => drawParty(g, p[0], p[1], ts, walking, S.face, S.mode, S.concept)); }
  // 밤: 틴트 + 불빛
  if (night) { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = 'rgba(20,30,70,.42)'; ctx.fillRect(0, 0, VW, VH); ctx.translate(VW / 2, VH / 2); ctx.scale(S.zoom, S.zoom); ctx.translate(-S.camX, -S.camY); ctx.globalCompositeOperation = 'lighter'; if (lightsCv) ctx.drawImage(lightsCv, WX0, WY0, (WX1 - WX0), (WY1 - WY0)); ctx.globalCompositeOperation = 'source-over'; }
  // 표식(화면 좌표, 크기 고정)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); drawMarkers();
  drawMinimap();
}
function drawFlag(x, y, col) { ctx.fillStyle = 'rgba(40,30,20,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 5, 2.2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#4a3b2f'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 16); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 9, y - 13); ctx.lineTo(x, y - 10); ctx.closePath(); ctx.fill(); }
const twCache = new Map(); const textW = (font, text) => { const k = font + '|' + text; let w = twCache.get(k); if (w === undefined) { w = ctx.measureText(text).width; if (twCache.size > 3000) twCache.clear(); twCache.set(k, w); } return w; }; // 라벨 폭 메모이즈(v9)
function roundTag(x, y, text, opts) { const o = opts || {}; ctx.font = `${o.bold ? 600 : 500} ${o.size || 10}px "Noto Sans KR",sans-serif`; const tw = textW(ctx.font, text); const pad = o.pad || 6; const w = tw + pad * 2 + (o.dot ? 10 : 0), h = (o.size || 10) + 8; const x0 = x - w / 2, y0 = y - h; ctx.fillStyle = o.bg || 'rgba(255,253,246,.94)'; ctx.strokeStyle = o.border || 'rgba(74,59,47,.35)'; ctx.lineWidth = o.lw || 1; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, h / 2); ctx.fill(); ctx.stroke(); if (o.dot) { ctx.fillStyle = o.dot; ctx.beginPath(); ctx.arc(x0 + pad + 3, y0 + h / 2, 3.2, 0, 7); ctx.fill(); } ctx.fillStyle = o.color || '#4a3b2f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x0 + pad + (o.dot ? 10 : 0), y0 + h / 2 + 0.5); ctx.textBaseline = 'alphabetic'; return [x0, y0, w, h]; }
function drawMarkers() {
  const showLabels = S.zoom >= 1.25; const bigLabels = S.zoom >= 1.8;
  const vis = (sx, sy) => sx > -60 && sy > -60 && sx < VW + 60 && sy < VH + 60;
  // 단지 이름 명패
  for (const c of DATA.complexes) { const p = proj(c.x, c.y, surfZ(c.x, c.y) + 2); const [sx, sy] = worldToScreen(p[0], p[1]); if (!vis(sx, sy)) continue; roundTag(sx, sy - 70 * S.zoom, c.name, {size:12, bold:true, pad:9, border:c.color, lw:2.5, bg:'rgba(255,253,246,.96)'}); }
  // 역
  for (const st of DATA.stations) { const p = proj(st.x, st.y, surfZ(st.x, st.y)); const [sx, sy] = worldToScreen(p[0], p[1]); if (!vis(sx, sy)) continue; const [x0, y0, w, h] = roundTag(sx, sy - 10, `${st.name}역`, {size:11, bold:true, color:'#1c3f8a', border:'#2f6fcf', lw:1.5}); let ox = sx - st.lines.length * 7 + 7; for (const L of st.lines) { ctx.fillStyle = LINE_COLOR[L] || '#888'; ctx.beginPath(); ctx.arc(ox, y0 - 7, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(L.length > 2 ? L[0] : L, ox, y0 - 4); ox += 14; } }
  // POI·출구·출입구
  ctx.font = '12px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  for (const t of TARGETS) { if (t.type === 'conv' && S.zoom < 1.3) continue; if (t.type === 'play' && S.zoom < 1.1) continue; const p = proj(t.x, t.y, surfZ(t.x, t.y)); const [sx, sy] = worldToScreen(p[0], p[1]); if (!vis(sx, sy)) continue;
    const col = PIN[t.type] || '#888';
    if (t.type === 'exit') { ctx.fillStyle = '#e9edf3'; ctx.strokeStyle = 'rgba(74,59,47,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(sx - 7, sy - 12, 14, 12, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = LINE_COLOR[(DATA.stations.find(s => s.name === t.station) || {lines:['2']}).lines[0]] || '#2f6fcf'; ctx.fillRect(sx - 7, sy - 12, 14, 3); ctx.fillStyle = '#1c3f8a'; ctx.font = '700 8px "Noto Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.ref, sx, sy - 2); ctx.font = '12px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; if (bigLabels) roundTag(sx, sy + 14, `${t.ref}번 출구`, {size:8.5, pad:5}); continue; }
    if (t.type === 'gate') { ctx.fillStyle = '#a86d3a'; ctx.fillRect(sx - 7, sy - 12, 3, 12); ctx.fillRect(sx + 4, sy - 12, 3, 12); ctx.fillStyle = '#c98a4e'; ctx.beginPath(); ctx.roundRect(sx - 8, sy - 14, 16, 4, 2); ctx.fill(); if (showLabels) roundTag(sx, sy + 14, t.name.split(' ').slice(1).join(' '), {size:8.5, pad:5, dot:(DATA.complexes.find(c => c.id === t.complex) || {}).color}); continue; }
    // 핀 마커: 흰 원 + 색 테두리 + 그림 문자
    ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 4, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - 11, 8.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx - 3, sy - 4); ctx.lineTo(sx, sy); ctx.lineTo(sx + 3, sy - 4); ctx.fillStyle = col; ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(ICON[t.type] || '📍', sx, sy - 7);
    if (showLabels && (bigLabels || ['elem','mid','high','mart','park','lib','med','kinder'].includes(t.type))) roundTag(sx, sy + 14, t.name, {size:8.5, pad:5});
  }
}

// ---------- 이동 ----------
const TIME_SCALE = 22; // 실제 1초 = 월드 22초
function startTravel(gx, gy, target) {
  if (S.traveling) return;
  let goal = [gx, gy]; if (K[idx(gx, gy)] === KIND.BLD || !tileAllowed(idx(gx, gy), S.mode, -1)) { const nw = nearestWalkable(gx, gy, S.mode); if (!nw) { toast('그 자리는 갈 수 없어요'); return; } goal = nw; }
  const path = astar(S.px | 0, S.py | 0, goal[0], goal[1], S.mode);
  if (!path) { say(S.mode === 'stroller' ? '유모차로 갈 수 있는 경로를 데이터에서 찾지 못했어요(계단·급경사). 도보로 바꿔 볼까요?' : S.mode === 'car' ? '차로 닿는 도로 경로를 찾지 못했어요(도로 데이터 한계).' : '경로 없음: 데이터상 통행 가능 경로를 확인하지 못했어요.'); return; }
  const st = routeStats(path, S.mode);
  const seg = []; let acc = 0; for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i]; const diag = (a % W) !== (b % W) && ((a / W) | 0) !== ((b / W) | 0); const c = stepCost(a, b, S.mode, diag); acc += c; seg.push(acc); }
  if (S.mode === 'car' && path.length > 1) { path.push(path[path.length - 1]); seg.push(acc + 3); } // 주차 +3분: HUD(routeStats)와 재생 시간을 맞춘다 — 마지막 타일에서 3분 정지
  S.traveling = {path, seg, t0:performance.now(), stats:st, target, mode:S.mode, from:S.lastArrive || null, maxGradeSeen:0, notified:new Set()};
  S.follow = true; document.getElementById('btnSkip').hidden = false;
  updateStats(st, 0);
  say(`${target ? target.name + '까지 ' : ''}${MODE_KO[S.mode]}로 약 ${fmtMin(st.min)} · ${Math.round(st.dist)}m · 오르막 ${Math.round(st.up)}m. 실제 환산(추정)이에요.`);
}
function fmtMin(m) { return m < 1 ? `${Math.round(m * 60)}초` : `${Math.round(m)}분`; }
function updateStats(st, elapsedMin) { document.getElementById('stMin').textContent = Math.round(st.min); document.getElementById('stMode').textContent = `${MODE_KO[S.mode]} · 실제 환산(추정)${elapsedMin ? ' · 경과 ' + Math.round(elapsedMin) + '분' : ''}`; document.getElementById('stDist').textContent = `${Math.round(st.dist)} m`; document.getElementById('stUp').textContent = `↑${Math.round(st.up)} m · 최대 ${Math.round(st.maxGrade)}%`; document.getElementById('stCross').textContent = `횡단 ${st.cross}`; document.getElementById('stStairs').textContent = `계단 ${st.stairs}`; }
function tickTravel(now) {
  const t = S.traveling; if (!t) return;
  const elapsedMin = (now - t.t0) / 1000 * TIME_SCALE / 60;
  let k = 0; while (k < t.seg.length && t.seg[k] <= elapsedMin) k++;
  if (k >= t.seg.length) { finishTravel(); return; }
  const a = t.path[k], b = t.path[k + 1]; const prev = k ? t.seg[k - 1] : 0; const f = Math.min(1, (elapsedMin - prev) / (t.seg[k] - prev));
  const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
  S.px = ax + (bx - ax) * f; S.py = ay + (by - ay) * f; const sxp = (bx - ax) - (by - ay); if (sxp !== 0) S.face = sxp > 0 ? 1 : -1;
  // 이벤트: 급경사·계단·횡단
  const dz = E[b] - E[a]; const d = (ax !== bx && ay !== by) ? TILE_M * 1.414 : TILE_M; const grade = dz / d * 100;
  if (grade >= 9 && !t.notified.has('g' + b)) { t.notified.add('g' + b); toast(`⛰ 경사 ${Math.round(grade)}% 오르막${S.mode === 'stroller' ? ' — 유모차 밀기 힘듦' : S.mode === 'bike' ? ' — 내려서 끌기' : ''}`); }
  if (isStairs(b) && !t.notified.has('s' + b)) { t.notified.add('s' + b); toast('🪜 계단 구간'); }
  if (t.mode === 'car' && k === t.seg.length - 1 && a === b && !t.notified.has('park')) { t.notified.add('park'); toast('🅿️ 지하주차장 진입·주차 +3분(모델 가정)'); }
  if (R[b] >= 8 && R[a] < 8 && !t.notified.has('c' + b)) { t.notified.add('c' + b); toast(CR[b] ? '🚦 횡단보도 건너기 (+30초)' : '🚦 대로 횡단 (+30초, 횡단보도 데이터 없음)'); }
  updateStats(t.stats, elapsedMin);
}
function finishTravel() {
  const t = S.traveling; const gi = t.path[t.path.length - 1]; S.px = gi % W; S.py = (gi / W) | 0; S.traveling = null; document.getElementById('btnSkip').hidden = true;
  S.routeLog.push({complex:S.complex, mode:t.mode, target:t.target ? t.target.name : '지점', min:+t.stats.min.toFixed(1), dist:Math.round(t.stats.dist), up:Math.round(t.stats.up), cross:t.stats.cross, stairs:t.stats.stairs, maxGrade:Math.round(t.stats.maxGrade), clock:S.clock});
  S.lastArrive = t.target || null;
  if (t.target) { S.visited.add(t.target.id); onArrive(t.target, t.mode, t.stats); } else say(`도착! ${MODE_KO[t.mode]}로 ${fmtMin(t.stats.min)} 걸렸어요.`);
  save(); renderDrawer();
}
function onArrive(target, mode, st) {
  let msg = `${target.name} 도착 · ${MODE_KO[mode]} ${fmtMin(st.min)}`;
  const tc = (target.complex && DATA.complexes.find(c => c.id === target.complex)) || cur(); // 도착 단지(출발 단지가 아님)
  if (target.type === 'gate' && mode === 'car') msg += ' · 지하주차장 진입 +3분(주차 ' + ((tc.facts || []).find(f => f.k === '주차') || {v:'자료 없음'}).v.split(',')[0] + ')';
  if (target.type === 'exit' && mode === 'stroller') msg += ' · 출구 엘리베이터 유무는 데이터 미확인';
  if (target.type === 'elem') msg += ` · 횡단 ${st.cross}회` + (target.name.includes('신당') && S.complex === 'HYBER' ? ' · 배정교' : ' · 배정 여부 확인 필요');
  say(msg);
  S.events.push({arrive:target.type, poi:target.type, mode, targetId:target.id, complex:target.complex});
  evalChecklist();
  if (target.type === 'gate' && target.complex && target.complex !== S.complex) { setComplex(target.complex, false); evalChecklist(); } // 전환 뒤 새 단지 기준으로 한 번 더
  // 카드 노출: 도착 유형 → 카테고리 후보(순서대로 미획득 첫 장). construction·regulation은 정문에서(단지 자체 쟁점)
  const c = cur(); const cats = CARD_CATS[target.type] || [];
  const card = (c.cards || []).find(cd => cats.includes(cd.cat) && !S.cardsSeen.has(cd.id));
  if (card) { S.cardsSeen.add(card.id); setTimeout(() => say(`🗂 카드 획득 [${card.grade}] ${card.title} — 서랍의 이슈 카드에서 출처를 볼 수 있어요.`), 2600); }
}
const CARD_CATS = {elem:['school'], mid:['school'], high:['school'], kinder:['school', 'community'], exit:['traffic'], gate:['parking', 'slope', 'construction', 'regulation'], mart:['commerce'], conv:['commerce'], med:['community'], park:['community'], play:['community'], lib:['community'], gym:['community']};
const checkKey = (cid, itemId) => S.concept + ':' + cid + ':' + itemId; // 저장 v2: 컨셉별 체크
function evalChecklist() {
  const list = CHECKLISTS[S.concept] || []; const cid = S.complex;
  for (const it of list) {
    const key = checkKey(cid, it.id); if (S.done.has(key)) continue; const c = it.c; let ok = false;
    for (const ev of S.events) {
      if (c.arrive && ev.arrive === c.arrive && (!c.mode || ev.mode === c.mode) && (ev.complex === cid || !ev.complex)) ok = true;
      if (c.poi && ev.poi && c.poi.includes(ev.poi) && (!c.mode || ev.mode === c.mode)) ok = true;
      if (c.night && ev.night) ok = true; if (c.commute && ev.commute) ok = true; if (c.commute2 && ev.commute2) ok = true; if (c.interior && ev.interior) ok = true;
    }
    if (ok) { S.done.add(key); toast(`✅ 체크: ${it.l}`); }
  }
  save();
}

// ---------- UI 공통 ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); // 데이터 문자열은 전부 이스케이프해서 innerHTML에 넣는다
const gradeLabel = (g) => ({unknown:'미확인', F:'개념', concept:'개념'})[g] || g;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove('show'), 3200); }
const dlgFace = document.getElementById('dlgFace'), dlgCtx = dlgFace.getContext('2d');
if (STYLE.char === 'pixelcrew') { dlgFace.width = 24; dlgFace.height = 22; dlgFace.style.imageRendering = 'pixelated'; } else { dlgFace.width = 96; dlgFace.height = 88; }
function faceDraw(g, w, h, who, state, t) { // 길잡이 얼굴: 유령은 24×22 원문 픽셀, 주민은 머리만 캔버스 높이에 맞춤
  g.clearRect(0, 0, w, h);
  if (STYLE.char === 'pixelcrew') { g.imageSmoothingEnabled = false; g.drawImage(ghostCanvas(who.crew, state, state === 'talk' ? Math.floor((t || 0) / 0.14) % PX.frameCount('talk') : 0, false), 0, 0, 24, 22); return; }
  const sc = h / 26; drawVillager(g, w / 2, h * 0.59 + 30 * 0.68 * sc, Object.assign({}, who, {face:1, state, t, scale:sc, noShadow:true, bust:true}));
}
function dlgDraw(state, t) { faceDraw(dlgCtx, dlgFace.width, dlgFace.height, GUIDE, state, t); }
function dlgAnimate(on) { clearInterval(dlgAnimate._h); clearTimeout(dlgAnimate._t); if (!on) { dlgDraw('idle', 0); return; } let f = 0; dlgDraw('talk', 0); dlgAnimate._h = setInterval(() => { f += 0.09; dlgDraw('talk', f); }, 90); dlgAnimate._t = setTimeout(() => { clearInterval(dlgAnimate._h); dlgDraw('happy', 0.2); }, 2200); }
function say(msg, name) { const d = $('#dialog'); $('#dlgText').textContent = msg; $('#dlgName').textContent = name || GUIDE.name; d.classList.add('show'); dlgAnimate(true); clearTimeout(say._h); say._h = setTimeout(() => d.classList.remove('show'), 6500); }
$('#dlgName').textContent = GUIDE.name;
$('#dialog').addEventListener('click', () => { $('#dialog').classList.remove('show'); clearTimeout(say._h); });
const cur = () => DATA.complexes.find(c => c.id === S.complex) || DATA.complexes[0];
function setMode(m) { S.mode = m; document.querySelectorAll('#dock button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m))); $('#stMode').textContent = MODE_KO[m] + ' · 실제 환산'; }
document.querySelectorAll('#dock button').forEach(b => b.addEventListener('click', () => { if (S.traveling) { toast('이동 중에는 수단을 바꿀 수 없어요'); return; } setMode(b.dataset.mode); }));
$('#btnNight').addEventListener('click', () => { S.night = !S.night; $('#btnNight').setAttribute('aria-pressed', String(S.night)); if (S.night && !buildLights()) toast('불빛 레이어를 만들지 못했어요(메모리 부족). 틴트만 적용해요'); if (S.night) { S.events.push({night:true}); evalChecklist(); say('🌙 밤 모드는 연출이에요. 창문 불빛은 가짜고, 가로등·CCTV 데이터는 이 프로토에 없어요.'); } });
const clockClick = () => { S.clock = S.clock === 'am' ? 'day' : S.clock === 'day' ? 'pm' : 'am'; $('#chipClock').innerHTML = S.clock === 'am' ? '🕗 <b>아침 08시</b>' : S.clock === 'day' ? '🕑 <b>낮 14시</b>' : '🕕 <b>저녁 18시</b>'; toast(S.clock === 'day' ? '낮: 차 정체 없음(가정)' : '출퇴근 시간대: 간선도로 차 속도 ×0.5(모델 가정)'); computeMetrics(); if (!$('#drawer').classList.contains('hidden') && tab === 'cmp') renderDrawer(); }; // 시계는 차 기준 구간(비교표)에 반영(v9)
$('#chipClock').addEventListener('click', clockClick); $('#chipClock').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clockClick(); } });
$('#btnSkip').addEventListener('click', () => { if (S.traveling) { S.traveling.t0 = -1e12; } });
$('#btnCenter').addEventListener('click', () => { S.follow = true; });
$('#btnDrawer').addEventListener('click', () => { $('#drawer').classList.toggle('hidden'); syncDrawer(); renderDrawer(); });
$('#btnDrawerClose').addEventListener('click', () => { $('#drawer').classList.add('hidden'); syncDrawer(); });
$('#btnDest').addEventListener('click', () => { openTab('dest'); });
$('#btnNote').addEventListener('click', () => openNote());
let tab = 'info';
function openTab(t) { tab = t; document.querySelectorAll('#drawer .tabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === t))); $('#drawer').classList.remove('hidden'); syncDrawer(); renderDrawer(); }
function syncDrawer() { document.body.classList.toggle('drawer-open', !$('#drawer').classList.contains('hidden')); }
document.querySelectorAll('#drawer .tabs button').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));
const badge = (cls) => `<span class="badge g-${cls}">${({official:'공식',estimate:'추정',review:'후기',unknown:'미확인',concept:'개념'})[cls] || cls}</span>`;
