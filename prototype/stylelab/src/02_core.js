// ---------- 데이터·공통 ----------
const CROP = JSON.parse(document.getElementById('crop').textContent);
const CW = CROP.W, CH = CROP.H; const E = CROP.elev, K = CROP.kind, R = CROP.rcls, LN = CROP.lanes, CR = CROP.cross, ST = CROP.steps;
const KIND = {GROUND:0, ROAD:1, FOOT:2, STEPS:3, BLD:4, PARK:5, SCHOOL:6, CONST:7};
const idx = (x, y) => y * CW + x; const inb = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH;
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(hex, f) { const c = (typeof hex === 'string' && hex[0] === '#') ? hexRgb(hex) : (hex.match && hex.match(/\d+/g) || [128,128,128]).map(Number); return `rgb(${clamp(Math.round(c[0] * f), 0, 255)},${clamp(Math.round(c[1] * f), 0, 255)},${clamp(Math.round(c[2] * f), 0, 255)})`; }
function mix(h1, h2, t) { const a = hexRgb(h1), b = hexRgb(h2); return `rgb(${Math.round(a[0] * (1 - t) + b[0] * t)},${Math.round(a[1] * (1 - t) + b[1] * t)},${Math.round(a[2] * (1 - t) + b[2] * t)})`; }
function rgba(hex, a) { const c = hexRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
if (!CanvasRenderingContext2D.prototype.roundRect) { CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r || 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); }; }
const isWay = (i) => K[i] === KIND.ROAD || K[i] === KIND.FOOT || K[i] === KIND.STEPS;
const polyC = (poly) => { let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; } return [x / poly.length, y / poly.length]; };
const pip = (x, y, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };

// ---------- 지형: 단(段) 배열·모서리 높이 ----------
function tierArray(q) { // q=0 → 평활 고도 그대로, q>0 → q m 단으로 양자화 + 3×3 최빈값
  const Es = new Float32Array(CW * CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) { s += E[idx(x + dx, y + dy)]; n++; } Es[idx(x, y)] = s / n; }
  if (!q) return Es;
  let T = Float32Array.from(Es, v => Math.round(v / q) * q);
  for (let pass = 0; pass < 2; pass++) { const T2 = new Float32Array(T); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const cnt = new Map(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!inb(x + dx, y + dy)) continue; const v = T[idx(x + dx, y + dy)]; cnt.set(v, (cnt.get(v) || 0) + (dx === 0 && dy === 0 ? 2 : 1)); } let best = T[idx(x, y)], bc = -1; for (const [v, c] of cnt) if (c > bc) { bc = c; best = v; } T2[idx(x, y)] = best; } T = T2; }
  return T;
}
function terrain(q) { // {T, CZ(i,k), zc(i), surf(fx,fy)} + 건물 패드 평탄화 + 길 경사로
  const T = tierArray(q); const pad = new Int16Array(CW * CH).fill(-1);
  CROP.buildings.forEach((b, bi) => { const ci = idx(clamp(b.cx | 0, 0, CW - 1), clamp(b.cy | 0, 0, CH - 1)); b.tier = T[ci]; const xs = b.poly.map(p => p[0]), ys = b.poly.map(p => p[1]); for (let y = Math.max(0, Math.min(...ys) | 0); y <= Math.min(CH - 1, Math.max(...ys) | 0); y++) for (let x = Math.max(0, Math.min(...xs) | 0); x <= Math.min(CW - 1, Math.max(...xs) | 0); x++) if (pip(x + 0.5, y + 0.5, b.poly)) { pad[idx(x, y)] = bi; T[idx(x, y)] = b.tier; } });
  const CZ = new Float32Array(CW * CH * 4); for (let i = 0; i < CW * CH; i++) CZ[i * 4] = CZ[i * 4 + 1] = CZ[i * 4 + 2] = CZ[i * 4 + 3] = T[i];
  if (q) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = idx(x, y); if (!isWay(i)) continue; for (const [dx, dy, a, b] of [[0, -1, 0, 1], [1, 0, 1, 2], [0, 1, 2, 3], [-1, 0, 3, 0]]) { if (!inb(x + dx, y + dy)) continue; const n = idx(x + dx, y + dy); if (!isWay(n)) continue; if (T[n] > T[i]) { CZ[i * 4 + a] = T[n]; CZ[i * 4 + b] = T[n]; } } }
  const cz = (i, k) => CZ[i * 4 + k]; const zc = (i) => (CZ[i * 4] + CZ[i * 4 + 1] + CZ[i * 4 + 2] + CZ[i * 4 + 3]) / 4;
  const surf = (fx, fy) => { const x = clamp(Math.floor(fx), 0, CW - 1), y = clamp(Math.floor(fy), 0, CH - 1); const i = idx(x, y); const u = clamp(fx - x, 0, 1), v = clamp(fy - y, 0, 1); return (1 - u) * (1 - v) * CZ[i * 4] + u * (1 - v) * CZ[i * 4 + 1] + u * v * CZ[i * 4 + 2] + (1 - u) * v * CZ[i * 4 + 3]; };
  return {T, cz, zc, surf, pad};
}

