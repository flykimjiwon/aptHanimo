// ---------- 호환: roundRect 폴리필(Safari 16.4 미만·구형 WebView에서 buildStatic이 첫 프레임 전에 죽던 문제, 검수 P0) ----------
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) { CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { if (Array.isArray(r)) r = r.length ? r[0] : 0; if (typeof r === 'object' && r) r = r.x || 0; r = Math.max(0, Math.min(+r || 0, Math.abs(w) / 2, Math.abs(h) / 2)); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); }; }
// ---------- 데이터·상수 ----------
const DATA = JSON.parse(document.getElementById('cell').textContent);
const W = DATA.meta.W, H = DATA.meta.H, TILE_M = DATA.meta.tile_m;
const E = DATA.elev, K = DATA.kind, R = DATA.rcls, LN = DATA.lanes, CR = DATA.cross, ST = DATA.steps;
const OW = DATA.oneway || null, OD = DATA.odir || null; // 일방통행 플래그·진행 방향 코드(0=동·2=남·4=서·6=북, 홀수=대각). odir은 v8 굽기부터 — 없으면 차 역주행 검사 생략
const DIRV = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const idx = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const TW = 32, TH = 16, ZS = 1.6, LH = 2.4;      // 타일 px, 고도 px/m, 층당 px
const KIND = {GROUND:0, ROAD:1, FOOT:2, STEPS:3, BLD:4, PARK:5, SCHOOL:6, CONST:7};
// ---------- 스타일 선택(스타일 랩 '선택 조합 복사' 값). char: 'pixelcrew'(v3 도트 유령) | 'villager'(v4 동숲풍 주민) · bld: 'cottage' · world: 'terrace'(8m 단 지형) | 'sketch'(연필 스케치) | 'watermap'(수채 지도, 탑뷰) ----------
// 기본값은 STYLE_DEFAULT. 주소 해시로 덮어쓸 수 있다: #villager-watermap 처럼 캐릭터·월드 id를 '-'로 이어 붙인다(아티팩트 링크 끝에도 가능). 서랍 단지 탭의 그림체 선택기가 같은 일을 한다
const STYLE_DEFAULT = {char:'pixelcrew', bld:'cottage', world:'sketch'};
const STYLE_IDS = {char:['pixelcrew', 'villager'], world:['terrace', 'sketch', 'watermap']};
const STYLE = (() => { const s = Object.assign({}, STYLE_DEFAULT); try { for (const tok of String(location.hash || '').slice(1).split('-')) { if (STYLE_IDS.char.includes(tok)) s.char = tok; if (STYLE_IDS.world.includes(tok)) s.world = tok; } } catch (e) {} return s; })();
try { self.__style = STYLE; window.addEventListener('hashchange', () => location.reload()); } catch (e) {} // 해시가 바뀌면 새 그림체로 다시 굽는다
const SK = STYLE.world === 'sketch';
const TOP = STYLE.world === 'watermap'; // 탑뷰(수채 지도): 투영·입력·정적 레이어가 바뀐다. 경로·수치는 그대로
const TT = 28; // 탑뷰 타일 px
const SPEED = {walk:4.0, stroller:3.2, bike:12, car:22}; // km/h (모델 가정)
const MODE_KO = {walk:'도보', stroller:'유모차', bike:'자전거', car:'차'};
const LINE_COLOR = {'1':'#0052A4','2':'#00A84D','3':'#EF7C1C','4':'#00A5DE','5':'#996CAC','6':'#CD7C2F','경의중앙':'#77C4A3','수인분당':'#F5A200'};
const CONCEPTS = {
  solo:   {name:'1인 임장',  mode:'walk',     w:{traffic:35, school:0,  conv:20, env:25, park:5,  safe:15}},
  couple: {name:'커플 임장', mode:'walk',     w:{traffic:30, school:10, conv:25, env:20, park:10, safe:5}},
  family: {name:'가족 임장', mode:'stroller', w:{traffic:20, school:30, conv:15, env:20, park:10, safe:5}},
};
const CHECKLISTS = {
  solo:[{id:'gate',l:'역 출구에서 단지 정문까지 걸어가기',c:{arrive:'gate'}},{id:'conv',l:'가장 가까운 편의점·마트 가보기',c:{poi:['conv','mart']}},{id:'night',l:'밤 모드로 단지 앞 길 보기(연출, 가로등 데이터 없음)',c:{night:true}},{id:'commute',l:'출근 레그 돌려보기',c:{commute:true}},{id:'interior',l:'단지 내부(주차장·커뮤니티) 열어보기',c:{interior:true}}],
  couple:[{id:'gate',l:'역 출구에서 단지 정문까지 걸어가기',c:{arrive:'gate'}},{id:'park',l:'공원·놀이터 가보기',c:{poi:['park','play']}},{id:'car',l:'차 모드로 정문(주차장) 진입',c:{arrive:'gate',mode:'car'}},{id:'commute',l:'두 직장 출근 레그 비교',c:{commute2:true}},{id:'interior',l:'단지 내부 열어보기',c:{interior:true}}],
  family:[{id:'gateS',l:'유모차로 역 출구→정문 가보기(계단 우회)',c:{arrive:'gate',mode:'stroller'}},{id:'elem',l:'유모차로 초등학교 정문까지(횡단 횟수 세기)',c:{poi:['elem'],mode:'stroller'}},{id:'play',l:'놀이터·공원 가보기',c:{poi:['play','park']}},{id:'med',l:'소아과·약국 가보기',c:{poi:['med']}},{id:'mart',l:'마트 가보기',c:{poi:['mart']}},{id:'car',l:'차 모드로 지하주차장 진입',c:{arrive:'gate',mode:'car'}}],
};
// 지하철 역 그래프(손입력, 역 순서 기준 추정: 역간 2분 + 환승 5분)
const LINES = {
  '2':['시청','을지로입구','을지로3가','을지로4가','동대문역사문화공원','신당','상왕십리','왕십리','한양대','뚝섬','성수','건대입구','구의','강변','잠실나루','잠실','잠실새내','종합운동장','삼성','선릉','역삼','강남','교대','서초','방배','사당','낙성대','서울대입구','봉천','신림','신대방','구로디지털단지','대림','신도림','문래','영등포구청','당산','합정','홍대입구','신촌','이대','아현','충정로','시청'],
  '5':['마곡','발산','우장산','화곡','까치산','신정','목동','오목교','양평','영등포구청','영등포시장','신길','여의도','여의나루','마포','공덕','애오개','충정로','서대문','광화문','종로3가','을지로4가','동대문역사문화공원','청구','신금호','행당','왕십리','마장','답십리','장한평','군자'],
  '6':['디지털미디어시티','월드컵경기장','마포구청','망원','합정','상수','광흥창','대흥','공덕','효창공원앞','삼각지','녹사평','이태원','한강진','버티고개','약수','청구','신당','동묘앞','창신','보문','안암','고려대','월곡','상월곡','돌곶이','석계','태릉입구','화랑대','봉화산','신내'],
};
const HUBS = ['강남','삼성','시청','광화문','여의도','성수','구로디지털단지','디지털미디어시티','마곡','홍대입구','잠실','왕십리'];

