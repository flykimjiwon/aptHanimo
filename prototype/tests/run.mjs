#!/usr/bin/env node
// 임장월드 프로토 — 경로 규칙 단위 테스트 + 셀 데이터 무결성 검증기 (의존성 0, node ≥ 18)
// 실행: node prototype/tests/run.mjs            (골든값과 비교)
//       node prototype/tests/run.mjs --update   (현재 데이터로 골든값 갱신 — 의도한 변경일 때만)
// 브라우저 없이 src/02_world.js + src/04_route.js 를 vm 샌드박스에 그대로 올려 실제 코드를 검사한다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const UPDATE = process.argv.includes('--update');
const goldenPath = path.join(here, 'golden.json');
const data = fs.readFileSync(path.join(root, 'data', 'cell_data.json'), 'utf8');
const src = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');

// ---- 샌드박스: 브라우저 전역 최소 스텁 ----
const sandbox = {
  console, Math, JSON, Date, Set, Map, Object, Array, String, Number, Boolean, Error, Infinity, NaN, isFinite, isNaN, parseInt, parseFloat,
  Float32Array, Float64Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array,
  performance: { now: () => Date.now() },
  document: { getElementById: (id) => (id === 'cell' ? { textContent: data } : null) },
  location: { hash: '', reload() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {},
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const run = (code, name) => new vm.Script(code, { filename: name }).runInContext(sandbox);
run(src('02_world.js'), '02_world.js');
run(src('04_route.js'), '04_route.js');
const X = run('({slopeFactor, stepCost, tileAllowed, isStairs, moveAllowed: typeof moveAllowed === "function" ? moveAllowed : null, astar, routeStats, nearestWalkable, TARGETS, DATA, W, H, K, R, ST, E, KIND, SPEED, S, CHECKLISTS, CONCEPTS, idx, TILE_M, STYLE})', 'exports');
const { W, H, K, R, ST, E, KIND, DATA, TARGETS, idx } = X;

// ---- 작은 테스트 러너 ----
let pass = 0, fail = 0; const fails = [];
const ok = (cond, name, detail) => { if (cond) pass++; else { fail++; fails.push(name + (detail ? ' — ' + detail : '')); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const section = (t) => console.log('\n## ' + t);

// ======================================================================
section('1. 경사 계수 slopeFactor (고정 입력)');
const sf = X.slopeFactor;
ok(sf('walk', 0) === 1 && sf('walk', 6) === 1.1 && sf('walk', 12) === 1.4 && sf('walk', 20) === 1.6, '도보 계수표');
ok(sf('stroller', 1) === 1 && sf('stroller', 3) === 1.11 && sf('stroller', 7) === 1.33 && sf('stroller', 12) === 2.0 && sf('stroller', 16) === Infinity, '유모차 계수표(≥15% 불가)');
ok(sf('bike', 1) === 1 && sf('bike', 3) === 1.18 && sf('bike', 7) === 1.54 && sf('bike', 12) === 2.5 && sf('bike', 16) === Infinity, '자전거 계수표(≥15% 불가)');
ok(sf('bike', -5) === 0.8 && sf('stroller', -5) === 1.1 && sf('walk', -5) === 1.0, '내리막: 자전거 0.8·유모차 1.1·도보 1.0');
ok(sf('car', 20) === 1 && sf('car', -20) === 1, '차는 경사 무관');

// ======================================================================
section('2. 이동 비용 stepCost 성질');
{
  // 평지·같은 높이·같은 종류의 인접 도로 타일 쌍을 찾아 공식과 대조
  let found = 0, formulaOk = 0, carFlat = 0, carFlatOk = 0;
  for (let y = 0; y < H && found < 200; y++) for (let x = 0; x + 1 < W && found < 200; x++) {
    const a = idx(x, y), b = idx(x + 1, y);
    if (K[a] !== KIND.ROAD || K[b] !== KIND.ROAD || R[a] < 8 || R[b] < 8) continue; // 대로→대로(횡단 가산 없음)
    if (E[a] !== E[b]) continue;
    found++;
    const expWalk = X.TILE_M / (X.SPEED.walk * 1000 / 60) * 1.1; // 대로변 보행 ×1.1
    if (near(X.stepCost(a, b, 'walk', false), expWalk, 1e-9)) formulaOk++;
    carFlat++;
    X.S.clock = 'day';
    const c = X.stepCost(a, b, 'car', false);
    if (near(c, X.TILE_M / (X.SPEED.car * 1000 / 60), 1e-9)) carFlatOk++;
  }
  ok(found > 0 && formulaOk === found, '평지 대로 도보 = 거리/속도 ×1.1', `${formulaOk}/${found}`);
  ok(carFlat > 0 && carFlatOk === carFlat, '낮 평지 대로 차 = 거리/속도', `${carFlatOk}/${carFlat}`);
  X.S.clock = 'am';
  // 비차량은 어떤 타일에서도 nominal(거리/속도×경사계수)보다 빠를 수 없다(가산은 ≥1). 자전거 내리막 0.8은 경사계수에 포함.
  let viol = 0, n = 0;
  for (let i = 0; i < W * H; i += 7) { const x = i % W, y = (i / W) | 0; if (x + 1 >= W) continue; const j = i + 1; if (K[i] === KIND.BLD || K[j] === KIND.BLD) continue;
    for (const m of ['walk', 'stroller', 'bike']) { const g = (E[j] - E[i]) / X.TILE_M * 100; const s = sf(m, g); if (!isFinite(s)) continue; const nominal = X.TILE_M / (X.SPEED[m] * 1000 / 60) * s; const c = X.stepCost(i, j, m, false); n++; if (c < nominal - 1e-9) viol++; } }
  ok(n > 0 && viol === 0, '비차량 비용 ≥ 거리/속도×경사계수', `위반 ${viol}/${n}`);
}

// ======================================================================
section('3. 계단 판정 isStairs · 통행 tileAllowed');
{
  const stairs = [], roadBig = [], stepsRoadSmall = [];
  for (let i = 0; i < W * H; i++) { if (!ST[i]) continue; if (X.isStairs(i)) stairs.push(i); else roadBig.push(i); if (K[i] === KIND.ROAD && R[i] < 8) stepsRoadSmall.push(i); }
  console.log(`   steps 플래그 ${stairs.length + roadBig.length}칸 → 계단 ${stairs.length} · 대로 겹침 예외 ${roadBig.length} (그중 ROAD<8 등급 ${stepsRoadSmall.length}칸은 v6까지 유모차가 통과했음)`);
  ok(stairs.length > 0 && roadBig.length <= 8, '대로 겹침 예외는 소수(≤8)', `${roadBig.length}`);
  ok(stairs.every(i => !X.tileAllowed(i, 'stroller', -1) && !X.tileAllowed(i, 'bike', -1)), '계단은 유모차·자전거 불가');
  ok(stairs.filter(i => K[i] !== KIND.BLD && K[i] !== KIND.SCHOOL && K[i] !== KIND.CONST).every(i => X.tileAllowed(i, 'walk', -1)), '계단은 도보 가능');
  ok(roadBig.every(i => X.tileAllowed(i, 'car', -1) === (K[i] === KIND.ROAD && R[i] >= 4)), '대로 겹침 계단은 차 통행 규칙 그대로');
  let bld = 0, bldOk = 0; for (let i = 0; i < W * H; i++) if (K[i] === KIND.BLD) { bld++; if (!X.tileAllowed(i, 'walk', -1) && !X.tileAllowed(i, 'car', -1)) bldOk++; }
  ok(bld > 0 && bld === bldOk, '건물 타일은 전 수단 불가(목표 제외)', `${bldOk}/${bld}`);
  ok(X.tileAllowed(idx(0, 0), 'car', idx(0, 0)) === true, '목표 타일은 항상 통행 가능 취급');
}

// ======================================================================
section('4. 기준 구간 골든값 (computeMetrics와 같은 규칙)');
const metrics = {};
{
  const nearestFromCenter = (c, type) => TARGETS.filter(t => t.type === type).map(t => ({ t, d: Math.hypot(t.x - c.x, t.y - c.y) })).sort((a, b) => a.d - b.d)[0];
  for (const c of DATA.complexes) {
    const gate = (c.gates || [])[0]; if (!gate) { metrics[c.id] = { noGate: true }; continue; }
    const gx = Math.floor(gate.x), gy = Math.floor(gate.y); const g0 = X.nearestWalkable(gx, gy, 'walk') || [gx, gy];
    const exitsOf = (st) => TARGETS.filter(t => t.type === 'exit' && (!st || t.station === st)).map(t => ({ t, d: Math.hypot(t.x - gate.x, t.y - gate.y) })).sort((a, b) => a.d - b.d)[0];
    const ex = exitsOf(c.spawn_station) || exitsOf(null);
    const runTo = (t, mode, toGate) => { if (!t) return null; const goal = X.nearestWalkable(Math.floor(t.t.x), Math.floor(t.t.y), mode); if (!goal) return null; const p = toGate ? X.astar(goal[0], goal[1], g0[0], g0[1], mode) : X.astar(g0[0], g0[1], goal[0], goal[1], mode); return p ? { ...X.routeStats(p, mode), path: p } : null; };
    const fmt = (s) => s ? { min: Math.round(s.min), dist: Math.round(s.dist), up: Math.round(s.up), cross: s.cross, stairs: s.stairs } : null;
    const el = nearestFromCenter(c, 'elem'), ma = nearestFromCenter(c, 'mart'), me = nearestFromCenter(c, 'med');
    const wex = runTo(ex, 'walk', true), sex = runTo(ex, 'stroller', true), cex = runTo(ex, 'car', true);
    metrics[c.id] = { exit: ex ? ex.t.name : null, exitWalk: fmt(wex), exitStroller: fmt(sex), exitCar: fmt(cex), elem: el ? el.t.name : null, elemWalk: fmt(runTo(el, 'walk')), mart: ma ? ma.t.name : null, martWalk: fmt(runTo(ma, 'walk')), med: me ? me.t.name : null, medWalk: fmt(runTo(me, 'walk')) };
    // 불변식: 유모차 경로는 계단을 밟지 않는다 / 차 경로는 도로 4등급+만(목표 제외)
    if (sex) ok(sex.path.slice(0, -1).every(i => !X.isStairs(i)), `${c.id} 유모차 경로에 계단 없음`);
    if (cex) ok(cex.path.slice(0, -1).every(i => K[i] === KIND.ROAD && R[i] >= 4), `${c.id} 차 경로는 도로 4등급+`);
    ok(!!wex && !!sex, `${c.id} 출구→정문 도보·유모차 경로 존재`);
    if (X.moveAllowed) ok(!!cex, `${c.id} 출구→정문 차 경로 존재(일방통행 적용 후)`);
  }
  console.log('   ' + JSON.stringify(metrics).slice(0, 600) + '…');
  let golden = null; try { golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8')); } catch (e) {}
  if (UPDATE || !golden) { fs.writeFileSync(goldenPath, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), metrics }, null, 1)); console.log('   golden.json ' + (golden ? '갱신' : '생성')); }
  else {
    for (const id of Object.keys(golden.metrics)) {
      const a = golden.metrics[id], b = metrics[id];
      for (const k of Object.keys(a)) ok(JSON.stringify(a[k]) === JSON.stringify(b && b[k]), `골든 ${id}.${k}`, `${JSON.stringify(a[k])} → ${JSON.stringify(b && b[k])}`);
    }
  }
}

// ======================================================================
section('5. 셀 데이터 무결성');
{
  const CARD_CATS = new Set(['school', 'traffic', 'parking', 'slope', 'construction', 'regulation', 'commerce', 'community']);
  const CLS = new Set(['official', 'estimate', 'review', 'unknown', 'concept']);
  const GRADES = new Set(['A', 'A-est', 'B', 'C', 'X', 'unknown', 'F']);
  ok(DATA.meta.W === W && DATA.meta.H === H && K.length === W * H && E.length === W * H && ST.length === W * H && R.length === W * H, '배열 길이 = W×H');
  if (DATA.odir) ok(DATA.odir.length === W * H, 'odir 길이 = W×H');
  for (const c of DATA.complexes) {
    ok((c.gates || []).length >= 1, `${c.id} 게이트 ≥1`);
    ok((c.facts || []).length >= 5 && (c.cards || []).length >= 1, `${c.id} facts·cards 존재`);
    for (const g of c.gates || []) ok(!!X.nearestWalkable(Math.floor(g.x), Math.floor(g.y), 'walk'), `${c.id} 게이트 ${g.name} 보행 도달 가능`);
    for (const f of c.facts || []) ok(CLS.has(f.cls), `${c.id} fact cls '${f.cls}' ∈ CSS 집합`, f.k);
    for (const cd of c.cards || []) { ok(CARD_CATS.has(cd.cat), `${c.id} 카드 ${cd.id} cat '${cd.cat}' 획득 경로 있음`); ok(GRADES.has(cd.grade), `${c.id} 카드 ${cd.id} grade '${cd.grade}'`); }
    ok(TARGETS.some(t => t.type === 'exit' && t.station === c.spawn_station), `${c.id} spawn_station '${c.spawn_station}' 출구 존재`);
  }
  // complexes.json(손입력 정본) ↔ cell_data.json(구운 결과) 동기
  try {
    const srcC = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'complexes.json'), 'utf8'));
    const list = Array.isArray(srcC) ? srcC : srcC.complexes;
    for (const sc of list) { const bc = DATA.complexes.find(c => c.id === sc.id); ok(!!bc, `complexes.json ${sc.id} 가 cell_data에 있음`); if (!bc) continue; ok(JSON.stringify(sc.cards) === JSON.stringify(bc.cards), `${sc.id} cards 동기(재굽기 필요 여부)`); ok(JSON.stringify(sc.facts) === JSON.stringify(bc.facts), `${sc.id} facts 동기`); }
  } catch (e) { ok(false, 'complexes.json 읽기', e.message); }
  const kinds = {}; for (const k of K) kinds[k] = (kinds[k] || 0) + 1;
  console.log('   kinds', JSON.stringify(kinds), '| buildings', DATA.buildings.length, '| exits', DATA.exits.length, '| pois', DATA.pois.length, '| oneway', (DATA.oneway || []).filter(Boolean).length, '| odir', DATA.odir ? DATA.odir.filter(v => v >= 0).length : 'n/a');
}

