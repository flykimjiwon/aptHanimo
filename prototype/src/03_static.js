// ---------- 정적 레이어(지형·길·나무·건물) + 야간 불빛 레이어 ----------
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const SS = Math.min(1.5, DPR);   // 정적 레이어 해상도 배율
const SL = 1;                    // 불빛 레이어 배율(메모리 절약)
let staticCv = null, lightsCv = null;
const OCC = []; // 가림 소품(건물·나무): {key, x0, y0, x1, y1, draw(g)}
const BASEZ = Math.min(...TIERZ) - 12;
const ROADW = (i) => K[i] === KIND.FOOT ? 5 : K[i] === KIND.STEPS ? 7 : R[i] >= 9 ? 17 : R[i] >= 8 ? 15 : R[i] >= 7 ? 12 : R[i] >= 5 ? 9 : 6;
const ROADC = (i) => K[i] === KIND.FOOT ? C.foot : K[i] === KIND.STEPS ? C.steps : C.road[R[i] >= 9 ? 9 : R[i] >= 8 ? 8 : R[i] >= 7 ? 7 : R[i] >= 5 ? 5 : 4];
const NB8 = [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function tileCenter(i) { const x = i % W, y = (i / W) | 0; return proj(x + 0.5, y + 0.5, zCenter(i)); }
function roadLinks(x, y) { // 연결된 이웃(8방향, 대각선은 양 옆 직교 이웃이 모두 길이면 생략)
  const out = [];
  for (const [dx, dy] of NB8) { if (!inb(x + dx, y + dy)) continue; const n = idx(x + dx, y + dy); if (!isWay(n)) continue;
    if (dx && dy) { const a = isWay(idx(x + dx, y)), b = isWay(idx(x, y + dy)); if (a && b) continue; }
    out.push(n); }
  return out;
}
function drawTile(g, x, y) {
  const i = idx(x, y); const k = K[i];
  if (TOP) { // 수채 지도: 길 타일은 종이 그대로, 나머지는 번진 블롭(이웃과 겹침). 길·건물·나무는 buildStatic 의 별도 패스
    if (isWay(i)) return; const px = x * TT, py = y * TT; const col = k === KIND.PARK ? C.park[0] : k === KIND.SCHOOL ? C.school[0] : k === KIND.CONST ? C.constr[0] : C.ground[0];
    const gr = g.createRadialGradient(px + TT / 2, py + TT / 2, TT * .2, px + TT / 2, py + TT / 2, TT * .9); gr.addColorStop(0, rgbaOf(col, .75)); gr.addColorStop(1, rgbaOf(col, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(px + TT / 2 + (hash(x, y, 111) - .5) * TT * .3, py + TT / 2 + (hash(x, y, 112) - .5) * TT * .3, TT * .95, TT * .85, hash(x, y, 113) * 3, 0, 7); g.fill();
    if (k === KIND.CONST && (x + y) % 2 === 0) { g.strokeStyle = 'rgba(150,120,70,.3)'; g.lineWidth = .8; g.beginPath(); g.moveTo(px, py + TT); g.lineTo(px + TT, py); g.stroke(); }
    return;
  }
  const p0 = proj(x, y, cz(i, 0)), p1 = proj(x + 1, y, cz(i, 1)), p2 = proj(x + 1, y + 1, cz(i, 2)), p3 = proj(x, y + 1, cz(i, 3));
  // 절벽(동·남 이웃이 낮을 때) · 월드 가장자리는 받침대까지
  const eN = inb(x + 1, y) ? idx(x + 1, y) : -1, sN = inb(x, y + 1) ? idx(x, y + 1) : -1;
  const d1 = eN >= 0 ? cz(eN, 0) : BASEZ, d2 = eN >= 0 ? cz(eN, 3) : BASEZ;
  if (cz(i, 1) > d1 + 0.5 || cz(i, 2) > d2 + 0.5) { const q1 = proj(x + 1, y, d1), q2 = proj(x + 1, y + 1, d2); g.fillStyle = eN >= 0 ? C.cliff2 : C.base2; g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(q2[0], q2[1]); g.lineTo(q1[0], q1[1]); g.closePath(); g.fill();
    if (SK) { g.strokeStyle = C.ink; g.lineWidth = .6; for (let t = .2; t < 1; t += .25) { const a = lerp2(p1, p2, t), b = lerp2(q1, q2, t); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
    g.strokeStyle = C.lip; g.lineWidth = SK ? 1.2 : 1.6; g.beginPath(); g.moveTo(p1[0], p1[1] + .8); g.lineTo(p2[0], p2[1] + .8); g.stroke(); }
  const e0 = sN >= 0 ? cz(sN, 0) : BASEZ, e1 = sN >= 0 ? cz(sN, 1) : BASEZ;
  if (cz(i, 3) > e0 + 0.5 || cz(i, 2) > e1 + 0.5) { const q2 = proj(x + 1, y + 1, e1), q3 = proj(x, y + 1, e0); g.fillStyle = sN >= 0 ? C.cliff : C.base; g.beginPath(); g.moveTo(p3[0], p3[1]); g.lineTo(p2[0], p2[1]); g.lineTo(q2[0], q2[1]); g.lineTo(q3[0], q3[1]); g.closePath(); g.fill();
    if (SK) { g.strokeStyle = C.ink; g.lineWidth = .6; for (let t = .2; t < 1; t += .25) { const a = lerp2(p3, p2, t), b = lerp2(q3, q2, t); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
    g.strokeStyle = C.lip; g.lineWidth = SK ? 1.2 : 1.6; g.beginPath(); g.moveTo(p3[0], p3[1] + .8); g.lineTo(p2[0], p2[1] + .8); g.stroke(); }
  // 윗면
  const chk = (x + y) & 1; let col;
  if (k === KIND.PARK) col = C.park[chk]; else if (k === KIND.SCHOOL) col = C.school[chk]; else if (k === KIND.CONST) col = C.constr[chk]; else if (k === KIND.BLD) col = C.pad[chk]; else col = C.ground[chk];
  const tint = 0.96 + ((TIERZ[i] - 16) / 100) * 0.1;
  g.fillStyle = shade(col, tint); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.closePath(); g.fill(); if (SK) { g.strokeStyle = C.grid; g.lineWidth = .4; g.stroke(); }
  // 풀 포기
  if (!SK && (k === KIND.GROUND || k === KIND.PARK) && hash(x, y, 7) < 0.3) { const c = lerp2(lerp2(p0, p2, 0.35 + hash(x, y, 8) * 0.3), lerp2(p1, p3, 0.5), 0.5); g.strokeStyle = 'rgba(40,90,30,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(c[0] - 2, c[1] + 1); g.lineTo(c[0], c[1] - 2); g.lineTo(c[0] + 2, c[1] + 1); g.stroke(); }
  // 대로(등급 8+): 타일 전체를 포장 — 이웃이 대로가 아닌 변에만 연석
  if (!SK && k === KIND.ROAD && R[i] >= 8) {
    g.fillStyle = ROADC(i); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.closePath(); g.fill();
    const edges = [[0, -1, p0, p1], [1, 0, p1, p2], [0, 1, p3, p2], [-1, 0, p0, p3]]; g.strokeStyle = C.curb; g.lineWidth = 1.4;
    for (const [dx, dy, a, b] of edges) { const n = inb(x + dx, y + dy) ? idx(x + dx, y + dy) : -1; if (n >= 0 && K[n] === KIND.ROAD && R[n] >= 8) continue; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    const ex = inb(x + 1, y) && K[idx(x + 1, y)] === KIND.ROAD && R[idx(x + 1, y)] >= 8, wx = inb(x - 1, y) && K[idx(x - 1, y)] === KIND.ROAD && R[idx(x - 1, y)] >= 8, sy = inb(x, y + 1) && K[idx(x, y + 1)] === KIND.ROAD && R[idx(x, y + 1)] >= 8, ny = inb(x, y - 1) && K[idx(x, y - 1)] === KIND.ROAD && R[idx(x, y - 1)] >= 8;
    const along = (ex || wx) && !(sy && ny) ? 'x' : (sy || ny) ? 'y' : 'x';
    if (hash(x, y, 14) < 0.5) { g.strokeStyle = LN[i] >= 4 ? 'rgba(233,207,106,.8)' : 'rgba(247,243,232,.8)'; g.lineWidth = 1; g.setLineDash([4, 5]); g.beginPath(); if (along === 'x') { const a = lerp2(p0, p3, .5), b = lerp2(p1, p2, .5); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } else { const a = lerp2(p0, p1, .5), b = lerp2(p3, p2, .5); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); g.setLineDash([]); }
    if (CR[i]) { g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 1.8; for (let t = 0.2; t < 0.95; t += 0.18) { const a = along === 'x' ? lerp2(p0, p1, t) : lerp2(p0, p3, t), b = along === 'x' ? lerp2(p3, p2, t) : lerp2(p1, p2, t); g.beginPath(); g.moveTo(lerp2(a, b, .2)[0], lerp2(a, b, .2)[1]); g.lineTo(lerp2(a, b, .8)[0], lerp2(a, b, .8)[1]); g.stroke(); } }
  }
  // 공사구역: 빗금
  if (k === KIND.CONST && (x + y) % 2 === 0) { g.strokeStyle = 'rgba(150,120,70,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p2[0], p2[1]); g.stroke(); }
  // 골목·보도·계단(자동 타일링): 중심 원 + 이웃 방향 반쪽 띠
  if (SK && isWay(i)) { // 연필 스케치: 길은 잉크 두 줄(보도는 한 줄), 끝점 지터. 계단은 잉크 가로줄, 횡단보도는 엷은 줄무늬
    const c = tileCenter(i); const w = ROADW(i); const links = roadLinks(x, y); g.strokeStyle = C.ink; g.lineWidth = k === KIND.FOOT ? .5 : .9; g.lineCap = 'round';
    for (const n of links) { const cn = tileCenter(n); const m = [(c[0] + cn[0]) / 2, (c[1] + cn[1]) / 2]; const off = w * .3; for (const sgn of (k === KIND.FOOT ? [0] : [-1, 1])) { const nx = -(m[1] - c[1]), ny = (m[0] - c[0]); const L = Math.hypot(nx, ny) || 1; g.beginPath(); g.moveTo(c[0] + nx / L * off * sgn + (hash(i, sgn, 81) - .5), c[1] + ny / L * off * sgn); g.lineTo(m[0] + nx / L * off * sgn, m[1] + ny / L * off * sgn + (hash(i, sgn, 82) - .5)); g.stroke(); } }
    if (k === KIND.STEPS || (ST[i] && k !== KIND.ROAD)) { g.lineWidth = .7; for (let t = 0.2; t < 1; t += 0.2) { const a = lerp2(p0, p3, t), b = lerp2(p1, p2, t); g.beginPath(); g.moveTo(lerp2(a, b, .3)[0], lerp2(a, b, .3)[1]); g.lineTo(lerp2(a, b, .7)[0], lerp2(a, b, .7)[1]); g.stroke(); } }
    if (CR[i]) { g.strokeStyle = 'rgba(90,70,50,.22)'; g.lineWidth = 1.4; for (let t = 0.25; t < 0.9; t += 0.2) { const a = lerp2(p0, p1, t), b = lerp2(p3, p2, t); g.beginPath(); g.moveTo(lerp2(a, b, .25)[0], lerp2(a, b, .25)[1]); g.lineTo(lerp2(a, b, .75)[0], lerp2(a, b, .75)[1]); g.stroke(); } }
  }
  else if (isWay(i) && !(k === KIND.ROAD && R[i] >= 8)) {
    const c = tileCenter(i); const w = ROADW(i); const links = roadLinks(x, y);
    const segs = links.map(n => { const cn = tileCenter(n); return [c, [(c[0] + cn[0]) / 2, (c[1] + cn[1]) / 2], n]; });
    g.lineCap = 'butt'; g.lineJoin = 'round';
    // 테두리(연석)
    if (k !== KIND.FOOT) { g.strokeStyle = C.curb; g.lineWidth = w + 2; for (const [a, m] of segs) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(m[0], m[1]); g.stroke(); } g.fillStyle = C.curb; g.beginPath(); g.arc(c[0], c[1], w / 2 + 1, 0, 7); g.fill(); }
    g.strokeStyle = ROADC(i); g.lineWidth = w; if (k === KIND.FOOT) g.setLineDash([4, 3]);
    for (const [a, m] of segs) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(m[0], m[1]); g.stroke(); }
    g.setLineDash([]); g.fillStyle = ROADC(i); g.beginPath(); g.arc(c[0], c[1], w / 2, 0, 7); g.fill();
    if (k === KIND.ROAD && R[i] >= 8) { g.strokeStyle = LN[i] >= 4 ? '#e9cf6a' : '#f7f3e8'; g.lineWidth = 1; g.setLineDash([4, 5]); for (const [a, m] of segs) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(m[0], m[1]); g.stroke(); } g.setLineDash([]); }
    if (k === KIND.STEPS || (ST[i] && k !== KIND.ROAD)) { g.strokeStyle = 'rgba(90,70,40,.5)'; g.lineWidth = 1; for (let t = 0.2; t < 1; t += 0.2) { const a = lerp2(p0, p3, t), b = lerp2(p1, p2, t); g.beginPath(); g.moveTo(lerp2(a, b, .3)[0], lerp2(a, b, .3)[1]); g.lineTo(lerp2(a, b, .7)[0], lerp2(a, b, .7)[1]); g.stroke(); } }
    if (CR[i]) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.6; for (let t = 0.25; t < 0.9; t += 0.2) { const a = lerp2(p0, p1, t), b = lerp2(p3, p2, t); g.beginPath(); g.moveTo(lerp2(a, b, .25)[0], lerp2(a, b, .25)[1]); g.lineTo(lerp2(a, b, .75)[0], lerp2(a, b, .75)[1]); g.stroke(); } }
  }
}
function drawTree(g, pr) {
  const z = surfZ(pr.x, pr.y); const p = proj(pr.x, pr.y, z); const s = pr.size; const pal = pr.var ? C.tree2 : C.tree;
  if (TOP) { const r = TT * .5 * s; const gr = g.createRadialGradient(p[0], p[1], 1, p[0], p[1], r); gr.addColorStop(0, 'rgba(79,154,70,.85)'); gr.addColorStop(1, 'rgba(79,154,70,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); return; } // 수채 지도: 위에서 본 번짐 원
  if (SK) { // 번짐 나무(스타일 랩 blob): 반투명 녹색 블롭 3개 + 잉크 줄기 + 엷은 윤곽
    for (let i = 0; i < 3; i++) { const cx = p[0] + (i - 1) * 2 * s, cy = p[1] - 11 * s; const gr = g.createRadialGradient(cx, cy, 1, cx, cy, 8 * s); gr.addColorStop(0, 'rgba(95,168,82,.55)'); gr.addColorStop(1, 'rgba(95,168,82,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, 8 * s, 7 * s, 0, 0, 7); g.fill(); }
    g.strokeStyle = C.ink; g.lineWidth = .8; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - 7 * s); g.stroke(); g.strokeStyle = 'rgba(90,70,50,.3)'; g.lineWidth = .7; g.beginPath(); g.arc(p[0], p[1] - 11 * s, 7.4 * s, 0.4, Math.PI * 2 - 1.1); g.stroke(); return; }
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(p[0] + 1.5 * s, p[1] + 0.5, 7 * s, 3 * s, 0, 0, 7); g.fill();
  g.fillStyle = C.trunk; g.fillRect(p[0] - 1.3 * s, p[1] - 7 * s, 2.6 * s, 7 * s);
  g.fillStyle = pal[1]; g.beginPath(); g.arc(p[0], p[1] - 11 * s, 7.5 * s, 0, 7); g.fill();
  g.fillStyle = pal[0]; g.beginPath(); g.arc(p[0] - 1.6 * s, p[1] - 13 * s, 5.6 * s, 0, 7); g.fill();
  g.fillStyle = C.leafHi; g.beginPath(); g.arc(p[0] - 3 * s, p[1] - 15 * s, 2.2 * s, 0, 7); g.fill();
  g.strokeStyle = C.outline; g.lineWidth = 1; g.beginPath(); g.arc(p[0], p[1] - 11 * s, 7.5 * s, 0.35, Math.PI * 2 - 0.9); g.stroke();
}
function drawFlower(g, pr) {
  const z = surfZ(pr.x, pr.y); const p = proj(pr.x, pr.y, z); const cols = ['#f78fb3', '#ffd166', '#fff6e0'];
  for (let n = 0; n < 3; n++) { const a = n * 2.1 + pr.var; const fx = p[0] + Math.cos(a) * 4, fy = p[1] + Math.sin(a) * 2; g.strokeStyle = '#4f9a46'; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, fy + 1); g.lineTo(fx, fy - 2); g.stroke(); g.fillStyle = cols[(pr.var + n) % 3]; g.beginPath(); g.arc(fx, fy - 2.5, 1.7, 0, 7); g.fill(); }
}
// ---------- 건물: 동숲 코티지(스타일 랩 cottage 이식) — 박공·처마·굴뚝·창틀·문, 두꺼운 윤곽. 아파트도 긴 박공 지붕을 얹어 마을처럼 ----------
const CT = {wall:'#f6e7c9', wallNew:'#fbf1dc', wallOld:'#e8dcc4', houseWall:'#fff1d6', aptRoof:'#b8674a', outline:'#5a4634', lw:1.4, shade:[0.86, 0.96], glass:'#9ec5d8', frame:'#fffaf0', eave:1.5};
const mixHex = (h1, h2, t) => { const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16); const ch = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t); return '#' + [ch(16), ch(8), ch(0)].map(v => v.toString(16).padStart(2, '0')).join(''); };
function bldStyle(b, cx) {
  const h = hash(b.cx * 10 | 0, b.cy * 10 | 0, 9); const lv = b.levels;
  if (cx) { const wall = cx.theme === 'new' ? CT.wallNew : cx.theme === 'old' ? CT.wallOld : CT.wall; return {type:'apt', wall, roof:mixHex(cx.color, '#6b4e3a', 0.25), accent:cx.color, theme:cx.theme, hpx:lv * LH}; }
  if (b.kind === 'apartments' || lv >= 10) { const ac = C.aptAccent[(h * C.aptAccent.length) | 0]; return {type:'apt', wall:CT.wall, roof:mixHex(ac, '#6b4e3a', 0.2), accent:ac, theme:'mid', hpx:lv * LH}; }
  if (b.kind === 'school' || b.kind === 'kindergarten' || b.kind === 'public') return {type:'house', wall:CT.houseWall, roof:'#d9856a', accent:'#d9856a', hpx:lv * LH + 5};
  if (b.kind === 'commercial' || b.kind === 'retail') return {type:'house', wall:'#f7e6dc', roof:'#8aa2c0', accent:'#8aa2c0', hpx:lv * LH + 4, shop:true};
  return {type:'house', wall:C.houseWalls[(h * C.houseWalls.length) | 0], roof:C.roofs[(hash(b.cx * 7 | 0, b.cy * 7 | 0, 10) * C.roofs.length) | 0], accent:null, hpx:lv * LH + 4};
}
const ext = (p, from, d) => { const dx = p[0] - from[0], dy = p[1] - from[1]; const L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * d, p[1] + dy / L * d]; }; // p를 from 반대쪽으로 d px
function drawBuilding(g, gl, b, cx) {
  const st = bldStyle(b, cx); const z0 = b.tier; const hpx = st.hpx; const house = st.type === 'house';
  const pts = b.poly.map(p => proj(p[0], p[1], z0)); const ptsT = pts.map(p => [p[0], p[1] - hpx]);
  const ccx = b.poly.reduce((s, p) => s + p[0], 0) / b.poly.length, ccy = b.poly.reduce((s, p) => s + p[1], 0) / b.poly.length;
  const path = (arr) => { g.beginPath(); arr.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); };
  const outline = (arr) => { g.strokeStyle = CT.outline; g.lineWidth = CT.lw; path(arr); g.stroke(); };
  if (TOP) { // 수채 지도: 평면 발자국(단지색 또는 베이지 워시 + 잉크 윤곽), 야간은 중심 은은한 불빛, 동 라벨은 흰 테두리 글자
    g.fillStyle = cx ? rgbaOf(cx.color, .65) : 'rgba(232,220,200,.65)'; path(pts); g.fill(); g.strokeStyle = 'rgba(90,70,50,.55)'; g.lineWidth = .8; g.stroke();
    const tcx = pts.reduce((s, q) => s + q[0], 0) / pts.length, tcy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    if (gl && !house && hash(b.cx * 13 | 0, b.cy * 13 | 0, 11) < 0.55) { const r = Math.max(6, Math.sqrt(Math.abs(polyArea(b.poly))) * TT * .6); const gr = gl.createRadialGradient(tcx, tcy, 1, tcx, tcy, r); gr.addColorStop(0, 'rgba(255,214,120,.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); gl.fillStyle = gr; gl.fillRect(tcx - r, tcy - r, 2 * r, 2 * r); }
    if (cx && b.label) { g.font = '600 6.5px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.lineWidth = 2.2; g.strokeStyle = 'rgba(255,253,246,.9)'; g.strokeText(b.label, tcx, tcy + 2.3); g.fillStyle = '#4a3b2f'; g.fillText(b.label, tcx, tcy + 2.3); }
    return;
  }
  g.lineJoin = 'round';
  // 그림자(동남쪽)
  g.fillStyle = C.shadow; g.save(); g.translate(4, 2); path(pts); g.fill(); g.restore();
  // 보이는 벽(바깥 방향이 +x 또는 +y)
  const faces = [];
  for (let i = 0; i < pts.length; i++) { const a = b.poly[i], c = b.poly[(i + 1) % pts.length]; const mx = (a[0] + c[0]) / 2 - ccx, my = (a[1] + c[1]) / 2 - ccy; if (mx + my <= 0.02) continue; faces.push({i, south:my > mx}); }
  const floors = Math.max(1, b.levels); const fh = hpx / floors; let door = false;
  for (const f of faces) { const a = pts[f.i], c = pts[(f.i + 1) % pts.length], at = ptsT[f.i], ct = ptsT[(f.i + 1) % pts.length]; const quad = [a, c, ct, at];
    g.fillStyle = shade(st.wall, f.south ? CT.shade[0] : CT.shade[1]); path(quad); g.fill();
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]); const on = (t, dy) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t + dy];
    if (!house) { // 아파트: 층마다 창틀 창 한 줄(틀 두께는 층 높이에 맞춤)
      if (len > 8 && hpx > 8) { const ncol = Math.max(1, Math.floor((len - 4) / 8)); const wh = Math.min(3.4, fh * 0.78), ww = Math.min(5.2, Math.max(3.2, (len - 4) / ncol * 0.6)); const gh = wh * 0.66, gw = ww * 0.72;
        for (let fl = 0; fl < floors; fl++) { const y0 = -(fl + 0.52) * fh; for (let cI = 0; cI < ncol; cI++) { const [px, py] = on((cI + 0.5) / ncol, y0); g.fillStyle = CT.frame; g.fillRect(px - ww / 2, py - wh / 2, ww, wh); g.fillStyle = CT.glass; g.fillRect(px - gw / 2, py - gh / 2, gw, gh);
          if (gl && hash(b.cx * 13 | 0, fl * 31 + cI, 11) < 0.38) { gl.fillStyle = 'rgba(255,214,120,.95)'; gl.fillRect(px - gw / 2 - .2, py - gh / 2 - .2, gw + .4, gh + .4); gl.fillStyle = 'rgba(255,200,90,.18)'; gl.fillRect(px - 3, py - 2.4, 6, 4.6); } } } }
      if (st.theme === 'old' && f.south) { g.strokeStyle = 'rgba(90,70,50,.35)'; g.lineWidth = .8; g.beginPath(); g.moveTo(a[0] + len * .3, a[1] - hpx * .2); g.lineTo(a[0] + len * .34, a[1] - hpx * .4); g.lineTo(a[0] + len * .3, a[1] - hpx * .55); g.stroke(); } // 구축 금(D-12: 준공연도 기준)
    } else { // 집: 십자살 창 1~3 + 문(남쪽 면 1개) + 상점 줄무늬 차양
      if (len > 6) { const ncol = Math.min(3, Math.max(1, Math.floor(len / 10))); for (let cI = 0; cI < ncol; cI++) { const [px, py] = on((cI + 0.5) / ncol, -hpx * 0.56); g.fillStyle = CT.frame; g.fillRect(px - 2.6, py - 1.9, 5.2, 3.8); g.fillStyle = CT.glass; g.fillRect(px - 2, py - 1.3, 4, 2.6); g.strokeStyle = CT.outline; g.lineWidth = .6; g.strokeRect(px - 2.6, py - 1.9, 5.2, 3.8); g.beginPath(); g.moveTo(px, py - 1.3); g.lineTo(px, py + 1.3); g.stroke(); if (gl && hash(b.cx * 17 | 0, cI, 12) < 0.5) { gl.fillStyle = 'rgba(255,214,120,.95)'; gl.fillRect(px - 2.2, py - 1.5, 4.4, 3); } } }
      if (!door && f.south && len > 13) { door = true; const [px, py] = on(0.8, 0); g.fillStyle = shade(st.roof, 0.8); g.beginPath(); g.roundRect(px - 2, py - 6.5, 4, 6.5, [2, 2, 0, 0]); g.fill(); g.strokeStyle = CT.outline; g.lineWidth = .7; g.stroke(); g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(px + 1.1, py - 3.2, .5, 0, 7); g.fill(); }
      if (st.shop) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(a[0], a[1] - 2.5); g.lineTo(c[0], c[1] - 2.5); g.lineTo(c[0], c[1] - 5.5); g.lineTo(a[0], a[1] - 5.5); g.closePath(); g.fill(); g.fillStyle = st.roof; for (let t = 0.08; t < 1; t += 0.16) { const [px, py] = on(t, 0); g.fillRect(px - 1, py - 5.5, 2, 3); } }
    }
    outline(quad);
  }
  // 지붕: 4각이면 박공(긴 변 방향 용마루, 박공벽 삼각형 포함), 아니면 모임지붕(안쪽으로 모아 올림). 처마는 기하로 1.5px 확장
  const tcx = ptsT.reduce((s, q) => s + q[0], 0) / ptsT.length, tcy = ptsT.reduce((s, q) => s + q[1], 0) / ptsT.length; const roof = st.roof; const ev = CT.eave;
  let ridgeTop = tcy, chim = null;
  const slope = (poly) => { const south = (poly[0][1] + poly[1][1]) / 2 > tcy; g.fillStyle = shade(roof, south ? 0.86 : 1.04); path(poly); g.fill(); outline(poly); };
  if (ptsT.length === 4) {
    const top = ptsT; const d01 = Math.hypot(top[1][0] - top[0][0], top[1][1] - top[0][1]), d12 = Math.hypot(top[2][0] - top[1][0], top[2][1] - top[1][1]); const longFirst = d01 >= d12;
    const m1 = longFirst ? lerp2(top[0], top[3], .5) : lerp2(top[0], top[1], .5), m2 = longFirst ? lerp2(top[1], top[2], .5) : lerp2(top[3], top[2], .5); const rh = Math.max(4, Math.min(13, (longFirst ? d12 : d01) * 0.45));
    const r1 = [m1[0], m1[1] - rh], r2 = [m2[0], m2[1] - rh];
    const ends = longFirst ? [[top[0], r1, top[3]], [top[1], r2, top[2]]] : [[top[0], r1, top[1]], [top[3], r2, top[2]]];
    for (const e of ends) { g.fillStyle = shade(st.wall, 0.92); path(e); g.fill(); outline(e); }
    const mk = (e1, e2, ra, rb) => [ext(ext(e1, ra, ev), e2, ev), ext(ext(e2, rb, ev), e1, ev), ext(rb, ra, ev), ext(ra, rb, ev)]; // [처마1, 처마2, 용마루b, 용마루a]
    const sA = longFirst ? mk(top[0], top[1], r1, r2) : mk(top[0], top[3], r1, r2), sB = longFirst ? mk(top[3], top[2], r1, r2) : mk(top[1], top[2], r1, r2);
    const yA = (sA[0][1] + sA[1][1]) / 2, yB = (sB[0][1] + sB[1][1]) / 2; for (const sl of (yA < yB ? [sA, sB] : [sB, sA])) slope(sl);
    g.strokeStyle = CT.outline; g.lineWidth = CT.lw; g.beginPath(); g.moveTo(r1[0], r1[1]); g.lineTo(r2[0], r2[1]); g.stroke();
    ridgeTop = Math.min(r1[1], r2[1]); chim = r1[0] < r2[0] ? lerp2(r2, r1, 0.2) : lerp2(r1, r2, 0.2);
  } else {
    const rh = Math.max(3, Math.min(10, Math.sqrt(Math.abs(polyArea(b.poly))) * TW * 0.22)); const ins = ptsT.map(q => [tcx + (q[0] - tcx) * 0.45, tcy + (q[1] - tcy) * 0.45 - rh]);
    const fs = []; for (let i = 0; i < ptsT.length; i++) { const j = (i + 1) % ptsT.length; fs.push([ext(ptsT[i], ins[i], ev), ext(ptsT[j], ins[j], ev), ins[j], ins[i]]); }
    fs.sort((p, q) => (p[0][1] + p[1][1]) - (q[0][1] + q[1][1])); for (const sl of fs) slope(sl);
    g.fillStyle = shade(roof, 1.1); path(ins); g.fill(); outline(ins); ridgeTop = tcy - rh; chim = [tcx + 2, tcy - rh];
  }
  // 굴뚝(집은 늘, 아파트는 동 라벨이 없을 때)
  if (chim && (house || !(cx && b.label))) { g.fillStyle = shade(st.wall, 0.9); g.fillRect(chim[0] - 2, chim[1] - 5, 4, 7); g.strokeStyle = CT.outline; g.lineWidth = 1; g.strokeRect(chim[0] - 2, chim[1] - 5, 4, 7); g.fillStyle = CT.outline; g.fillRect(chim[0] - 2.6, chim[1] - 6, 5.2, 1.4); }
  // 동 라벨(단지)
  if (!house && cx && b.label) { g.font = '600 7px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; const tw = g.measureText(b.label).width + 6; g.fillStyle = 'rgba(255,253,246,.92)'; g.beginPath(); g.roundRect(tcx - tw / 2, ridgeTop - 12, tw, 9, 3); g.fill(); g.fillStyle = '#4a3b2f'; g.fillText(b.label, tcx, ridgeTop - 5); }
}
function buildStatic() {
  const w = Math.ceil((WX1 - WX0) * SS), h = Math.ceil((WY1 - WY0) * SS);
  staticCv = document.createElement('canvas'); staticCv.width = w; staticCv.height = h; const g = staticCv.getContext('2d'); g.setTransform(SS, 0, 0, SS, -WX0 * SS, -WY0 * SS);
  lightsCv = document.createElement('canvas'); lightsCv.width = Math.ceil((WX1 - WX0) * SL); lightsCv.height = Math.ceil((WY1 - WY0) * SL); const gl = lightsCv.getContext('2d'); gl.setTransform(SL, 0, 0, SL, -WX0 * SL, -WY0 * SL);
  if (TOP) { // 수채 지도 패스: 종이 결 → 블롭 타일(행 순서) → 손그림 길(이웃 연결선·지터·계단·횡단보도). 건물·나무는 아래 공통 루프(평면, 가림 목록 없음)
    g.fillStyle = 'rgba(90,70,50,.05)'; const n = Math.round((WX1 - WX0) * (WY1 - WY0) / 450); for (let i = 0; i < n; i++) g.fillRect(WX0 + hash(i, 1, 91) * (WX1 - WX0), WY0 + hash(i, 2, 92) * (WY1 - WY0), 1.2, 1.2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drawTile(g, x, y);
    g.lineCap = 'round';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); if (!isWay(i)) continue; const ax = (x + .5) * TT, ay = (y + .5) * TT;
      for (const nb of roadLinks(x, y)) { if (nb < i) continue; const bx = ((nb % W) + .5) * TT, by = (((nb / W) | 0) + .5) * TT; const wide = K[i] === KIND.ROAD && R[i] >= 7; g.strokeStyle = K[i] === KIND.FOOT ? 'rgba(200,170,120,.5)' : 'rgba(150,140,120,.55)'; g.lineWidth = K[i] === KIND.FOOT ? TT * .12 : wide ? TT * .42 : TT * .26; g.beginPath(); g.moveTo(ax + (hash(i, 1, 141) - .5) * 2, ay + (hash(i, 2, 142) - .5) * 2); g.lineTo(bx, by); g.stroke(); }
      if (K[i] === KIND.STEPS || (ST[i] && K[i] !== KIND.ROAD)) { g.strokeStyle = C.ink; g.lineWidth = .8; for (let t = -1; t <= 1; t++) { g.beginPath(); g.moveTo(ax - TT * .18, ay + t * TT * .18); g.lineTo(ax + TT * .18, ay + t * TT * .18); g.stroke(); } }
      if (CR[i]) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; for (let t = -1; t <= 1; t++) { g.beginPath(); g.moveTo(ax + t * TT * .16, ay - TT * .2); g.lineTo(ax + t * TT * .16, ay + TT * .2); g.stroke(); } }
    }
  }
  if (SK) { g.fillStyle = 'rgba(90,70,50,.05)'; const n = Math.round((WX1 - WX0) * (WY1 - WY0) / 640); for (let i = 0; i < n; i++) g.fillRect(WX0 + hash(i, 1, 71) * (WX1 - WX0), WY0 + hash(i, 2, 72) * (WY1 - WY0), 1.2, 1.2); } // 종이 결(스타일 랩 밀도)
  // 소품·건물을 깊이 키(x+y)별로 묶는다
  const propsAt = new Map(); for (const pr of PROPS) { const k = Math.floor(pr.x) + Math.floor(pr.y); (propsAt.get(k) || propsAt.set(k, []).get(k)).push(pr); }
  const bldAt = new Map(); const cmap = Object.fromEntries(DATA.complexes.map(c => [c.id, c]));
  for (const b of BLDS) { let best = -1e9, bx = 0, by = 0; for (const v of b.poly) { if (v[0] + v[1] > best) { best = v[0] + v[1]; bx = v[0]; by = v[1]; } } const k = Math.min(W + H - 2, Math.floor(bx - 0.01) + Math.floor(by - 0.01)); b.key = best; (bldAt.get(k) || bldAt.set(k, []).get(k)).push(b); }
  OCC.length = 0;
  for (let s = 0; s <= W + H - 2; s++) {
    if (!TOP) for (let x = Math.max(0, s - H + 1); x <= Math.min(W - 1, s); x++) drawTile(g, x, s - x);
    const ps = (propsAt.get(s) || []).sort((a, b) => (a.x + a.y) - (b.x + b.y)); const bs = (bldAt.get(s) || []).sort((a, b) => a.key - b.key);
    const items = [...ps.map(p => ({key:p.x + p.y, p})), ...bs.map(b => ({key:b.key, b}))].sort((a, b) => a.key - b.key);
    for (const it of items) {
      if (it.p) { if (it.p.kind === 'tree') { drawTree(g, it.p); const z = surfZ(it.p.x, it.p.y); const q = proj(it.p.x, it.p.y, z); const r = 9 * it.p.size; if (!TOP) OCC.push({key:it.key, x0:q[0] - r, y0:q[1] - 20 * it.p.size, x1:q[0] + r, y1:q[1] + 4, draw:(gg) => drawTree(gg, it.p)}); } else drawFlower(g, it.p); }
      else { const b = it.b; drawBuilding(g, gl, b, cmap[b.complex]); const st = bldStyle(b, cmap[b.complex]); const xs = b.poly.map(v => proj(v[0], v[1], b.tier)); const x0 = Math.min(...xs.map(q => q[0])), x1 = Math.max(...xs.map(q => q[0])), y1 = Math.max(...xs.map(q => q[1])), y0 = Math.min(...xs.map(q => q[1])) - st.hpx - 22; if (!TOP) OCC.push({key:it.key, x0, y0, x1, y1, draw:(gg) => drawBuilding(gg, null, b, cmap[b.complex])}); }
    }
  }
  // 가로등 불빛(야간): 간선도로 일부 타일
  for (let i = 0; i < W * H; i++) { if (K[i] === KIND.ROAD && R[i] >= 7 && hash(i % W, (i / W) | 0, 13) < 0.1) { const c = tileCenter(i); const gr = gl.createRadialGradient(c[0], c[1], 1, c[0], c[1], 16); gr.addColorStop(0, 'rgba(255,220,140,.45)'); gr.addColorStop(1, 'rgba(255,220,140,0)'); gl.fillStyle = gr; gl.fillRect(c[0] - 16, c[1] - 16, 32, 32); } }
  // 구역 라벨(공원·학교)
  for (const a of DATA.areas) { if (!a.name || a.kind === 'construction') continue; const cx = a.poly.reduce((s, p) => s + p[0], 0) / a.poly.length, cy = a.poly.reduce((s, p) => s + p[1], 0) / a.poly.length; if (!inb(cx | 0, cy | 0)) continue; const p = proj(cx, cy, surfZ(cx, cy)); g.font = '600 8.5px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; const tw = g.measureText(a.name).width + 10; g.fillStyle = 'rgba(255,253,246,.9)'; g.beginPath(); g.roundRect(p[0] - tw / 2, p[1] - 6, tw, 12, 6); g.fill(); g.fillStyle = a.kind === 'park' ? '#2f7a3a' : '#8a6a1f'; g.fillText(a.name, p[0], p[1] + 3); }
  OCC.sort((a, b) => a.key - b.key);
}