// ---------- 상태 ----------
const S = {concept:null, mode:'walk', complex:null, px:0, py:0, face:1, night:false, clock:'am', zoom:1, camX:0, camY:0, follow:true,
  traveling:null, visited:new Set(), cardsSeen:new Set(), done:new Set(), events:[], lastInterstitial:0, commuteDone:0, interior:false, metrics:{}, routeLog:[], npcs:[]};
try { self.__S = S; } catch (e) {} // 자동 검증용 읽기 전용 참조
// 저장 v2: 체크 키에 컨셉 포함(concept:complex:item). v1(컨셉 없는 키)은 읽지 않는다
try { const sv = JSON.parse(localStorage.getItem('imjang-proto-v2') || 'null'); if (sv && sv.done) { S.done = new Set(sv.done); S.cardsSeen = new Set(sv.cardsSeen||[]); S.routeLog = sv.routeLog||[]; } } catch(e){}
const save = () => { try { localStorage.setItem('imjang-proto-v2', JSON.stringify({done:[...S.done], cardsSeen:[...S.cardsSeen], routeLog:S.routeLog.slice(-30)})); } catch(e){} };

// ---------- 결정적 해시 ----------
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- 렌더 지형: 계단식 언덕(연출). 경로 계산은 원본 고도 E 그대로 ----------
const TIER = 8; // m 단위 단(段). 실제 고도를 8m 단으로 양자화해 그린다(동물의숲식 절벽·경사로)
const TIERZ = new Float32Array(W * H);
{
  const Es = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (inb(x + dx, y + dy)) { s += E[idx(x + dx, y + dy)]; n++; } } Es[idx(x, y)] = s / n; }
  for (let i = 0; i < W * H; i++) TIERZ[i] = Math.round(Es[i] / TIER) * TIER;
  for (let pass = 0; pass < 2; pass++) { // 3×3 최빈값 필터: 외딴 단 조각 제거
    const T2 = new Float32Array(TIERZ);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const cnt = new Map(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!inb(x + dx, y + dy)) continue; const v = TIERZ[idx(x + dx, y + dy)]; cnt.set(v, (cnt.get(v) || 0) + (dx === 0 && dy === 0 ? 2 : 1)); } let best = TIERZ[idx(x, y)], bc = -1; for (const [v, c] of cnt) if (c > bc) { bc = c; best = v; } T2[idx(x, y)] = best; }
    TIERZ.set(T2);
  }
}
// 건물: 작은 창고 제거·꼭짓점 정리·단지 패드(건물 아래 타일은 같은 단)
const polyArea = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
const pip = (x, y, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const BLDS = DATA.buildings.filter(b => b.complex || b.levels >= 8 || polyArea(b.poly) >= 0.1).map(b => {
  const p = []; for (const v of b.poly) { const q = p[p.length - 1]; if (!q || Math.hypot(v[0] - q[0], v[1] - q[1]) > 0.18) p.push(v); }
  if (p.length > 3 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 0.18) p.pop();
  const xs = p.map(v => v[0]), ys = p.map(v => v[1]);
  return {...b, poly:p.length >= 3 ? p : b.poly, minx:Math.min(...xs), maxx:Math.max(...xs), miny:Math.min(...ys), maxy:Math.max(...ys)};
});
const PAD = new Int16Array(W * H).fill(-1); // 타일 → 건물 인덱스
BLDS.forEach((b, bi) => { const ci = idx(Math.min(W - 1, Math.max(0, b.cx | 0)), Math.min(H - 1, Math.max(0, b.cy | 0))); b.tier = TIERZ[ci];
  for (let y = Math.max(0, b.miny | 0); y <= Math.min(H - 1, b.maxy | 0); y++) for (let x = Math.max(0, b.minx | 0); x <= Math.min(W - 1, b.maxx | 0); x++) if (pip(x + 0.5, y + 0.5, b.poly)) { PAD[idx(x, y)] = bi; TIERZ[idx(x, y)] = b.tier; } });
// 모서리 높이 [NW, NE, SE, SW] — 기본은 단 높이, 길 타일은 낮은 쪽이 경사로로 올라붙음
const CZ = new Float32Array(W * H * 4);
for (let i = 0; i < W * H; i++) { CZ[i * 4] = CZ[i * 4 + 1] = CZ[i * 4 + 2] = CZ[i * 4 + 3] = TIERZ[i]; }
const isWay = (i) => K[i] === KIND.ROAD || K[i] === KIND.FOOT || K[i] === KIND.STEPS;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); if (!isWay(i)) continue;
  const side = [[0, -1, 0, 1], [1, 0, 1, 2], [0, 1, 2, 3], [-1, 0, 3, 0]]; // dx, dy, corner a, corner b
  for (const [dx, dy, a, b] of side) { if (!inb(x + dx, y + dy)) continue; const n = idx(x + dx, y + dy); if (!isWay(n)) continue; if (TIERZ[n] > TIERZ[i]) { CZ[i * 4 + a] = TIERZ[n]; CZ[i * 4 + b] = TIERZ[n]; } }
}
const cz = (i, k) => CZ[i * 4 + k];
const zCenter = (i) => (CZ[i * 4] + CZ[i * 4 + 1] + CZ[i * 4 + 2] + CZ[i * 4 + 3]) / 4;
function surfZ(fx, fy) { // 렌더 표면 높이(모서리 이중선형)
  const x = Math.min(W - 1, Math.max(0, Math.floor(fx))), y = Math.min(H - 1, Math.max(0, Math.floor(fy))); const i = idx(x, y); const u = Math.min(1, Math.max(0, fx - x)), v = Math.min(1, Math.max(0, fy - y));
  return (1 - u) * (1 - v) * CZ[i * 4] + u * (1 - v) * CZ[i * 4 + 1] + u * v * CZ[i * 4 + 2] + (1 - u) * v * CZ[i * 4 + 3];
}
const zAt = (x, y) => inb(x, y) ? zCenter(idx(x, y)) : 20;