// ======================================================================
section('6. 일방통행(odir) 규칙');
if (X.moveAllowed && DATA.odir) {
  const OD = DATA.odir, OW = DATA.oneway; const DIRV = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  let checked = 0, bad = 0;
  for (let i = 0; i < W * H; i++) { if (!OW[i] || OD[i] < 0) continue; const v = DIRV[OD[i]]; const x = i % W, y = (i / W) | 0; const nx = x - v[0], ny = y - v[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = idx(nx, ny); checked++; if (X.moveAllowed(i, j, 'car', -v[0], -v[1])) bad++; /* 역주행 */ const fromOpposed = OW[j] && OD[j] >= 0 && (DIRV[OD[j]][0] * v[0] + DIRV[OD[j]][1] * v[1]) < 0; if (!fromOpposed && !X.moveAllowed(j, i, 'car', v[0], v[1])) bad++; /* 순방향(출발 타일이 반대 방향 일방통행이면 제외) */ if (!X.moveAllowed(i, j, 'walk', -v[0], -v[1])) bad++; /* 보행 무관 */ }
  ok(checked > 0 && bad === 0, '역주행 차단·순방향 허용·보행 무관', `${bad} 위반 / ${checked}`);
} else console.log('   (odir 없음 — 재굽기 전 데이터, 건너뜀)');

// ======================================================================
console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
for (const f of fails) console.log('  ✗ ' + f);
process.exit(fail ? 1 : 0);
