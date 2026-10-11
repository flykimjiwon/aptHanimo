// ---------- 갤러리·조합·내보내기 ----------
const $ = (s) => document.querySelector(s);
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const SEL = {char:'pixelcrew', bld:'v2', world:'terrace'};
const tagHtml = (tags) => Object.entries(tags).map(([k, v]) => `<span class="tag${(k === '동숲' && v >= 4) ? ' hi' : ''}">${k} ${typeof v === 'number' ? (k === '동숲' ? '★'.repeat(v) : v) : v}</span>`).join('');
function makeCard(grid, list, kind, no, item, cw, chh) {
  const card = document.createElement('div'); card.className = 'card'; card.dataset.kind = kind; card.dataset.id = item.id; card.setAttribute('aria-selected', String(SEL[kind] === item.id));
  const cv = document.createElement('canvas'); cv.width = cw * DPR; cv.height = chh * DPR; cv.style.aspectRatio = `${cw} / ${chh}`; cv.setAttribute('aria-label', item.name);
  card.appendChild(cv);
  card.insertAdjacentHTML('beforeend', `<h3><span class="no">${String(no).padStart(2, '0')}</span>${item.name}</h3><p>${item.desc}</p><div class="tags">${tagHtml(item.tags)}</div><button class="pick" aria-pressed="${SEL[kind] === item.id}">이 스타일 선택</button>`);
  card.querySelector('.pick').addEventListener('click', () => { SEL[kind] = item.id; syncSelection(); });
  grid.appendChild(card); return cv;
}
const ANIM = [];
const gChars = $('#gridChars'), gBlds = $('#gridBlds'), gWorlds = $('#gridWorlds');
CHARS.forEach((c, i) => { const cv = makeCard(gChars, CHARS, 'char', i + 1, c, 220, 160); const g = cv.getContext('2d'); ANIM.push({cv, draw:(t) => { g.setTransform(DPR, 0, 0, DPR, 0, 0); charCard(g, 220, 160, c, t); }}); });
BLDS.forEach((b, i) => { const cv = makeCard(gBlds, BLDS, 'bld', i + 1, b, 220, 170); const g = cv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.save(); bldScene(g, 220, 170, b.st); g.restore(); });
WORLDS.forEach((wd, i) => { const cv = makeCard(gWorlds, WORLDS, 'world', i + 1, wd, 320, 210); const g = cv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.save(); try { renderWorldScaled(g, 320, 210, wd, null); } catch (e) { window.__errs.push('world ' + wd.id + ': ' + e.message); } g.restore(); });
function renderWorldScaled(g, w, h, wd, o) { // DPR 보정된 컨텍스트에서 월드 렌더(렌더러는 setTransform 을 직접 쓰므로 오프스크린에 그려 복사)
  const off = document.createElement('canvas'); off.width = w; off.height = h; const og = off.getContext('2d'); const r = wd.render(og, w, h, o); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, w, h); g.drawImage(off, 0, 0, w, h); return {off, r};
}
// 조합 미리보기
const comboCv = $('#comboCv'), cg = comboCv.getContext('2d'); const CWID = 720, CHEI = 440; comboCv.width = CWID * DPR; comboCv.height = CHEI * DPR;
let comboWorld = null; // {off, r}
function renderCombo() {
  const wd = WORLDS.find(x => x.id === SEL.world), bd = BLDS.find(x => x.id === SEL.bld);
  const off = document.createElement('canvas'); off.width = CWID; off.height = CHEI; const og = off.getContext('2d');
  let r = null; try { r = wd.render(og, CWID, CHEI, {bld:bd}); } catch (e) { window.__errs.push('combo ' + wd.id + '/' + bd.id + ': ' + e.message); }
  comboWorld = {off, r};
}
function drawCombo(t) {
  if (!comboWorld) return; const ch = CHARS.find(x => x.id === SEL.char); const wd = WORLDS.find(x => x.id === SEL.world);
  cg.setTransform(DPR, 0, 0, DPR, 0, 0); cg.clearRect(0, 0, CWID, CHEI); cg.drawImage(comboWorld.off, 0, 0, CWID, CHEI);
  if (comboWorld.r && comboWorld.r.place) { const sc = wd.kind === 'iso' ? 0.55 : 0.5; comboWorld.r.place(cg, t, ch, {scale:sc}); comboWorld.r.place(cg, t + 0.35, ch, {scale:sc * 0.85, col:'#f472b6', col2:'#2b1f17'}); }
  cg.setTransform(DPR, 0, 0, DPR, 0, 0); cg.font = '600 11px "Noto Sans KR",sans-serif'; cg.textAlign = 'left'; const bd = BLDS.find(x => x.id === SEL.bld); const label = `${ch.name} × ${bd.name} × ${wd.name}`; const tw2 = cg.measureText(label).width + 14; cg.fillStyle = 'rgba(255,253,246,.92)'; cg.beginPath(); cg.roundRect(10, 10, tw2, 22, 11); cg.fill(); cg.strokeStyle = 'rgba(205,191,159,1)'; cg.lineWidth = 1.5; cg.stroke(); cg.fillStyle = '#4a3b2f'; cg.fillText(label, 17, 25);
}
function syncSelection() {
  document.querySelectorAll('.card').forEach(c => { const on = SEL[c.dataset.kind] === c.dataset.id; c.setAttribute('aria-selected', String(on)); c.querySelector('.pick').setAttribute('aria-pressed', String(on)); });
  $('#selChar').value = SEL.char; $('#selBld').value = SEL.bld; $('#selWorld').value = SEL.world;
  renderCombo(); updateExport();
}
for (const [id, list, key] of [['#selChar', CHARS, 'char'], ['#selBld', BLDS, 'bld'], ['#selWorld', WORLDS, 'world']]) { const sel = $(id); sel.innerHTML = list.map((it, i) => `<option value="${it.id}">${String(i + 1).padStart(2, '0')} ${it.name}</option>`).join(''); sel.addEventListener('change', () => { SEL[key] = sel.value; syncSelection(); }); }
document.querySelectorAll('.presets button').forEach(b => b.addEventListener('click', () => { const [c, bd, w] = b.dataset.set.split(','); SEL.char = c; SEL.bld = bd; SEL.world = w; syncSelection(); }));
function updateExport() {
  const ch = CHARS.find(x => x.id === SEL.char), bd = BLDS.find(x => x.id === SEL.bld), wd = WORLDS.find(x => x.id === SEL.world);
  const obj = {stylelab:'imjang-world 2026-10-11', character:{id:ch.id, name:ch.name, desc:ch.desc, tags:ch.tags}, building:{id:bd.id, name:bd.name, desc:bd.desc, tags:bd.tags, params:bd.st}, world:{id:wd.id, name:wd.name, desc:wd.desc, tags:wd.tags, kind:wd.kind}, source:'docs/analysis/imjang_world_2026-10-11/prototype/stylelab/ (src/03_chars.js, 04_blds.js, 05_worlds.js)'};
  $('#exportTxt').value = `# 임장월드 스타일 선택\n- 캐릭터: ${ch.name} (${ch.id}) — ${ch.desc}\n- 건물: ${bd.name} (${bd.id}) — ${bd.desc}\n- 월드맵: ${wd.name} (${wd.id}) — ${wd.desc}\n\n` + JSON.stringify(obj, null, 1);
}
$('#copyBtn').addEventListener('click', () => { const ta = $('#exportTxt'); const done = () => $('#copyMsg').textContent = '복사됨. Codex·기획서에 붙여넣으세요.'; const fail = () => { ta.focus(); ta.select(); $('#copyMsg').textContent = '자동 복사가 막혀 텍스트를 선택했어요. 길게 눌러 복사하세요.'; }; try { navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(ta.value).then(done, fail) : fail(); } catch (e) { fail(); } });
// 비교표
$('#cmpTable').innerHTML = `<table><tr><th>구분</th><th>#</th><th>스타일</th><th>난이도</th><th>성능</th><th>정합</th><th>동숲</th><th>비고</th></tr>` + [['캐릭터', CHARS], ['건물', BLDS], ['월드맵', WORLDS]].map(([k, list]) => list.map((it, i) => `<tr><td>${k}</td><td>${String(i + 1).padStart(2, '0')}</td><td>${it.name}</td><td>${it.tags.난이도}</td><td>${it.tags.성능}</td><td>${it.tags.정합 || '—'}</td><td>${'★'.repeat(it.tags.동숲)}</td><td>${it.tags.비고 || (it.kind === 'iso' ? '아이소' : it.kind === 'top' ? '탑뷰' : '')}</td></tr>`).join('')).join('') + `</table>`;
// 루프
let t0 = performance.now();
function loop(ts) { const t = (ts - t0) / 1000; for (const a of ANIM) { const r = a.cv.getBoundingClientRect(); if (r.bottom < -50 || r.top > innerHeight + 50) continue; a.draw(t); } drawCombo(t); requestAnimationFrame(loop); }
syncSelection();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(loop)); else requestAnimationFrame(loop);
})();
</script>