// ---------- 투영 ----------
function proj(x, y, z) { return TOP ? [x * TT, y * TT] : [ (x - y) * TW / 2, (x + y) * TH / 2 - z * ZS ]; } // 탑뷰는 고도를 무시(절벽·높이 없음)
let maxZ = 0; for (let i = 0; i < W * H; i++) if (TIERZ[i] > maxZ) maxZ = TIERZ[i];
const WX0 = TOP ? -40 : -(H) * TW / 2 - 40, WX1 = TOP ? W * TT + 40 : W * TW / 2 + 40, WY0 = TOP ? -60 : -maxZ * ZS - 36 * LH - 60, WY1 = TOP ? H * TT + 40 : (W + H) * TH / 2 + 40;

// ---------- 팔레트(월드) ----------
const C = {
  ground:['#a9d57c','#9fcd72'], park:['#95c96a','#8bc262'], school:['#efdfae','#e8d6a0'], constr:['#d9cfae','#d2c7a3'], pad:['#b6d98c','#add286'],
  road:{9:'#b4b9c3',8:'#b9bec7',7:'#c3c7cf',5:'#d4d0c6',4:'#dbd6c9'}, foot:'#eadcb5', steps:'#d8c9a5', curb:'rgba(70,60,40,.22)',
  cliff:'#c99a6b', cliff2:'#b4875b', lip:'#7ab45a', trunk:'#8a6a4a', tree:['#5fa852','#4f9a46'], tree2:['#7cc06a','#6ab45a'], leafHi:'rgba(255,255,255,.22)',
  outline:'rgba(70,50,30,.38)', glass:'#a7c3d2', glassNight:'#ffd98a', shadow:'rgba(40,30,20,.16)', base:'#bf9c78', base2:'#a98a6a', ink:'rgba(70,50,30,.5)', grid:null, paper:'#d9efe3', paper2:'#f6dfc4',
  wallNew:'#f7f1e6', wallMid:'#efe6d6', wallOld:'#e3d9c8', roofs:['#d9856a','#7fb3a8','#a3b06b','#8aa2c0','#d8b04e','#c98fa6'], houseWalls:['#fbf3e4','#f6e8d4','#faf0c8','#e9f1dc','#efe6f3'],
  aptAccent:['#9fb08a','#8fa7c4','#b99aa8','#c9ad86','#8fb8a8'],
};
// 연필 스케치 월드: 종이 팔레트(스타일 랩 sketch cfg.pal). 길은 잉크 두 줄, 절벽 해칭, 타일 격자선, 번짐 나무, 종이 결
if (SK) Object.assign(C, {ground:['#eef0e2','#e9ecdc'], park:['#dde8c8','#d6e2c0'], school:['#f3eedd','#eee8d4'], constr:['#efe9d8','#e9e3d2'], pad:['#f1efe4','#ece9dc'], road:{9:'#e6e4da',8:'#e6e4da',7:'#ebe9df',5:'#ebe9df',4:'#ebe9df'}, foot:'#f0ead8', steps:'#ece6d4', curb:'rgba(90,70,50,.18)', cliff:'#e4dcc8', cliff2:'#d8cfb8', lip:'rgba(90,70,50,.6)', base:'#e4dcc8', base2:'#d8cfb8', trunk:'#8a7a60', tree:['#7fb46a','#6da35c'], tree2:['#95c47c','#83b56c'], leafHi:'rgba(255,255,255,.3)', outline:'rgba(90,70,50,.55)', shadow:'rgba(60,50,40,.12)', ink:'rgba(90,70,50,.6)', grid:'rgba(90,70,50,.06)', paper:'#f6f1e3', paper2:'#f3e9d6'});
// 수채 지도(탑뷰): 종이 위 번진 블롭 색(스타일 랩 water 모드)
if (TOP) Object.assign(C, {ground:['#cfe0b4','#cfe0b4'], park:['#9ccf86','#9ccf86'], school:['#efe0b8','#efe0b8'], constr:['#e6dcc4','#e6dcc4'], pad:['#cfe0b4','#cfe0b4'], outline:'rgba(90,70,50,.55)', shadow:'rgba(60,50,40,.14)', ink:'rgba(120,90,60,.6)', paper:'#f7f1e3', paper2:'#f4e9d8'});
const rgbaOf = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const shade = (hex, f) => { const n = parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=Math.min(255,Math.max(0,Math.round(r*f))); g=Math.min(255,Math.max(0,Math.round(g*f))); b=Math.min(255,Math.max(0,Math.round(b*f))); return `rgb(${r},${g},${b})`; };
const mix = (h1, h2, t) => { const a = parseInt(h1.slice(1),16), b = parseInt(h2.slice(1),16); const r = Math.round(((a>>16)&255)*(1-t)+((b>>16)&255)*t), g = Math.round(((a>>8)&255)*(1-t)+((b>>8)&255)*t), c = Math.round((a&255)*(1-t)+(b&255)*t); return `rgb(${r},${g},${c})`; };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------- 소품 계획(나무·꽃): 공원·단지 조경·빈 땅 ----------
const CPOLY = DATA.complexes.filter(c => c.poly).map(c => ({id:c.id, poly:c.poly}));
const PROPS = []; // {key, x, y, kind, size, var}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); const k = K[i]; if (k !== KIND.GROUND && k !== KIND.PARK && k !== KIND.CONST && k !== KIND.SCHOOL) continue; if (PAD[i] >= 0) continue;
  const h = hash(x, y, 1); const inC = CPOLY.some(c => pip(x + 0.5, y + 0.5, c.poly));
  let tree = false, flower = false, size = 0.8 + hash(x, y, 2) * 0.5;
  if (k === KIND.PARK) { tree = h < 0.5; flower = !tree && h < 0.8; }
  else if (inC) { tree = h < 0.42; flower = !tree && h < 0.75; size *= 0.9; }
  else if (k === KIND.SCHOOL) { tree = h < 0.12 && (x + y) % 2 === 0; }
  else if (k === KIND.CONST) { tree = h < 0.18; size *= 0.75; }
  else { tree = h < 0.11; flower = !tree && h < 0.16; }
  if (tree) PROPS.push({key:x + y, x:x + 0.3 + hash(x, y, 3) * 0.4, y:y + 0.3 + hash(x, y, 4) * 0.4, kind:'tree', size, var:hash(x, y, 5) < 0.5 ? 0 : 1});
  else if (flower) PROPS.push({key:x + y, x:x + 0.5, y:y + 0.5, kind:'flower', size:1, var:(hash(x, y, 6) * 3) | 0});
}
