// ---------- 목적지 목록 ----------
const ICON = {elem:'🏫', mid:'🏫', high:'🎓', kinder:'🧸', mart:'🛒', conv:'🏪', med:'💊', park:'🌳', play:'🛝', lib:'📚', gym:'🏋️', exit:'🚇', gate:'🚪', station:'🚉'};
const TYPE_KO = {elem:'초등학교', mid:'중학교', high:'고등학교', kinder:'어린이집·유치원', mart:'마트', conv:'편의점', med:'병원·약국', park:'공원', play:'놀이터', lib:'도서관', gym:'체육관', exit:'지하철 출구', gate:'단지 출입구', station:'역'};
const PIN = {elem:'#f0a24b', mid:'#f0a24b', high:'#f0a24b', kinder:'#f78fb3', mart:'#5aa469', conv:'#8fb8a8', med:'#e06b6b', park:'#4f9a46', play:'#f2b84b', lib:'#8aa2c0', gym:'#8aa2c0', exit:'#2f6fcf', gate:'#a86d3a', station:'#2f6fcf'};
const TARGETS = []; // {type, name, x, y, ref, id, complex}
DATA.pois.forEach((p, i) => TARGETS.push({...p, id: 'poi' + i}));
DATA.exits.forEach((e, i) => TARGETS.push({type:'exit', name:`${e.station}역 ${e.ref}번 출구`, x:e.x, y:e.y, id:'exit' + i, station:e.station, ref:e.ref}));
DATA.complexes.forEach(c => (c.gates || []).forEach((gt, i) => TARGETS.push({type:'gate', name:`${c.short} ${gt.name}`, x:gt.x, y:gt.y, id:'gate-' + c.id + '-' + i, complex:c.id})));

