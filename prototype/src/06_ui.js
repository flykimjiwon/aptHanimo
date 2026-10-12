// ---------- 서랍 ----------
function renderDrawer() {
  const c = cur(); const body = $('#drawerBody'); if ($('#drawer').classList.contains('hidden')) return;
  if (tab === 'info') {
    body.innerHTML = `<h3 style="margin:0 0 4px;font-family:var(--display);font-weight:400;font-size:21px">${esc(c.name)}</h3><div class="muted small">${esc(c.address)}</div>
      <dl class="kv" style="margin:10px 0">${(c.facts || []).map(f => `<dt>${esc(f.k)}</dt><dd>${badge(f.cls)}${esc(f.v)}${f.note ? ` <span class="muted">(${esc(f.note)})</span>` : ''}<div class="muted" style="font-size:11px">출처: ${esc(f.src)}</div></dd>`).join('')}</dl>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="small" id="btnInterior">🏢 단지 내부 열기</button><button class="small" id="btnCommute">🚇 출근 레그</button><button class="small" id="btnSwitch">🔁 다른 단지로</button></div>
      <div class="legend"><span><i style="background:#c99a6b"></i>절벽=8m 단(연출)</span><span><i style="background:#b4b9c3"></i>대로</span><span><i style="background:#d4d0c6"></i>골목</span><span><i style="background:#eadcb5"></i>보도</span><span><i style="background:#5fa852;border-radius:50%"></i>나무(배치 연출)</span></div>
      <p class="small muted" style="margin-top:6px">${TOP ? '수채 지도(탑뷰)는 고도·절벽을 그리지 않지만' : '언덕은 실제 고도(SRTM)를 8m 단으로 양자화해 절벽·경사로로 그렸고,'} 경로 시간은 원본 고도로 계산합니다. 주민 캐릭터는 연출이며 실제 이용자가 아닙니다. 정정 신청 폼은 이 프로토에 없습니다(실서비스는 카드마다 24시간 내 비노출).</p>
      <p class="small muted" style="margin-top:4px">${OD ? '차 경로는 OSM 일방통행 방향을 따릅니다(추정). ' : ''}지도 데이터 © OpenStreetMap contributors(ODbL) · 고도 OpenTopoData SRTM 30m · 단지 사실은 네이버부동산·호갱노노 수동 열람 요약(출처 등급 표기).</p>
      <div class="small muted" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">그림체 <select id="selChar">${[['pixelcrew', '픽셀크루 도트 유령'], ['villager', '동숲 주민']].map(([v, l]) => `<option value="${v}"${STYLE.char === v ? ' selected' : ''}>${l}</option>`).join('')}</select> × 코티지 × <select id="selWorld">${[['terrace', '8m 단 지형'], ['sketch', '연필 스케치'], ['watermap', '수채 지도(탑뷰)']].map(([v, l]) => `<option value="${v}"${STYLE.world === v ? ' selected' : ''}>${l}</option>`).join('')}</select> <button class="small" id="btnStyle">적용</button><span>주소 끝에 #캐릭터-월드(예 #villager-watermap)를 붙여도 돼요</span></div>`;
    $('#btnStyle').onclick = () => { const h = `${$('#selChar').value}-${$('#selWorld').value}`; try { if (location.hash.slice(1) !== h) { location.hash = h; } else location.reload(); } catch (e) { toast('새로고침이 막혀 있어요. 주소 끝에 #' + h + ' 를 붙여 다시 열어 주세요.'); } };
    $('#btnInterior').onclick = openInterior; $('#btnCommute').onclick = openCommute; $('#btnSwitch').onclick = () => openComplexPicker(true);
  } else if (tab === 'check') {
    const list = CHECKLISTS[S.concept] || [];
    body.innerHTML = `<div class="small muted" style="margin-bottom:6px">${CONCEPTS[S.concept].name} · ${c.short} · 항목은 해당 위치에 실제로 가야 체크됩니다</div><ul class="check">${list.map(it => `<li class="${S.done.has(checkKey(c.id, it.id)) ? 'done' : ''}"><span class="box"></span><span>${esc(it.l)}</span></li>`).join('')}</ul>`;
  } else if (tab === 'cards') {
    body.innerHTML = `<div class="small muted">등급: A 공식 · A-est 계산 추정 · B 준사실 · C 체감(월드 비렌더링) · X/미확인 · 개념=F. 흐린 카드는 아직 월드에서 만나지 못한 카드.</div>` + (c.cards || []).map(cd => `<div class="card" style="${S.cardsSeen.has(cd.id) ? '' : 'opacity:.6'}"><h4><span class="badge g-${esc(cd.grade)}">${esc(gradeLabel(cd.grade))}</span>${esc(cd.title)}</h4><p>${esc(cd.text)}</p>${cd.counter ? `<p><b>반론·해명:</b> ${esc(cd.counter)}</p>` : ''}<p class="src">출처: ${esc(cd.src)}${cd.date && !String(cd.src).includes(cd.date) ? ' · ' + esc(cd.date) : ''}</p></div>`).join('') + `<p class="small muted">이 정보는 공공데이터·뉴스·온라인 커뮤니티 언급을 요약한 것이며 사실 확인이 필요합니다.</p>`;
  } else if (tab === 'dest') {
    const near = TARGETS.map(t => ({...t, d:Math.hypot(t.x - c.x, t.y - c.y) * TILE_M})).filter(t => t.type !== 'conv' || t.d < 400).filter(t => t.type !== 'play' || t.d < 500).sort((a, b) => a.d - b.d);
    const groups = [['gate','단지 출입구'],['exit','지하철 출구'],['elem','초등학교'],['mid','중·고등학교'],['high',''],['mart','마트'],['conv','편의점'],['med','병원·약국'],['kinder','어린이집·유치원'],['park','공원'],['play','놀이터'],['lib','도서관·체육관'],['gym','']];
    let html = `<div class="small muted">단지 중심 기준 직선거리. 탭하면 현재 수단(${MODE_KO[S.mode]})으로 이동합니다.</div>`;
    for (const [ty, label] of groups) { const items = near.filter(t => t.type === ty).slice(0, ty === 'exit' ? 10 : 6); if (!items.length) continue; if (label) html += `<h4 style="margin:10px 0 2px;font-size:13px">${label}</h4>`; html += `<div class="poi-list">${items.map(t => `<button data-id="${esc(t.id)}">${ICON[t.type]} ${esc(t.name)} <span class="muted small">${Math.round(t.d)}m</span></button>`).join('')}</div>`; }
    body.innerHTML = html;
    body.querySelectorAll('button[data-id]').forEach(b => b.onclick = () => { const t = TARGETS.find(x => x.id === b.dataset.id); if (window.innerWidth < 900) { $('#drawer').classList.add('hidden'); syncDrawer(); } startTravel(Math.floor(t.x), Math.floor(t.y), t); });
  } else if (tab === 'cmp') {
    body.innerHTML = renderCompare();
  }
}
function renderCompare() {
  const rows = [['역 출구→정문 도보', m => m.exit && m.exit.walk ? `${esc(m.exit.name)}: ${fmtMin(m.exit.walk.min)} / ${Math.round(m.exit.walk.dist)}m ↑${Math.round(m.exit.walk.up)}m` : '—'], ['역 출구→정문 유모차', m => m.exit ? (m.exit.stroller ? `${fmtMin(m.exit.stroller.min)} · 횡단 ${m.exit.stroller.cross}` : '경로 없음(계단·경사)') : '—'], ['가까운 초등 도보', m => m.elem && m.elem.walk ? `${esc(m.elem.name)} ${fmtMin(m.elem.walk.min)} · 횡단 ${m.elem.walk.cross}` : '—'], ['가까운 마트 도보', m => m.mart && m.mart.walk ? `${esc(m.mart.name)} ${fmtMin(m.mart.walk.min)}` : '—'], ['병원·약국 도보', m => m.med && m.med.walk ? `${esc(m.med.name)} ${fmtMin(m.med.walk.min)}` : '—'], ['세대당 주차', m => esc(m.parking)], ['준공', m => esc(m.year)], ['세대·동', m => esc(m.hh)]];
  return `<div class="small muted" style="margin-bottom:6px">세 단지를 같은 규칙(도보 4km/h, 경사·횡단·계단 가중, 정문 기준)으로 자동 계산한 값. 전부 '추정'. 역·초등·마트는 직선거리 기준 가장 가까운 곳.</div><div class="tblwrap"><table class="cmp"><tr><th></th>${DATA.complexes.map(c => `<th style="color:${esc(c.color)};filter:saturate(1.6) brightness(.7)">${esc(c.short)}</th>`).join('')}</tr>${rows.map(([l, f]) => `<tr><th>${l}</th>${DATA.complexes.map(c => `<td>${f(S.metrics[c.id] || {})}</td>`).join('')}</tr>`).join('')}</table></div>`;
}
function computeMetrics() {
  for (const c of DATA.complexes) {
    const facts = c.facts || []; const gate = (c.gates || [])[0];
    if (!gate) { S.metrics[c.id] = {exit:null, elem:null, mart:null, med:null, parking:'?', year:'?', hh:'?'}; continue; } // 게이트 좌표가 아직 없는 단지(셀 추가 중)
    const gx = Math.floor(gate.x), gy = Math.floor(gate.y); const g0 = nearestWalkable(gx, gy, 'walk') || [gx, gy];
    const nearest = (type) => TARGETS.filter(t => t.type === type).map(t => ({t, d:Math.hypot(t.x - c.x, t.y - c.y)})).sort((a, b) => a.d - b.d)[0];
    const run = (t, mode, toGate) => { if (!t) return null; const goal = nearestWalkable(Math.floor(t.t.x), Math.floor(t.t.y), mode); if (!goal) return null; const p = toGate ? astar(goal[0], goal[1], g0[0], g0[1], mode) : astar(g0[0], g0[1], goal[0], goal[1], mode); return p ? routeStats(p, mode) : null; };
    const exitsOf = (st) => TARGETS.filter(t => t.type === 'exit' && (!st || t.station === st)).map(t => ({t, d:Math.hypot(t.x - gate.x, t.y - gate.y)})).sort((a, b) => a.d - b.d)[0];
    const ex = exitsOf(c.spawn_station) || exitsOf(null); // 출근 레그 제목(spawn_station)과 같은 역의 출구를 우선
    const el = nearest('elem'), ma = nearest('mart'), me = nearest('med');
    S.metrics[c.id] = {exit: ex ? {name:ex.t.name, walk:run(ex, 'walk', true), stroller:run(ex, 'stroller', true)} : null, elem: el ? {name:el.t.name, walk:run(el, 'walk')} : null, mart: ma ? {name:ma.t.name, walk:run(ma, 'walk')} : null, med: me ? {name:me.t.name, walk:run(me, 'walk')} : null,
      parking:(facts.find(f => f.k === '주차') || {v:'?'}).v.replace(/.*세대당\s*([0-9.]+)대.*/, '$1대'), year:(facts.find(f => f.k === '사용승인') || {v:'?'}).v.slice(0, 7), hh:(facts.find(f => f.k === '세대수') || {v:'?'}).v.split(' ')[0] + ' · ' + ((facts.find(f => f.k === '동수·층수') || {v:'?'}).v.split(' ')[0])};
  }
}
function scoreFor(cid, concept) {
  const m = S.metrics[cid] || {}; const w = CONCEPTS[concept].w; const cl = (v) => Math.max(0, Math.min(100, v));
  const exitMin = m.exit && m.exit.walk ? m.exit.walk.min : 15; const elemMin = m.elem && m.elem.walk ? m.elem.walk.min : 15; const elemCross = m.elem && m.elem.walk ? m.elem.walk.cross : 2; const martMin = m.mart && m.mart.walk ? m.mart.walk.min : 15; const up = m.exit && m.exit.walk ? m.exit.walk.up : 20;
  const parking = parseFloat(m.parking) || 1; const year = parseInt(m.year) || 2010;
  const s = {traffic:cl(100 - (exitMin - 5) * 8), school:cl(100 - (elemMin - 5) * 7 - elemCross * 6), conv:cl(100 - (martMin - 5) * 6), env:cl(70 + (year - 2010) * 1.5 - up * 0.6), park:cl(40 + (parking - 0.8) * 100), safe:50};
  let total = 0; for (const k in w) total += s[k] * w[k] / 100; return {s, total:Math.round(total)};
}
function openNote() {
  const c = cur(); const sc = scoreFor(c.id, S.concept); const m = S.metrics[c.id] || {}; const list = CHECKLISTS[S.concept] || []; const done = list.filter(it => S.done.has(checkKey(c.id, it.id)));
  const seen = (c.cards || []).filter(cd => S.cardsSeen.has(cd.id)); const logs = S.routeLog.filter(r => r.complex === c.id).filter((r, i, a) => a.findIndex(q => q.mode === r.mode && q.target === r.target && q.min === r.min) === i).slice(-8);
  const txt = [`# 임장 노트 · ${c.name} (${CONCEPTS[S.concept].name})`, `생성 ${new Date().toISOString().slice(0, 10)} · 임장월드 프로토(데이터 기반 추정, 현장 확인 필요)`, '', `## 점수(추정) ${sc.total}/100 — 교통 ${Math.round(sc.s.traffic)} · 학군 ${Math.round(sc.s.school)} · 편의 ${Math.round(sc.s.conv)} · 환경 ${Math.round(sc.s.env)} · 주차 ${Math.round(sc.s.park)} · 치안 ${sc.s.safe}(데이터 없음)`, '', '## 걸어 본 경로', ...(logs.length ? logs.map(r => `- ${MODE_KO[r.mode]} → ${r.target}: ${r.min}분 · ${r.dist}m · ↑${r.up}m · 횡단 ${r.cross} · 계단 ${r.stairs} · 최대경사 ${r.maxGrade}%`) : ['- (아직 없음)']), '', '## 기준 구간 자동 계산', ...(m.exit ? [`- 역 출구(${m.exit.name}) 도보 ${m.exit.walk ? fmtMin(m.exit.walk.min) : '—'} / 유모차 ${m.exit.stroller ? fmtMin(m.exit.stroller.min) : '경로 없음'}`] : []), ...(m.elem ? [`- 초등(${m.elem.name}) 도보 ${m.elem.walk ? fmtMin(m.elem.walk.min) + ' · 횡단 ' + m.elem.walk.cross : '—'} (배정 여부는 별도 확인)`] : []), ...(m.mart ? [`- 마트(${m.mart.name}) 도보 ${m.mart.walk ? fmtMin(m.mart.walk.min) : '—'}`] : []), '', `## 체크리스트 ${done.length}/${list.length}`, ...list.map(it => `- [${S.done.has(checkKey(c.id, it.id)) ? 'x' : ' '}] ${it.l}`), '', `## 확인한 이슈 카드 ${seen.length}/${(c.cards || []).length}`, ...seen.map(cd => `- [${cd.grade}] ${cd.title} (출처: ${cd.src})`), '', '## 실제 임장에서 확인할 것', '- 출구 엘리베이터 유무(유모차)', '- 배정 초등학교·통학로 횡단보도', '- 커뮤니티 시설 운영·요금(이 프로토는 개념 재현)', '- 지하주차장 동 직결 여부', ...(c.id === 'LACERVO' ? ['- 전체 준공·이전고시·등기 현황(2026-08 기준 지연, 구청·시의회 주장 엇갈림)'] : []), '', '출처: OSM(ODbL)·OpenTopoData SRTM·네이버부동산·호갱노노(수동 열람 요약)·뉴스. 이 노트는 온라인 자료 요약이며 사실 확인이 필요합니다.'].join('\n');
  showModal(`<h2>임장 노트</h2><p class="small muted">복사해서 메모앱·카톡에 붙여 넣으세요. 점수는 모델 가정의 추정치입니다.</p><textarea class="note" id="noteTxt">${esc(txt)}</textarea><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="primary" id="copyNote">복사</button><button id="cmpBtn">세 단지 비교 보기</button><button id="closeNote">닫기</button></div><div class="small muted" id="copyMsg" style="margin-top:6px"></div>`);
  $('#copyNote').onclick = () => { const ta = $('#noteTxt'); const done = () => $('#copyMsg').textContent = '복사됨'; const fail = () => { ta.focus(); ta.select(); $('#copyMsg').textContent = '자동 복사가 막혀 텍스트를 선택했어요. 길게 눌러 복사하세요.'; }; try { navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(ta.value).then(done, fail) : fail(); } catch (e) { fail(); } };
  $('#cmpBtn').onclick = () => { closeModal(); openTab('cmp'); }; $('#closeNote').onclick = closeModal;
}
function openInterior() {
  const c = cur(); const facts = c.facts || []; const am = c.amenities || {known:[], note:'커뮤니티 시설 자료 없음'}; const parking = (facts.find(f => f.k === '주차') || {v:'주차 자료 없음'}).v; const ratio = parseFloat((parking.match(/세대당\s*([0-9.]+)/) || [0, 1])[1]) || 1;
  S.events.push({interior:true}); evalChecklist();
  showModal(`<h2>${esc(c.short)} 내부</h2><p class="small muted">실내 재현 3단계: <span class="badge g-A">실제 기반</span> 공개 도면·권한 있음 / <span class="badge g-F">개념 재현</span> 존재만 확인 / <span class="badge g-X">미확인</span> 자료 없음</p>
    <h3>🅿️ 지하주차장 <span class="badge g-A">실제 기반(수치)</span></h3><p>${esc(parking)}. 체감: <b>${ratio >= 1.2 ? '여유' : ratio >= 1.0 ? '보통' : '부족(이중주차 가능성)'}</b>. 동 엘리베이터 직결 여부 <span class="badge g-X">미확인</span>. 차로 도착하면 진입·주차 +3분을 더합니다.</p>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:8px 0">${Array.from({length:12}, (_, i) => `<div style="height:26px;border-radius:6px;background:${i < Math.round(12 * Math.min(1, 1 / ratio)) ? 'var(--line2)' : 'var(--paper2)'};border:1.5px dashed var(--line2);display:flex;align-items:center;justify-content:center;font-size:12px">${i < Math.round(12 * Math.min(1, 1 / ratio)) ? '🚗' : ''}</div>`).join('')}</div><p class="small muted">주차면 12칸 모형: 세대당 ${ratio}대 기준으로 찬 칸 비율만 표현(실제 배치 아님).</p>
    <h3>🏊 커뮤니티 <span class="badge g-F">개념 재현</span></h3><p>${(am.known || []).length ? '확인된 것: ' + esc(am.known.join(', ')) + '. ' : ''}${esc(am.note)}. 운영·요금·이용 자격은 자료 없음 → 닫힌 문으로 표시합니다.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;margin:8px 0">${['헬스장','독서실','키즈카페','골프연습장','게스트하우스','카페'].map(n => `<div class="card" style="margin:0;text-align:center;opacity:.6">🚪 ${n}<br><span class="small muted">내부 정보 준비 중</span></div>`).join('')}</div>
    <h3>🛗 엘리베이터·복도 <span class="badge g-A">공식</span></h3><p>${esc((facts.find(f => f.k === '구조·난방' || f.k === '난방·시공') || {v:'계단식 여부 미확인'}).v)}</p>
    <button id="closeInt" class="primary">닫기</button>`);
  $('#closeInt').onclick = closeModal;
}
// 출근 레그
function buildGraph() { const adj = {}; const add = (a, b, w) => { (adj[a] = adj[a] || []).push([b, w]); (adj[b] = adj[b] || []).push([a, w]); }; for (const L in LINES) { const arr = LINES[L]; for (let i = 0; i + 1 < arr.length; i++) add(L + ':' + arr[i], L + ':' + arr[i + 1], 2); } const byName = {}; for (const L in LINES) for (const s of LINES[L]) (byName[s] = byName[s] || new Set()).add(L); for (const s in byName) { const ls = [...byName[s]]; for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) add(ls[i] + ':' + s, ls[j] + ':' + s, 5); } return {adj, byName}; }
const GRAPH = buildGraph();
function transit(from, to) { const {adj, byName} = GRAPH; if (!byName[from] || !byName[to]) return null; const dist = {}, prev = {}; const pq = [];[...byName[from]].forEach(L => { dist[L + ':' + from] = 0; pq.push([0, L + ':' + from]); }); while (pq.length) { pq.sort((a, b) => a[0] - b[0]); const [d, u] = pq.shift(); if (d > dist[u]) continue; for (const [v, w] of adj[u] || []) { const nd = d + w; if (nd < (dist[v] ?? Infinity)) { dist[v] = nd; prev[v] = u; pq.push([nd, v]); } } } let best = null; for (const L of byName[to]) { const k = L + ':' + to; if (dist[k] != null && (!best || dist[k] < dist[best])) best = k; } if (!best) return null; const path = []; let c = best; while (c) { path.push(c); c = prev[c]; } path.reverse(); const stations = path.length - 1; let transfers = 0; for (let i = 1; i < path.length; i++) if (path[i].split(':')[0] !== path[i - 1].split(':')[0]) transfers++; return {min:dist[best], path, stations:stations - transfers, transfers}; }
function openCommute() {
  const c = cur(); const st = c.spawn_station; const m = S.metrics[c.id]; const walk = m && m.exit && m.exit.walk ? m.exit.walk.min : 8;
  const sel = (id) => `<select id="${id}" style="font:14px var(--body);padding:6px;border-radius:10px;border:1.5px solid var(--line2);background:var(--paper);color:var(--fg)">${HUBS.map(h => `<option ${h === (id === 'hub2' ? '광화문' : '강남') ? 'selected' : ''}>${h}</option>`).join('')}</select>`;
  showModal(`<h2>출근 레그 · ${st}역 출발</h2><p class="small muted">정문→역 도보(월드 계산) + 역간 2분·환승 5분(손입력 그래프, 2·5·6호선) + 도착 도보 5분. 실제 시간표·급행·혼잡 미반영 → 전부 '추정'.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">직장 ${sel('hub1')} ${S.concept === 'couple' ? '배우자 직장 ' + sel('hub2') : ''}<button class="primary small" id="runCommute">계산</button></div><div id="commuteOut" style="margin-top:10px"></div><button id="closeCm" class="small" style="margin-top:8px">닫기</button>`);
  const run = () => { const hubs = [$('#hub1').value, S.concept === 'couple' ? $('#hub2').value : null].filter(Boolean); let html = ''; const mins = []; for (const h of hubs) { const r = transit(st, h); if (!r) { html += `<p>${h}: 경로 없음(그래프 범위 밖)</p>`; continue; } const total = walk + r.min + 5; mins.push(total); const lineHtml = r.path.map(p => p.split(':')).map(([L, s], i, arr) => (i === 0 || arr[i - 1][0] !== L) ? `<span style="background:${LINE_COLOR[L] || '#888'}">${L}</span>` : '').join(''); html += `<div class="card"><h4>${st} → ${h}: 약 <b>${Math.round(total)}분</b> <span class="badge g-A-est">추정</span></h4><p>도보 ${Math.round(walk)}분 + 지하철 ${r.stations}역 ${r.stations * 2}분 + 환승 ${r.transfers}회 ${r.transfers * 5}분 + 도착 도보 5분</p><p class="lines">${lineHtml} ${r.path.filter((p, i, a) => i === 0 || i === a.length - 1 || p.split(':')[0] !== a[i - 1].split(':')[0]).map(p => p.split(':')[1]).join(' → ')}</p></div>`; } if (hubs.length === 2 && mins.length === 2) { const diff = Math.abs(mins[0] - mins[1]); html += `<p><b>커플 비교:</b> 합 ${Math.round(mins[0] + mins[1])}분 · 차이 ${Math.round(diff)}분 ${diff >= 20 ? '→ 🃏 "한쪽 희생" 카드' : '→ 균형'}</p>`; S.events.push({commute2:true}); } $('#commuteOut').innerHTML = html; S.events.push({commute:true}); S.commuteDone++; evalChecklist(); };
  $('#runCommute').onclick = run; $('#closeCm').onclick = closeModal; run();
}
function showModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); const f = $('#modalBox').querySelector('button, select, textarea, input, a[href]'); if (f) setTimeout(() => { try { f.focus({preventScroll:true}); } catch (e) {} }, 0); }
function closeModal() { $('#modal').classList.add('hidden'); }
const modalDismissable = () => !$('#modal').classList.contains('hidden') && !!S.concept && !!S.complex; // 시작 선택 모달은 닫을 수 없다
$('#modal').addEventListener('click', (e) => { if (e.target === $('#modal') && modalDismissable()) closeModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalDismissable()) { e.preventDefault(); closeModal(); } });

