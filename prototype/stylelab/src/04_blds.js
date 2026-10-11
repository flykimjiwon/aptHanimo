// ---------- 건물 10 — 스타일 파라미터 st 로 같은 프리즘을 다르게 그린다 ----------
const LH = 2.2; // 층당 px(월드 단위)
const BLDS = [
{id:'v2', name:'크림 윤곽(현행 v2)', desc:'크림 벽 + 단지색 발코니 띠 + 창 격자 + 1px 윤곽. 집은 파스텔 벽에 색 지붕.', tags:{난이도:1, 성능:1, 정합:'유지', 동숲:3},
  st:{wall:'#efe6d6', houseWall:'#faf0c8', roof:'#d9856a', roofInset:true, aptRoof:'mix', accent:'complex', outline:'rgba(70,50,30,.38)', lw:1, shade:[0.84, 0.95], win:'grid', glass:'#a7c3d2', ground:['#a9d57c', '#9fcd72'], tree:'round'}},
{id:'lowpoly', name:'저폴리 디오라마', desc:'윤곽 없는 3톤 면, 세이지 지붕, 큰 사각 창. 코덱스 빌드와 같은 결의 모형 느낌.', tags:{난이도:1, 성능:1, 정합:'유지', 동숲:3},
  st:{wall:'#f4e8d3', houseWall:'#e5d5bb', roof:'#92a58d', aptRoof:'#92a58d', outline:null, shade:[0.86, 0.97], win:'rect', glass:'#779da5', ground:['#c6d69a', '#bfd08f'], tree:'cone', base:'#d4bd9f'}},
{id:'pixel', name:'픽셀아트 타일', desc:'3px 격자에 맞춘 벽·창, 짙은 1px 윤곽, 남쪽 면 디더링. 불 켜진 창이 섞인다.', tags:{난이도:2, 성능:1, 정합:'단순화', 동숲:2},
  st:{wall:'#e8d8c0', houseWall:'#d9c9a9', roof:'#b0566b', aptRoof:'#7a6a8e', outline:'#3a2f3f', lw:1, shade:[0.8, 0.95], win:'pixel', glass:'#8ec5e8', lit:'#ffe08a', px:3, dither:true, ground:['#9ccf72', '#8fc467'], tree:'pixel'}},
{id:'paper', name:'종이 모형', desc:'흰 종이 벽, 접힌 자국 점선, 비스듬한 그림자, 지붕 풀칠 탭. 창은 연한 회색 사각.', tags:{난이도:2, 성능:1, 정합:'유지', 동숲:3},
  st:{wall:'#ffffff', houseWall:'#fbf8f1', roof:'#f1ede4', aptRoof:'#ebe6dc', outline:'#b9b1a4', lw:1, shade:[0.9, 0.98], win:'flat', glass:'#e3e0d8', folds:true, shadow:'offset', ground:['#e9efd8', '#e3eacf'], tree:'paper'}},
{id:'lego', name:'블록 장난감', desc:'채도 높은 원색 벽, 지붕 위 스터드, 반투명 창 블록. 집은 주황·노랑.', tags:{난이도:2, 성능:1, 정합:'단순화', 동숲:2},
  st:{wall:'#2a9d8f', houseWall:'#e76f51', houseWall2:'#f4a261', roof:'#264653', aptRoof:'#21867a', outline:'rgba(0,0,0,.28)', lw:1, shade:[0.82, 0.95], win:'rect', glass:'#cfe8f3', studs:true, ground:['#8ac926', '#7fbd22'], tree:'lego'}},
{id:'cottage', name:'동숲 코티지', desc:'박공 지붕과 처마, 창틀 있는 창, 굴뚝. 아파트도 긴 박공 지붕을 얹어 마을처럼.', tags:{난이도:2, 성능:1, 정합:'유지', 동숲:5},
  st:{wall:'#f6e7c9', houseWall:'#fff1d6', roof:'#c97b57', aptRoof:'#b8674a', pitched:true, eaves:true, chimney:true, outline:'#5a4634', lw:1.4, shade:[0.86, 0.96], win:'frame', glass:'#9ec5d8', ground:['#a9d57c', '#9fcd72'], tree:'round'}},
{id:'watercolor', name:'수채 번짐', desc:'꼭짓점이 흔들리는 두 겹 반투명 칠, 스케치 윤곽, 번진 창. 종이 결 위에.', tags:{난이도:3, 성능:2, 정합:'유지', 동숲:3},
  st:{wall:'#f4e9d8', houseWall:'#f9efe0', roof:'#c99a6b', aptRoof:'#d9a1a8', outline:'rgba(90,70,50,.55)', lw:1, sketch:true, jitter:1.6, alpha:0.8, shade:[0.9, 0.98], win:'soft', glass:'#86a9c0', ground:['#d7e4b8', '#cfdcb0'], tree:'blob', grain:true}},
{id:'blueprint', name:'블루프린트', desc:'청사진 위 흰 선. 채움 없이 선·창 격자·치수(층수·높이)만. 도면 보는 느낌.', tags:{난이도:1, 성능:1, 정합:'유지', 동숲:1},
  st:{wall:'#1b3b8f', houseWall:'#1b3b8f', roof:'#1b3b8f', aptRoof:'#1b3b8f', outline:'#dbeafe', lw:1, lineOnly:true, shade:[0.9, 1.05], win:'line', glass:'#93c5fd', dims:true, ground:['#1b3b8f', '#1d3f99'], tree:'line', bg:'#1b3b8f'}},
{id:'neon', name:'네온 야경', desc:'어두운 벽에 빛나는 창 격자, 지붕 네온 테두리. 단지색이 간판처럼 빛난다.', tags:{난이도:2, 성능:2, 정합:'유지', 동숲:2},
  st:{wall:'#1a1f2e', houseWall:'#20263a', roof:'#232a3d', aptRoof:'#2a3350', outline:'#2e3650', lw:1, shade:[0.85, 1.05], win:'glow', glass:'#ffd166', neon:'complex', ground:['#141830', '#171c36'], tree:'dark', bg:'#0f1222'}},
{id:'clay', name:'클레이 미니어처', desc:'모서리가 둥근 점토 덩어리, 윗면 왼쪽 하이라이트, 윤곽 없음. 파스텔 복숭아·하늘·연두.', tags:{난이도:2, 성능:1, 정합:'유지', 동숲:4},
  st:{wall:'#f7d6c4', houseWall:'#cfe3f5', houseWall2:'#d9f0c8', roof:'#f3b7a3', aptRoof:'#f1c1b0', rounded:true, highlight:true, outline:null, shade:[0.88, 0.97], win:'soft', glass:'#ffffff', ground:['#c8e6a6', '#bfe09c'], tree:'round', shadow:'soft'}},
];
const bySt = Object.fromEntries(BLDS.map(b => [b.id, b]));
function snap(v, px) { return px ? Math.round(v / px) * px : v; }
function prism(g, P, poly, z0, levels, st, info) { // info={house, label, complexColor}
  const house = info.house; const hpx = house ? levels * LH + 4 : levels * LH;
  const wall = house ? (info.alt && st.houseWall2 ? st.houseWall2 : st.houseWall || st.wall) : st.wall;
  const roof = house ? st.roof : (st.aptRoof === 'mix' ? mix(st.wall, info.complexColor || '#9fb08a', 0.55) : (st.aptRoof || st.roof));
  let pts = poly.map((p, i) => { const q = P(p[0], p[1], z0); return st.jitter ? [q[0] + (hash(i, poly.length, 21) - .5) * st.jitter * 2, q[1] + (hash(i, poly.length, 22) - .5) * st.jitter * 2] : [snap(q[0], st.px), snap(q[1], st.px)]; });
  const top = pts.map(p => [p[0], p[1] - snap(hpx, st.px)]);
  const c = polyC(poly); const faces = [];
  for (let i = 0; i < pts.length; i++) { const a = poly[i], b = poly[(i + 1) % pts.length]; const mx = (a[0] + b[0]) / 2 - c[0], my = (a[1] + b[1]) / 2 - c[1]; if (mx + my <= 0.02) continue; faces.push({i, south:my > mx}); }
  const path = (arr) => { g.beginPath(); arr.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); };
  g.globalAlpha = st.alpha || 1;
  if (st.shadow === 'offset') { g.fillStyle = 'rgba(60,50,40,.18)'; g.save(); g.translate(4, 3); path(pts); g.fill(); g.restore(); }
  else if (st.shadow === 'soft') { g.fillStyle = 'rgba(60,50,40,.14)'; g.save(); g.translate(3, 2); g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(60,50,40,.14)'; path(pts); g.fill(); g.stroke(); g.restore(); }
  else if (!st.lineOnly) { g.fillStyle = 'rgba(40,30,20,.14)'; g.save(); g.translate(3, 2); path(pts); g.fill(); g.restore(); }
  for (const f of faces) {
    const a = pts[f.i], b = pts[(f.i + 1) % pts.length], at = top[f.i], bt = top[(f.i + 1) % pts.length]; const quad = [a, b, bt, at];
    const col = shade(wall, f.south ? st.shade[0] : st.shade[1]);
    if (st.lineOnly) { g.fillStyle = rgba('#000000', .12); path(quad); g.fill(); }
    else { g.fillStyle = col; path(quad); if (st.rounded) { g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = col; g.stroke(); } g.fill(); }
    if (st.dither && f.south) { g.fillStyle = 'rgba(0,0,0,.08)'; const px = st.px || 3; const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]); for (let yy = Math.min(at[1], bt[1]); yy < Math.max(a[1], b[1]); yy += px) for (let xx = x0; xx < x1; xx += px) if (((xx / px + yy / px) | 0) % 2 === 0) g.fillRect(xx, yy, px, px); }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const floors = Math.max(1, levels);
    if (st.accent === 'complex' && !house && info.complexColor) { g.strokeStyle = info.complexColor; g.globalAlpha = .35; g.lineWidth = 1; for (let fl = 1; fl < floors; fl++) { const t = fl / floors; g.beginPath(); g.moveTo(a[0], a[1] - hpx * t); g.lineTo(b[0], b[1] - hpx * t); g.stroke(); } g.globalAlpha = st.alpha || 1; }
    const win = st.win; const ncol = Math.max(1, Math.floor((len - 4) / (win === 'rect' || win === 'frame' ? 9 : 6.5)));
    if (win !== 'none' && len > 7) for (let fl = 0; fl < floors; fl++) { const y0 = -(fl + 0.55) * (hpx / floors); for (let ci = 0; ci < ncol; ci++) { const t = (ci + 0.5) / ncol; const px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t + y0; const lit = hash(ci, fl, 31) < 0.4;
      if (win === 'grid') { g.fillStyle = st.glass; g.fillRect(px - 1.4, py - .9, 2.8, 1.8); }
      else if (win === 'rect') { g.fillStyle = st.glass; g.fillRect(px - 2.2, py - 1.2, 4.4, 2.2); }
      else if (win === 'frame') { g.fillStyle = '#fff'; g.fillRect(px - 2.6, py - 1.8, 5.2, 3.4); g.fillStyle = st.glass; g.fillRect(px - 2, py - 1.3, 4, 2.4); g.strokeStyle = st.outline; g.lineWidth = .5; g.strokeRect(px - 2.6, py - 1.8, 5.2, 3.4); }
      else if (win === 'pixel') { const q = st.px || 3; g.fillStyle = lit ? st.lit : st.glass; g.fillRect(snap(px, q) - q, snap(py, q) - q, q, q); }
      else if (win === 'flat') { g.fillStyle = st.glass; g.fillRect(px - 1.6, py - 1, 3.2, 2); }
      else if (win === 'soft') { g.fillStyle = rgba(st.glass, .55); g.beginPath(); g.arc(px, py, 1.4, 0, 7); g.fill(); }
      else if (win === 'line') { if (ci === 0) { g.strokeStyle = rgba(st.glass, .5); g.lineWidth = .5; g.beginPath(); g.moveTo(a[0], a[1] + y0); g.lineTo(b[0], b[1] + y0); g.stroke(); } }
      else if (win === 'glow') { if (lit || hash(ci, fl, 32) < 0.5) { g.save(); g.shadowColor = st.glass; g.shadowBlur = 5; g.fillStyle = st.glass; g.fillRect(px - 1.4, py - .9, 2.8, 1.8); g.restore(); } else { g.fillStyle = '#2a3147'; g.fillRect(px - 1.4, py - .9, 2.8, 1.8); } }
    } }
    if (st.folds) { g.setLineDash([2, 2]); g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = .7; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(at[0], at[1]); g.stroke(); g.setLineDash([]); }
    if (st.outline) { g.strokeStyle = st.outline; g.lineWidth = st.lw || 1; if (st.sketch) { for (let k = 0; k < 2; k++) { g.beginPath(); quad.forEach((q, i) => { const jx = (hash(i, k, 41) - .5) * 1.6, jy = (hash(i, k, 42) - .5) * 1.6; i ? g.lineTo(q[0] + jx, q[1] + jy) : g.moveTo(q[0] + jx, q[1] + jy); }); g.closePath(); g.stroke(); } } else { path(quad); g.stroke(); } }
  }
  // 지붕
  const tcx = top.reduce((s, q) => s + q[0], 0) / top.length, tcy = top.reduce((s, q) => s + q[1], 0) / top.length;
  if (st.pitched && top.length === 4) { // 박공: 긴 변 방향 용마루
    const d01 = Math.hypot(top[1][0] - top[0][0], top[1][1] - top[0][1]), d12 = Math.hypot(top[2][0] - top[1][0], top[2][1] - top[1][1]); const longFirst = d01 >= d12;
    const m1 = longFirst ? lerp2(top[0], top[3], .5) : lerp2(top[0], top[1], .5), m2 = longFirst ? lerp2(top[1], top[2], .5) : lerp2(top[3], top[2], .5); const rh = Math.max(5, Math.min(14, (longFirst ? d12 : d01) * 0.45));
    const r1 = [m1[0], m1[1] - rh], r2 = [m2[0], m2[1] - rh]; const ov = st.eaves ? 1.5 : 0;
    const slopeA = longFirst ? [top[0], top[1], r2, r1] : [top[0], top[3], r2, r1], slopeB = longFirst ? [top[3], top[2], r2, r1] : [top[1], top[2], r2, r1];
    const sa = polyC(slopeA), sb = polyC(slopeB); const first = sa[1] < sb[1] ? [slopeA, slopeB] : [slopeB, slopeA];
    for (const sl of first) { const south = polyC(sl)[1] > tcy; g.fillStyle = shade(roof, south ? 0.86 : 1.04); g.save(); if (ov) { g.lineJoin = 'round'; g.lineWidth = ov * 2; g.strokeStyle = shade(roof, south ? 0.86 : 1.04); path(sl); g.stroke(); } path(sl); g.fill(); g.restore(); if (st.outline) { g.strokeStyle = st.outline; g.lineWidth = st.lw || 1; path(sl); g.stroke(); } }
    if (st.chimney && house) { g.fillStyle = shade(wall, .9); g.fillRect(r2[0] - 2.5, r2[1] - 1, 4, 6); g.strokeStyle = st.outline; g.strokeRect(r2[0] - 2.5, r2[1] - 1, 4, 6); }
    if (st.outline) { g.strokeStyle = st.outline; g.lineWidth = st.lw || 1; g.beginPath(); g.moveTo(r1[0], r1[1]); g.lineTo(r2[0], r2[1]); g.stroke(); }
  } else {
    if (st.lineOnly) { g.fillStyle = rgba('#000000', .18); path(top); g.fill(); } else { g.fillStyle = house ? roof : (st.aptRoof && st.aptRoof !== 'mix' ? roof : shade(wall, 1.06)); path(top); if (st.rounded) { g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = g.fillStyle; g.stroke(); } g.fill(); }
    if (st.outline) { g.strokeStyle = st.outline; g.lineWidth = st.lw || 1; path(top); g.stroke(); }
    if (house && st.roofInset) { g.fillStyle = shade(roof, 1.14); g.beginPath(); top.forEach((q, i) => { const x = tcx + (q[0] - tcx) * 0.72, y = tcy + (q[1] - tcy) * 0.72; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); }
    if (!house && st.aptRoof === 'mix') { g.strokeStyle = roof; g.lineWidth = 2.2; path(top); g.stroke(); }
    if (st.studs) { g.fillStyle = shade(house ? roof : (st.aptRoof || roof), 1.15); const xs = top.map(q => q[0]), ys = top.map(q => q[1]); for (let yy = Math.min(...ys) + 3; yy < Math.max(...ys) - 2; yy += 4.2) for (let xx = Math.min(...xs) + 3; xx < Math.max(...xs) - 2; xx += 6) { if (!pip(xx, yy, top)) continue; g.beginPath(); g.ellipse(xx, yy, 2, 1.1, 0, 0, 7); g.fill(); } }
    if (st.neon === 'complex' && !house && info.complexColor) { g.save(); g.shadowColor = info.complexColor; g.shadowBlur = 8; g.strokeStyle = info.complexColor; g.lineWidth = 1.4; path(top); g.stroke(); g.restore(); }
    if (st.highlight) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(tcx - 4, tcy - 2, 6, 2.6, -.5, 0, 7); g.fill(); }
    if (!house && levels >= 10 && !st.lineOnly && !st.studs) { g.fillStyle = shade(wall, 0.9); g.fillRect(tcx - 3, tcy - 5, 6, 4); }
  }
  if (st.dims && !house) { const xs = pts.map(q => q[0]); const xr = Math.max(...xs) + 6; const yb = Math.max(...pts.map(q => q[1])); g.strokeStyle = st.outline; g.lineWidth = .7; g.beginPath(); g.moveTo(xr, yb); g.lineTo(xr, yb - hpx); g.moveTo(xr - 2, yb); g.lineTo(xr + 2, yb); g.moveTo(xr - 2, yb - hpx); g.lineTo(xr + 2, yb - hpx); g.stroke(); g.fillStyle = st.outline; g.font = '600 6px ui-monospace,monospace'; g.textAlign = 'left'; g.fillText(`${levels}F · ${Math.round(levels * 2.9)}m`, xr + 3, yb - hpx / 2 + 2); }
  if (info.label && !house && !st.lineOnly) { g.font = '600 6px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; const tw2 = g.measureText(info.label).width + 5; g.fillStyle = st.neon ? 'rgba(20,24,40,.9)' : 'rgba(255,253,246,.92)'; g.beginPath(); g.roundRect(tcx - tw2 / 2, tcy - 10, tw2, 8, 3); g.fill(); g.fillStyle = st.neon ? '#ffd166' : '#4a3b2f'; g.fillText(info.label, tcx, tcy - 4); }
  g.globalAlpha = 1;
}
function tree(g, x, y, s, variant) { // (x,y)=밑동, s=크기
  if (variant === 'none') return;
  if (variant === 'cone') { g.fillStyle = 'rgba(40,30,20,.16)'; g.beginPath(); g.ellipse(x + 1, y + .5, 6 * s, 2.5 * s, 0, 0, 7); g.fill(); g.fillStyle = '#8e7255'; g.fillRect(x - 1.2 * s, y - 5 * s, 2.4 * s, 5 * s); g.fillStyle = '#638d5b'; g.beginPath(); g.moveTo(x, y - 20 * s); g.lineTo(x + 7 * s, y - 5 * s); g.lineTo(x - 7 * s, y - 5 * s); g.closePath(); g.fill(); g.fillStyle = '#83a969'; g.beginPath(); g.moveTo(x, y - 20 * s); g.lineTo(x + 7 * s, y - 5 * s); g.lineTo(x, y - 5 * s); g.closePath(); g.fill(); return; }
  if (variant === 'pixel') { const p = 2; g.fillStyle = '#8a6a4a'; g.fillRect(x - p, y - 4 * p, 2 * p, 4 * p); g.fillStyle = '#4f9a46'; g.fillRect(x - 4 * p, y - 10 * p, 8 * p, 6 * p); g.fillStyle = '#5fa852'; g.fillRect(x - 3 * p, y - 12 * p, 6 * p, 3 * p); g.fillStyle = '#7cc06a'; g.fillRect(x - 2 * p, y - 11 * p, 2 * p, 2 * p); return; }
  if (variant === 'lego') { g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x + 1, y + .5, 6 * s, 2.5 * s, 0, 0, 7); g.fill(); g.fillStyle = '#6f4e37'; g.fillRect(x - 1.5 * s, y - 5 * s, 3 * s, 5 * s); g.fillStyle = '#2d6a4f'; g.fillRect(x - 6 * s, y - 15 * s, 12 * s, 10 * s); g.fillStyle = '#40916c'; g.fillRect(x - 6 * s, y - 15 * s, 12 * s, 3 * s); g.fillStyle = '#52b788'; for (const dx of [-3, 3]) { g.beginPath(); g.ellipse(x + dx * s, y - 15.5 * s, 2 * s, 1 * s, 0, 0, 7); g.fill(); } g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = .8; g.strokeRect(x - 6 * s, y - 15 * s, 12 * s, 10 * s); return; }
  if (variant === 'paper') { g.fillStyle = 'rgba(60,50,40,.16)'; g.beginPath(); g.ellipse(x + 3, y + 2, 6 * s, 2.5 * s, 0, 0, 7); g.fill(); g.fillStyle = '#d9d2c3'; g.fillRect(x - 1.2 * s, y - 6 * s, 2.4 * s, 6 * s); g.fillStyle = '#cfe0b8'; g.beginPath(); g.arc(x, y - 12 * s, 7 * s, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y - 12 * s, 5 * s, 0, 7); g.stroke(); g.strokeStyle = '#b9b1a4'; g.lineWidth = .7; g.beginPath(); g.arc(x, y - 12 * s, 7 * s, 0, 7); g.stroke(); return; }
  if (variant === 'blob') { for (let i = 0; i < 3; i++) { const gr = g.createRadialGradient(x + (i - 1) * 2, y - 11 * s, 1, x + (i - 1) * 2, y - 11 * s, 8 * s); gr.addColorStop(0, 'rgba(95,168,82,.6)'); gr.addColorStop(1, 'rgba(95,168,82,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x + (i - 1) * 2, y - 11 * s, 8 * s, 7 * s, 0, 0, 7); g.fill(); } g.strokeStyle = 'rgba(90,70,50,.5)'; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 7 * s); g.stroke(); return; }
  if (variant === 'line') { g.strokeStyle = '#dbeafe'; g.lineWidth = .7; g.beginPath(); g.arc(x, y - 10 * s, 6 * s, 0, 7); g.moveTo(x, y); g.lineTo(x, y - 4 * s); g.stroke(); return; }
  if (variant === 'dark') { g.fillStyle = '#1e2a3a'; g.beginPath(); g.arc(x, y - 10 * s, 7 * s, 0, 7); g.fill(); g.fillStyle = '#2b3b4f'; g.beginPath(); g.arc(x - 2 * s, y - 12 * s, 4.5 * s, 0, 7); g.fill(); g.fillStyle = '#3a2a20'; g.fillRect(x - 1.2 * s, y - 6 * s, 2.4 * s, 6 * s); return; }
  // round(기본)
  g.fillStyle = 'rgba(40,30,20,.16)'; g.beginPath(); g.ellipse(x + 1.5 * s, y + .5, 7 * s, 3 * s, 0, 0, 7); g.fill(); g.fillStyle = '#8a6a4a'; g.fillRect(x - 1.3 * s, y - 7 * s, 2.6 * s, 7 * s); g.fillStyle = '#4f9a46'; g.beginPath(); g.arc(x, y - 11 * s, 7.5 * s, 0, 7); g.fill(); g.fillStyle = '#5fa852'; g.beginPath(); g.arc(x - 1.6 * s, y - 13 * s, 5.6 * s, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(x - 3 * s, y - 15 * s, 2.2 * s, 0, 7); g.fill(); g.strokeStyle = 'rgba(70,50,30,.38)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y - 11 * s, 7.5 * s, 0.35, Math.PI * 2 - 0.9); g.stroke();
}
function bldScene(g, w, h, st) { // 아파트 1 + 집 2 + 나무 1, 같은 바닥
  const tw = 34, th = 17, zs = 1.3; const P = (x, y, z) => [(x - y) * tw / 2, (x + y) * th / 2 - z * zs];
  const GW = 7, GH = 5; const pts = [P(0, 0, 0), P(GW, 0, 0), P(GW, GH, 0), P(0, GH, 0)]; const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])) - 15 * LH - 14, y1 = Math.max(...pts.map(p => p[1])) + 6;
  const s = Math.min(w / (x1 - x0), h / (y1 - y0)) * 0.96; const ox = (w - (x1 - x0) * s) / 2 - x0 * s, oy = (h - (y1 - y0) * s) / 2 - y0 * s;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.fillStyle = st.bg || '#eef3dc'; g.fillRect(0, 0, w, h); g.setTransform(s, 0, 0, s, ox, oy);
  if (st.base) { g.fillStyle = st.base; g.beginPath(); g.moveTo(pts[3][0], pts[3][1]); g.lineTo(pts[2][0], pts[2][1]); g.lineTo(pts[2][0], pts[2][1] + 6); g.lineTo(pts[3][0], pts[3][1] + 6); g.closePath(); g.fill(); g.fillStyle = shade(st.base, .85); g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.lineTo(pts[2][0], pts[2][1] + 6); g.lineTo(pts[1][0], pts[1][1] + 6); g.closePath(); g.fill(); }
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const a = P(x, y, 0), b = P(x + 1, y, 0), c = P(x + 1, y + 1, 0), d = P(x, y + 1, 0); g.fillStyle = st.ground[(x + y) & 1]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill(); if (st.lineOnly) { g.strokeStyle = 'rgba(219,234,254,.25)'; g.lineWidth = .5; g.stroke(); } if (st.px && hash(x, y, 51) < .3) { g.fillStyle = 'rgba(0,0,0,.06)'; const q = P(x + .5, y + .5, 0); g.fillRect(snap(q[0], 3), snap(q[1], 3), 3, 3); } }
  const items = [
    {poly:[[1.1, 0.6], [2.5, 0.6], [2.5, 4.0], [1.1, 4.0]], levels:15, house:false, label:'101', key:2.5 + 4.0},
    {poly:[[3.6, 1.0], [4.8, 1.0], [4.8, 2.2], [3.6, 2.2]], levels:3, house:true, key:4.8 + 2.2},
    {tree:[3.3, 3.5], key:3.3 + 3.5},
    {poly:[[4.3, 3.0], [6.0, 3.0], [6.0, 4.1], [4.3, 4.1]], levels:2, house:true, alt:true, key:6.0 + 4.1},
  ].sort((a, b) => a.key - b.key);
  for (const it of items) { if (it.tree) { const q = P(it.tree[0], it.tree[1], 0); tree(g, q[0], q[1], 1.1, st.tree); continue; } prism(g, P, it.poly, 0, it.levels, st, {house:it.house, alt:it.alt, label:it.label, complexColor:'#f2a7b8'}); }
  if (st.grain) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(90,70,50,.05)'; for (let i = 0; i < 260; i++) g.fillRect(hash(i, 1, 61) * w, hash(i, 2, 62) * h, 1.2, 1.2); }
}