// ---------- 경로 (A*, 모드별 비용: 분) — 원본 고도 E 기준(연출 단과 무관) ----------
function slopeFactor(mode, grade) { // grade: % (양수 오르막)
  const up = Math.abs(grade);
  if (grade < 0) return mode === 'bike' ? 0.8 : (mode === 'stroller' ? 1.1 : 1.0);
  if (mode === 'walk') return up < 5 ? 1 : up < 9 ? 1.1 : up < 15 ? 1.4 : 1.6;
  if (mode === 'stroller') return up < 2 ? 1 : up < 5 ? 1.11 : up < 9 ? 1.33 : up < 15 ? 2.0 : Infinity;
  if (mode === 'bike') return up < 2 ? 1 : up < 5 ? 1.18 : up < 9 ? 1.54 : up < 15 ? 2.5 : Infinity;
  return 1;
}
// 계단 판정: steps 플래그가 있으면 계단. 단, 대로(등급 8+) 타일에 겹친 계단(지하도·육교 계단)은 25m 타일 해상도 한계로 대로 보행을 막지 않는다(검수 P1: 굽기에서 계단 33칸 중 24칸이 ROAD로 분류돼 유모차가 통과하던 문제)
const isStairs = (i) => !!ST[i] && !(K[i] === KIND.ROAD && R[i] >= 8);
function tileAllowed(i, mode, goal) {
  const k = K[i];
  if (i === goal) return true;
  if (k === KIND.BLD) return false;
  if (mode === 'car') return k === KIND.ROAD && R[i] >= 4;
  if (k === KIND.SCHOOL || k === KIND.CONST) return false;
  if (isStairs(i) && mode !== 'walk') return false; // 계단: 도보만
  return true;
}
// 차 일방통행: 출발·도착 타일 중 일방통행인 곳의 진행 방향과 이동 벡터(dx,dy)가 반대(내적<0)면 금지. 25m 타일이라 교차로 인접 타일은 관대하게(수직=허용)
function moveAllowed(from, to, mode, dx, dy) {
  if (mode !== 'car' || !OW || !OD) return true;
  const chk = (i) => { if (!OW[i] || OD[i] < 0) return true; const v = DIRV[OD[i]]; return dx * v[0] + dy * v[1] >= 0; };
  return chk(to) && chk(from);
}
function stepCost(from, to, mode, diag) {
  const d = diag ? TILE_M * 1.4142 : TILE_M;
  const dz = E[to] - E[from]; const grade = dz / d * 100;
  const sf = slopeFactor(mode, grade); if (!isFinite(sf)) return Infinity;
  let v = SPEED[mode] * 1000 / 60; // m/min
  let m = d / v * sf;
  const k = K[to];
  if (mode !== 'car') {
    if (k === KIND.GROUND) m *= 1.5;               // 길 없는 땅
    if (k === KIND.ROAD && R[to] >= 8) m *= 1.1;   // 대로변 보행
    if (isStairs(to)) m *= 1.6;                    // 계단(도보)
    if (mode === 'bike' && k === KIND.FOOT) m *= 1.3; // 보도에서는 느리게/끌기
    if (R[to] >= 8 && R[from] < 8) m += mode === 'bike' ? 0.33 : 0.5; // 횡단(대로 진입)
  } else {
    if (R[to] >= 7 && S.clock !== 'day') m *= 2.0; // 러시아워 정체(모델 가정)
    if (R[to] >= 8 && R[from] < 8) m += 0.67;      // 신호
  }
  return m;
}
function astar(sx, sy, gx, gy, mode) {
  const start = idx(sx, sy), goal = idx(gx, gy); // 목표 타일은 tileAllowed(i===goal)로 항상 통행 가능 취급(건물 중심 목표는 startTravel이 nearestWalkable로 미리 옮긴다)
  const gS = new Float64Array(W * H).fill(Infinity), came = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H);
  const hf = mode === 'bike' ? 0.8 : 1; // 자전거 내리막 계수 0.8 하한(허용 휴리스틱)
  const h = (i) => { const x = i % W, y = (i / W) | 0; return Math.hypot(x - gx, y - gy) * TILE_M / (SPEED[mode] * 1000 / 60) * hf; };
  const open = [[h(start), start]]; gS[start] = 0;
  const push = (f, i) => { open.push([f, i]); let c = open.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (open[p][0] <= open[c][0]) break; [open[p], open[c]] = [open[c], open[p]]; c = p; } };
  const pop = () => { const top = open[0]; const last = open.pop(); if (open.length) { open[0] = last; let c = 0; for (;;) { let l = 2 * c + 1, r = l + 1, m = c; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === c) break; [open[m], open[c]] = [open[c], open[m]]; c = m; } } return top; };
  const N = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[1,1,1],[1,-1,1],[-1,1,1],[-1,-1,1]];
  let it = 0;
  while (open.length && it++ < 200000) {
    const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1;
    if (cur === goal) { const path = []; let c = cur; while (c !== -1) { path.push(c); c = came[c]; } return path.reverse(); }
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy, dg] of N) {
      const nx = cx + dx, ny = cy + dy; if (!inb(nx, ny)) continue; const ni = idx(nx, ny); if (closed[ni]) continue;
      if (!tileAllowed(ni, mode, goal)) continue;
      if (ni !== goal && !moveAllowed(cur, ni, mode, dx, dy)) continue; // 차 역주행 금지(목표 진입은 허용)
      if (dg) { if (!tileAllowed(idx(cx + dx, cy), mode, goal) && !tileAllowed(idx(cx, cy + dy), mode, goal)) continue; }
      const c = stepCost(cur, ni, mode, dg); if (!isFinite(c)) continue;
      const t = gS[cur] + c; if (t < gS[ni]) { gS[ni] = t; came[ni] = cur; push(t + h(ni), ni); }
    }
  }
  return null;
}
function routeStats(path, mode) {
  let min = 0, dist = 0, up = 0, cross = 0, stairs = 0, maxGrade = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i]; const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0; const diag = ax !== bx && ay !== by;
    const d = diag ? TILE_M * 1.4142 : TILE_M; dist += d; const dz = E[b] - E[a]; if (dz > 0) up += dz; maxGrade = Math.max(maxGrade, Math.abs(dz / d * 100));
    min += stepCost(a, b, mode, diag);
    if (R[b] >= 8 && R[a] < 8) cross++; if (isStairs(b)) stairs++;
  }
  if (mode === 'car') min += 3; // 주차
  return {min, dist, up, cross, stairs, maxGrade};
}
function nearestWalkable(x, y, mode) {
  let best = null, bd = 1e9;
  const r = 7; for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const i = idx(nx, ny); if (tileAllowed(i, mode, -1) && K[i] !== KIND.BLD) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [nx, ny]; } } }
  return best;
}

// ---------- PixelCrew 크루 명부(crew.js 요약: 색·액세서리·소품·이름). 다음에 이어지는 vendor/pixelcrew_sprites.js 가 self.PixelCrewRoster 를 읽는다 ----------
self.PixelCrewRoster = (() => { const CREW = {
  cyan:{key:'cyan', name:'픽셀', color:'#6ee7ff', accessories:['scarf'], props:['pen']}, purple:{key:'purple', name:'글리치', color:'#c084fc', accessories:['monocle'], props:['magnifier']},
  green:{key:'green', name:'바이트', color:'#4ade80', accessories:[], props:['notebook']}, pink:{key:'pink', name:'루마', color:'#f472b6', accessories:[], props:[]},
  orange:{key:'orange', name:'비트', color:'#ffa94d', accessories:['helmet'], props:[]}, red:{key:'red', name:'그리드', color:'#ff8787', accessories:['helmet'], props:['clipboard']},
  yellow:{key:'yellow', name:'복셀', color:'#ffd43b', accessories:['helmet'], props:['wrench']}, lime:{key:'lime', name:'휴', color:'#a9e34b', accessories:[], props:[]},
  blue:{key:'blue', name:'닷', color:'#74c0fc', accessories:['bigeye'], props:['book']} }; return Object.freeze({CREW, CREW_KEYS:Object.keys(CREW), getCrew:(k) => CREW[k] || CREW.cyan}); })();