// ---------- 시작 플로우 ----------
function openConceptPicker() {
  const PC = STYLE.char === 'pixelcrew';
  const faceCv = PC ? '<canvas id="introFace" width="24" height="22" style="width:64px;height:59px;image-rendering:pixelated;flex:none" aria-hidden="true"></canvas>' : '<canvas id="introFace" width="96" height="88" style="width:64px;height:59px;flex:none" aria-hidden="true"></canvas>';
  const lineCv = PC ? '<canvas id="crewLine" width="234" height="26" style="width:100%;max-width:420px;height:auto;image-rendering:pixelated;display:block;margin:2px 0 6px" aria-label="픽셀크루 9명"></canvas>' : '<canvas id="crewLine" width="840" height="112" style="width:100%;max-width:420px;height:auto;display:block;margin:2px 0 6px" aria-label="주민 13명"></canvas>';
  const who = (k) => k === 'solo' ? `${castName(CAST.solo[0])} 혼자 · 역·편의·출근 위주, 도보 기본` : k === 'couple' ? `${castName(CAST.couple[0])}+${castName(CAST.couple[1])} · 두 직장 통근·커뮤니티` : `${castName(CAST.family[0])}+${castName(CAST.family[1])}(아기) · 유모차·초등·주차`;
  showModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:6px">${faceCv}<div><h2 style="margin:0;word-break:keep-all">신당 한바퀴, 같이 걸어요</h2><div class="small muted">${GUIDE.name} · ${PC ? '픽셀크루와 함께' : '동물 귀 주민들과 함께'} · 신당·왕십리 클러스터 셀</div></div></div>
    ${lineCv}
    <p class="small">서울 중구·성동구 2.5km×1.4km. 실제 OSM 도로·건물과 SRTM 고도를 <b>${TOP ? '손그림 수채 지도' : '8m 단 언덕'}</b>으로 굽고, 네이버·호갱노노 단지 사실을 출처 등급과 함께 붙인 체험판이에요. 걷는 시간은 실제 환산(추정)입니다.</p>
    <h3>어떤 임장인가요?</h3><div class="opts">${Object.entries(CONCEPTS).map(([k, v]) => `<button data-c="${k}" aria-pressed="false">${k === 'solo' ? '🧑' : k === 'couple' ? '💑' : '👨‍👩‍👧'} ${v.name}<small>${who(k)}</small></button>`).join('')}</div>
    <p class="small muted" style="margin-top:12px">조작: 지도 탭=이동 · 드래그=화면 이동 · 핀치/휠=확대 · 하단 독=이동 수단 · 📍 목적지 목록 추천. PC는 방향키/WASD로 한 칸씩.</p>`);
  document.querySelectorAll('#modalBox button[data-c]').forEach(b => b.onclick = () => { S.concept = b.dataset.c; setMode(CONCEPTS[S.concept].mode); openComplexPicker(false); });
  if (PC) { const f = $('#introFace').getContext('2d'); f.imageSmoothingEnabled = false; f.drawImage(ghostCanvas('cyan', 'happy', 0, false), 0, 0); const l = $('#crewLine').getContext('2d'); l.imageSmoothingEnabled = false; Object.keys(CREW).forEach((k, i) => l.drawImage(ghostCanvas(k, 'idle', i % 2, false), i * 26, 2)); }
  else { faceDraw($('#introFace').getContext('2d'), 96, 88, GUIDE, 'happy', 0.3); const l = $('#crewLine').getContext('2d'); l.setTransform(2, 0, 0, 2, 0, 0); const line = [GUIDE, CAST.solo[0], CAST.couple[1], CAST.family[0], CAST.family[1], ...NPC_CAST.slice(0, 8)]; line.forEach((w, i) => drawVillager(l, 16 + i * 32, 52, Object.assign({}, w, {face:1, state:i % 4 === 1 ? 'happy' : 'idle', t:i * 0.7, scale:w === CAST.family[1] ? 0.85 : 1.15}))); }
}
function openComplexPicker(withAd) {
  showModal(`<h2>어느 단지부터 가 볼까요?</h2><div class="opts">${DATA.complexes.map(c => `<button data-id="${esc(c.id)}" style="border-left:8px solid ${esc(c.color)}">${esc(c.name)}<small>${esc(c.gu)} ${esc(c.dong)} · ${esc(((c.facts || []).find(f => f.k === '세대수') || {v:''}).v.split(' ')[0])} · ${esc(((c.facts || []).find(f => f.k === '사용승인') || {v:''}).v.slice(0, 7))}</small></button>`).join('')}</div><p class="small muted" style="margin-top:10px">스폰: 가장 가까운 지하철역 출구. 세 단지는 한 월드 안에 있어 걸어서 서로 오갈 수 있어요.</p>`);
  document.querySelectorAll('#modalBox button[data-id]').forEach(b => b.onclick = () => { closeModal(); const go = () => { setComplex(b.dataset.id, true); }; if (withAd && Date.now() - S.lastInterstitial > 10 * 60 * 1000) { showInterstitial(go); } else go(); });
}
function showInterstitial(cb) { const el = $('#interstitial'); el.classList.remove('hidden'); let n = 3; $('#interCount').textContent = n + '초 뒤 건너뛸 수 있어요'; const h = setInterval(() => { n--; $('#interCount').textContent = n > 0 ? n + '초 뒤 건너뛸 수 있어요' : '건너뛰기 가능'; if (n <= 0) clearInterval(h); }, 1000); $('#interSkip').onclick = () => { if (n > 0) return; clearInterval(h); el.classList.add('hidden'); S.lastInterstitial = Date.now(); cb(); }; }
function setComplex(id, spawn) {
  S.complex = id; const c = cur(); $('#chipComplex').innerHTML = `<span class="leaf" style="background:${esc(c.color)}"></span><div><b>${esc(c.short)}</b><small>${esc(c.gu)} ${esc(c.dong)} · ${CONCEPTS[S.concept].name}</small></div>`; S.events = S.events.filter(e => !e.arrive || e.complex === id); // 다른 단지 도착 기록만 버린다(이 단지 정문 도착은 체크에 반영)
  if (spawn) { const ex = TARGETS.filter(t => t.type === 'exit' && t.station === c.spawn_station).map(t => ({t, d:Math.hypot(t.x - c.x, t.y - c.y)})).sort((a, b) => a.d - b.d)[0]; const sp = ex ? nearestWalkable(Math.floor(ex.t.x), Math.floor(ex.t.y), 'walk') : null; if (sp) { S.px = sp[0]; S.py = sp[1]; S.lastArrive = ex.t; say(`${ex.t.name}에서 출발! 먼저 ${c.short} 정문까지 ${MODE_KO[S.mode]}로 가 보세요. 📍 목적지 목록에서 고르면 돼요.`); } S.follow = true; }
  openTab('dest'); if (window.innerWidth < 900) { $('#drawer').classList.add('hidden'); syncDrawer(); } renderDrawer();
}

// ---------- 입력 ----------
const ptrs = new Map(); let dragStart = null, moved = false, pinch0 = null;
cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 1) { dragStart = [e.clientX, e.clientY, S.camX, S.camY]; moved = false; } else if (ptrs.size === 2) { const p = [...ptrs.values()]; pinch0 = [Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), S.zoom]; } });
cv.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2 && pinch0) { const p = [...ptrs.values()]; const d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); const mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2; const before = screenToWorld(mx, my); S.zoom = Math.max(0.55, Math.min(2.6, pinch0[1] * d / pinch0[0])); const after = screenToWorld(mx, my); S.camX += before[0] - after[0]; S.camY += before[1] - after[1]; S.follow = false; moved = true; return; } if (dragStart && ptrs.size === 1) { const dx = e.clientX - dragStart[0], dy = e.clientY - dragStart[1]; if (Math.hypot(dx, dy) > 6) { moved = true; S.follow = false; S.camX = dragStart[2] - dx / S.zoom; S.camY = dragStart[3] - dy / S.zoom; } } });
const endPtr = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (ptrs.size === 1) { const [x, y] = [...ptrs.values()][0]; dragStart = [x, y, S.camX, S.camY]; moved = true; } /* 핀치 뒤 남은 손가락 기준으로 드래그 원점 재설정(카메라 점프 방지) */ if (ptrs.size === 0 && !moved && dragStart) { onTap(e.clientX, e.clientY); } if (ptrs.size === 0) dragStart = null; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', (e) => { e.preventDefault(); const before = screenToWorld(e.clientX, e.clientY); S.zoom = Math.max(0.55, Math.min(2.6, S.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); if (!S.follow) { const after = screenToWorld(e.clientX, e.clientY); S.camX += before[0] - after[0]; S.camY += before[1] - after[1]; } }, {passive:false});
function onTap(sx, sy) {
  if (!S.concept) return;
  let best = null, bd = 16; // 표식 근처면 POI 선택(화면 좌표)
  for (const t of TARGETS) { const p = proj(t.x, t.y, surfZ(t.x, t.y)); const [tx, ty] = worldToScreen(p[0], p[1]); const d = Math.hypot(tx - sx, ty - sy + 8); if (d < bd) { bd = d; best = t; } }
  if (best) { startTravel(Math.floor(best.x), Math.floor(best.y), best); return; }
  const tile = pickTile(sx, sy); if (!tile) return; startTravel(tile[0], tile[1], null);
}
window.addEventListener('keydown', (e) => { if (!S.concept || S.traveling) return; if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return; const d = {ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0], w:[0,-1], s:[0,1], a:[-1,0], d:[1,0]}[e.key]; if (!d) return; e.preventDefault(); const nx = (S.px | 0) + d[0], ny = (S.py | 0) + d[1]; if (!inb(nx, ny)) return; const i = idx(nx, ny); if (!tileAllowed(i, S.mode, -1)) { toast('막힘: ' + (K[i] === KIND.BLD ? '건물' : isStairs(i) ? '계단(유모차·자전거 불가)' : '통행 불가')); return; } if (!moveAllowed(idx(S.px | 0, S.py | 0), i, S.mode, d[0], d[1])) { toast('🚫 일방통행 역주행(OSM oneway, 추정)'); return; } const c = stepCost(idx(S.px | 0, S.py | 0), i, S.mode, false); if (!isFinite(c)) { toast('급경사: 이 수단으로는 못 올라가요'); return; } S.px = nx; S.py = ny; S.follow = true; const sxp = d[0] - d[1]; if (sxp !== 0) S.face = sxp > 0 ? 1 : -1; const near = TARGETS.find(t => Math.hypot(t.x - nx - 0.5, t.y - ny - 0.5) < 0.8); if (near && !S.visited.has(near.id)) { S.visited.add(near.id); onArrive(near, S.mode, {min:c, dist:TILE_M, up:0, cross:0, stairs:0, maxGrade:0}); } });

// ---------- 루프 ----------
function loop(ts) { tickTravel(performance.now()); draw(ts); requestAnimationFrame(loop); }
function boot() {
  resize(); buildStatic(); computeMetrics(); spawnNpcs();
  const c0 = DATA.complexes[0]; const g0 = (c0.gates && c0.gates[0]) || {x:W / 2, y:H / 2}; S.px = Math.floor(g0.x); S.py = Math.floor(g0.y); const p = proj(S.px, S.py, zAt(S.px, S.py)); S.camX = p[0]; S.camY = p[1];
  S.zoom = window.innerWidth < 600 ? 1.45 : 1.25;
  openConceptPicker();
  requestAnimationFrame(loop);
}
function bootSafe() { try { boot(); } catch (e) { const msg = String(e && e.message || e); window.__errs.push('boot: ' + msg); try { $('#modalBox').innerHTML = `<h2>월드를 그리지 못했어요</h2><p class="small">브라우저가 오래됐거나(Canvas roundRect 미지원 등) 메모리가 부족할 수 있어요. 최신 Chrome·Safari로 다시 열어 주세요.</p><pre class="small muted" style="white-space:pre-wrap">${esc(msg)}</pre>`; $('#modal').classList.remove('hidden'); } catch (e2) {} } }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(bootSafe, bootSafe); else bootSafe();
})();
</script>