// ---------- 투영·맞춤 ----------
function isoFit(w, h, tw, th, zs, zmin, zmax, hpad) { // 격자 전체가 캔버스에 들어가도록 스케일·오프셋
  const P = (x, y, z) => [(x - y) * tw / 2, (x + y) * th / 2 - z * zs];
  const pts = [P(0, 0, zmax), P(CW, 0, zmax), P(CW, CH, zmin), P(0, CH, zmin), P(0, 0, zmin), P(CW, CH, zmax)];
  const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])) - (hpad || 0), y1 = Math.max(...pts.map(p => p[1]));
  const s = Math.min(w / (x1 - x0), h / (y1 - y0)) * 0.97; const ox = (w - (x1 - x0) * s) / 2 - x0 * s, oy = (h - (y1 - y0) * s) / 2 - y0 * s;
  return {P, s, ox, oy, apply:(g) => g.setTransform(s, 0, 0, s, ox, oy)};
}

// ---------- 소품 계획(나무) ----------
const TREES = []; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = idx(x, y); const k = K[i]; if (k !== KIND.GROUND && k !== KIND.PARK) continue; const h = hash(x, y, 1); if ((k === KIND.PARK && h < 0.5) || (k === KIND.GROUND && h < 0.16)) TREES.push({x:x + 0.3 + hash(x, y, 3) * 0.4, y:y + 0.3 + hash(x, y, 4) * 0.4, size:0.8 + hash(x, y, 2) * 0.5, key:x + y}); }

// ---------- 보행 경로(조합 미리보기용): 길 타일 BFS ----------
function roadPath() {
  const near = (tx, ty) => { let best = -1, bd = 1e9; for (let i = 0; i < CW * CH; i++) if (K[i] === KIND.ROAD && R[i] <= 7) { const d = Math.hypot(i % CW - tx, (i / CW | 0) - ty); if (d < bd) { bd = d; best = i; } } return best; };
  const a = near(3, 9), b = near(20, 7); if (a < 0 || b < 0) return [[2.5, 8.5], [20.5, 8.5]];
  const prev = new Int32Array(CW * CH).fill(-1); const q = [a]; prev[a] = a;
  while (q.length) { const c = q.shift(); if (c === b) break; const cx = c % CW, cy = c / CW | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = cx + dx, ny = cy + dy; if (!inb(nx, ny)) continue; const n = idx(nx, ny); if (prev[n] >= 0 || !isWay(n)) continue; prev[n] = c; q.push(n); } }
  if (prev[b] < 0) return [[a % CW + 0.5, (a / CW | 0) + 0.5], [b % CW + 0.5, (b / CW | 0) + 0.5]];
  const path = []; let c = b; while (c !== a) { path.push([c % CW + 0.5, (c / CW | 0) + 0.5]); c = prev[c]; } path.push([a % CW + 0.5, (a / CW | 0) + 0.5]); return path.reverse();
}
const PATH = roadPath();
function pathPos(t, speed) { // 왕복, t 초 → [x, y, face]
  const segs = []; let L = 0; for (let i = 1; i < PATH.length; i++) { const d = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); segs.push([L, d]); L += d; }
  if (!L) return [PATH[0][0], PATH[0][1], 1];
  const cyc = (t * speed) % (2 * L); const fwd = cyc < L; const u = fwd ? cyc : 2 * L - cyc;
  for (let i = 0; i < segs.length; i++) { const [s0, d] = segs[i]; if (u <= s0 + d || i === segs.length - 1) { const f = d ? clamp((u - s0) / d, 0, 1) : 0; const a = PATH[i], b = PATH[i + 1]; const dx = (b[0] - a[0]) * (fwd ? 1 : -1), dy = (b[1] - a[1]) * (fwd ? 1 : -1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (dx - dy) >= 0 ? 1 : -1]; } }
  return [PATH[0][0], PATH[0][1], 1];
}

// ---------- PixelCrew 명부(크루 9종, 색·액세서리·소품·이름) — 다음 vendor 스프라이트가 읽는다 ----------
self.PixelCrewRoster = (() => { const CREW = {
  cyan:{key:'cyan', name:'픽셀', color:'#6ee7ff', accessories:['scarf'], props:['pen']}, purple:{key:'purple', name:'글리치', color:'#c084fc', accessories:['monocle'], props:['magnifier']},
  green:{key:'green', name:'바이트', color:'#4ade80', accessories:[], props:['notebook']}, pink:{key:'pink', name:'루마', color:'#f472b6', accessories:[], props:[]},
  orange:{key:'orange', name:'비트', color:'#ffa94d', accessories:['helmet'], props:[]}, red:{key:'red', name:'그리드', color:'#ff8787', accessories:['helmet'], props:['clipboard']},
  yellow:{key:'yellow', name:'복셀', color:'#ffd43b', accessories:['helmet'], props:['wrench']}, lime:{key:'lime', name:'휴', color:'#a9e34b', accessories:[], props:[]},
  blue:{key:'blue', name:'닷', color:'#74c0fc', accessories:['bigeye'], props:['book']} }; return Object.freeze({CREW, CREW_KEYS:Object.keys(CREW), getCrew:(k) => CREW[k] || CREW.cyan}); })();
