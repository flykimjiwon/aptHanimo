// src/renderer/shared/sprites.js — 픽셀크루 스프라이트 엔진(순수·무의존 UMD).
// 디자인 문법: 계단형 돔(6→10→12) · 폭 14 몸통 · 3갈래 블록 발 · 흰 사각 눈 + 짙은 동공 · 분홍 볼.
// 좌표계: GRID(24×22) 안에 16×16 몸체를 좌하단 쪽으로 두고, 오른쪽 여백에 소품 · 위쪽 여백에 글리프를 합성한다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../shared/crew.js'));
  else root.PixelSprites = factory(root.PixelCrewRoster);
})(typeof self !== 'undefined' ? self : this, function (roster) {
  'use strict';

  const PALETTE = {
    W: '#ffffff', P: '#1b2733', C: '#ff9eb5', Y: '#ffd166', V: '#ffd43b', L: '#94a3b8',
    M: '#cfd6e0', H: '#8d5a2b', G: '#f8f9fa', A: '#4a5261', S: '#ffe066', K: '#20242c',
    T: '#9aa4b2', F: '#74c0fc', R: '#ff6b6b', D: '#0b1220',
  };
  const STATES = ['idle', 'walk', 'talk', 'think', 'work', 'sleep', 'alert', 'happy'];
  const GRID = { w: 24, h: 22 };
  const BODY = { x: 1, y: 5, size: 16 };            // 몸체 16×16 의 그리드 원점
  const FRAME_COUNT = { idle: 2, walk: 2, talk: 2, think: 3, work: 2, sleep: 2, alert: 1, happy: 2 };
  const FRAME_MS = { idle: 500, walk: 180, talk: 140, think: 400, work: 220, sleep: 900, alert: 300, happy: 300 };
  const FALLBACK = { color: '#6ee7ff', accessories: ['scarf'], props: ['pen'] };

  // ── 몸체 기본 맵(16×16). 눈·볼·입은 표정 함수가 덮어쓴다 ──────────────────
  const BODY_MAP = [
    '.....BBBBBB.....',
    '...BBBBBBBBBB...',
    '..BBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
    '.BBB..BBBB..BBB.',
    '.BB...BBBB...BB.',
  ];
  // 발(행 14·15): 빈칸 2개로 갈라진 3블록. walk 는 두 자세를 번갈아 쓴다
  const FEET = [
    ['.BBB..BBBB..BBB.', '.BB...BBBB...BB.'],
    ['.BBBB.BBBB.BBBB.', '..BBB..BB..BBB..'],
  ];
  const EYES = {
    small: { w: 2, h: 2, y: 5, lx: 4, rx: 10 },
    big: { w: 3, h: 3, y: 4, lx: 3, rx: 10 },
  };
  const CHEEK_Y = 8, MOUTH_Y = 9, SCARF_Y = 11;

  // ── 소품(몸통 오른쪽 아래에 합성). dy 는 바닥선 18 기준 ────────────────────
  const PROPS = {
    pen: { dx: 16, dy: 15, map: ['...M', '..MH', '.MH.', 'PH..'] },
    magnifier: { dx: 16, dy: 13, map: ['.LL..', 'LMML.', 'LMML.', '.LL..', '...H.', '....H'] },
    notebook: { dx: 16, dy: 13, map: ['PPPPP', 'PAAAP', 'PGGGP', 'PAAAP', 'PGGGP', 'PPPPP'] },
    clipboard: { dx: 16, dy: 12, map: ['..K..', '.KKK.', 'HHHHH', 'HGGGH', 'HAAAH', 'HGGGH', 'HHHHH'] },
    wrench: { dx: 17, dy: 13, map: ['M.M', 'MMM', '.M.', '.M.', '.MM', '..M'] },
    book: { dx: 16, dy: 14, map: ['PPPPPPP', 'PGGPGGP', 'PAAPAAP', 'PGGPGGP', 'PPPPPPP'] },
  };
  // ── 머리 위 글리프 ───────────────────────────────────────────────────────
  const DOT1 = ['W'], DOT2 = ['WW', 'WW'];
  const EXCLAIM = ['YY', 'YY', 'YY', '..', 'YY'];
  const Z_SMALL = ['WWW', '.W.', 'WWW'];
  const Z_BIG = ['WWWW', '..W.', '.W..', 'WWWW'];

  // ── 셀 헬퍼 ─────────────────────────────────────────────────────────────
  function cloneCells(rows) { return rows.map((r) => r.split('')); }
  function put(cells, x, y, ch) {
    const row = cells[y];
    if (row && x >= 0 && x < row.length) row[x] = ch;
  }
  function rect(cells, x, y, w, h, ch) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(cells, x + i, y + j, ch);
  }
  function flipX(rows) { return rows.map((r) => r.split('').reverse().join('')); }

  // ── 표정 ────────────────────────────────────────────────────────────────
  function drawEyes(cells, eg, mode) {
    const { w, h, y, lx, rx } = eg;
    if (mode === 'closed') {                       // 감은 눈: 어두운 가로선
      for (let i = 0; i < w; i++) { put(cells, lx + i, y + h - 1, 'P'); put(cells, rx + i, y + h - 1, 'P'); }
      return;
    }
    if (mode === 'happy') {                        // 웃는 눈: 꼭짓점이 위인 '^^'
      for (const c of [4, 11]) { put(cells, c, y, 'W'); put(cells, c - 1, y + 1, 'W'); put(cells, c + 1, y + 1, 'W'); }
      return;
    }
    rect(cells, lx, y, w, h, 'W');
    rect(cells, rx, y, w, h, 'W');
    if (w >= 3) { put(cells, lx + 1, y + 1, 'P'); put(cells, rx + 1, y + 1, 'P'); }
    else { put(cells, lx + w - 1, y + h - 1, 'P'); put(cells, rx, y + h - 1, 'P'); }
  }
  function drawCheeks(cells, wide) {
    if (wide) { rect(cells, 2, CHEEK_Y, 3, 1, 'C'); rect(cells, 11, CHEEK_Y, 3, 1, 'C'); }
    else { rect(cells, 2, CHEEK_Y, 2, 1, 'C'); rect(cells, 12, CHEEK_Y, 2, 1, 'C'); }
  }
  function drawMouth(cells) { put(cells, 7, MOUTH_Y, 'P'); put(cells, 8, MOUTH_Y, 'P'); }

  // ── 액세서리 ────────────────────────────────────────────────────────────
  function applyScarf(cells) {
    for (let x = 1; x <= 14; x++) put(cells, x, SCARF_Y, 'Y');
    rect(cells, 13, SCARF_Y + 1, 2, 2, 'Y');       // 오른쪽 아래로 늘어진 꼬리
  }
  function applyHelmet(cells) {
    for (let y = 0; y <= 2; y++) for (let x = 0; x < 16; x++) if (cells[y][x] === 'B') cells[y][x] = 'V';
    rect(cells, 0, 3, 16, 1, 'A');                 // 챙: 몸통(1~14)보다 양쪽 1픽셀씩 넓다. 어두워서 몸색과 안 섞인다
  }
  function applyMonocle(cells, eg) {
    const x0 = eg.rx - 1, y0 = eg.y - 1, x1 = eg.rx + eg.w, y1 = eg.y + eg.h;
    for (let x = x0; x <= x1; x++) { put(cells, x, y0, 'L'); put(cells, x, y1, 'L'); }
    for (let y = y0; y <= y1; y++) { put(cells, x0, y, 'L'); put(cells, x1, y, 'L'); }
    put(cells, x1 + 1, y1 + 1, 'L');               // 사슬 1픽셀(링 바깥 모서리에서 아래로)
  }

  // ── 명부 조회 ───────────────────────────────────────────────────────────
  function resolveCrew(crew) {
    if (crew && typeof crew === 'object') {
      return {
        color: crew.color || FALLBACK.color,
        accessories: crew.accessories || [],
        props: crew.props || [],
      };
    }
    const key = typeof crew === 'string' ? crew : 'cyan';
    const src = roster && typeof roster.getCrew === 'function' ? roster.getCrew(key) : null;
    if (!src) return { color: FALLBACK.color, accessories: FALLBACK.accessories.slice(), props: FALLBACK.props.slice() };
    return { color: src.color, accessories: src.accessories || [], props: src.props || [] };
  }

  function frameCount(state) { return FRAME_COUNT[state] || 1; }
  function frameMs(state) { return FRAME_MS[state] || 500; }

  // ── 렌더 ────────────────────────────────────────────────────────────────
  function setPixel(map, x, y, color) {
    if (x < 0 || y < 0 || x >= GRID.w || y >= GRID.h) return;
    map.set(x + ',' + y, color);
  }
  function stamp(map, rows, dx, dy, bodyColor) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        setPixel(map, dx + x, dy + y, ch === 'B' ? bodyColor : (PALETTE[ch] || bodyColor));
      }
    }
  }

  function bodyOffsetY(state, frame, hasProp) {
    switch (state) {
      case 'idle': return frame;                   // f1 은 1픽셀 내려앉는 바운스
      case 'walk': return frame;                   // 걸음마다 위아래로 흔들림
      case 'sleep': return 1;                      // 살짝 주저앉음
      case 'alert': return -2;                     // 점프
      case 'happy': return frame === 1 ? -1 : 0;
      case 'work': return hasProp ? 0 : frame;     // 소품 없는 크루는 몸으로 동작을 표현
      default: return 0;
    }
  }

  function renderFrame(opts) {
    const o = opts || {};
    const state = STATES.indexOf(o.state) >= 0 ? o.state : 'idle';
    const n = frameCount(state);
    const frame = (((o.frame | 0) % n) + n) % n;
    const crew = resolveCrew(o.crew);
    const acc = crew.accessories;
    const eg = acc.indexOf('bigeye') >= 0 ? EYES.big : EYES.small;

    const cells = cloneCells(BODY_MAP);
    const feet = FEET[state === 'walk' ? frame % FEET.length : 0];
    cells[14] = feet[0].split('');
    cells[15] = feet[1].split('');

    drawEyes(cells, eg, state === 'sleep' ? 'closed' : state === 'happy' ? 'happy' : 'open');
    drawCheeks(cells, state === 'happy');
    if (state === 'talk' && frame === 0) drawMouth(cells);

    if (acc.indexOf('helmet') >= 0) applyHelmet(cells);
    if (acc.indexOf('scarf') >= 0) applyScarf(cells);
    if (acc.indexOf('monocle') >= 0) applyMonocle(cells, eg);

    const propKey = crew.props.length ? crew.props[0] : null;
    const prop = propKey ? PROPS[propKey] : null;
    const dy = bodyOffsetY(state, frame, !!prop);

    const map = new Map();
    stamp(map, cells.map((r) => r.join('')), BODY.x, BODY.y + dy, crew.color);

    if (prop && state !== 'sleep') {               // 잠들면 소품을 놓는다
      const lift = state === 'work' && frame === 1 ? -2 : 0;
      stamp(map, prop.map, prop.dx, prop.dy + dy + lift, crew.color);
    }
    if (state === 'think') {                       // 머리 오른쪽 위로 점 1→2→3
      stamp(map, DOT1, 16, 4, crew.color);
      if (frame >= 1) stamp(map, DOT2, 18, 2, crew.color);
      if (frame >= 2) stamp(map, DOT2, 21, 0, crew.color);
    } else if (state === 'alert') {
      stamp(map, EXCLAIM, 17, 0, crew.color);
    } else if (state === 'sleep') {
      stamp(map, Z_SMALL, 16, 5, crew.color);
      if (frame === 1) stamp(map, Z_BIG, 19, 0, crew.color);
    }

    let pixels = [];
    map.forEach((c, k) => {
      const i = k.indexOf(',');
      pixels.push({ x: +k.slice(0, i), y: +k.slice(i + 1), c });
    });
    let bodyBox = { x: BODY.x, y: BODY.y + dy, w: BODY.size, h: BODY.size };
    if (o.flip) {
      pixels = pixels.map((p) => ({ x: GRID.w - 1 - p.x, y: p.y, c: p.c }));
      bodyBox = { x: GRID.w - bodyBox.x - bodyBox.w, y: bodyBox.y, w: bodyBox.w, h: bodyBox.h };
    }
    pixels.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return { w: GRID.w, h: GRID.h, pixels, bodyBox };
  }

  // ── 출력 ────────────────────────────────────────────────────────────────
  function drawFrame(ctx, frameObj, scale, ox, oy) {
    const s = scale || 1, x0 = ox || 0, y0 = oy || 0;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < frameObj.pixels.length; i++) {
      const p = frameObj.pixels[i];
      ctx.fillStyle = p.c;
      ctx.fillRect(x0 + p.x * s, y0 + p.y * s, s, s);
    }
  }
  function hitTest(frameObj, gx, gy) {
    if (!frameObj || !frameObj.pixels) return false;
    for (let i = 0; i < frameObj.pixels.length; i++) {
      const p = frameObj.pixels[i];
      if (p.x === gx && p.y === gy) return true;
    }
    return false;
  }
  function ghostMask() {                           // 트레이 아이콘용 16×16 실루엣(눈은 뚫는다)
    const cells = cloneCells(BODY_MAP);
    const rows = cells.map((r) => r.map((ch) => (ch === '.' ? '.' : '#')));
    const eg = EYES.small;
    for (let j = 0; j < eg.h; j++) for (let i = 0; i < eg.w; i++) {
      rows[eg.y + j][eg.lx + i] = '.';
      rows[eg.y + j][eg.rx + i] = '.';
    }
    return rows.map((r) => r.join(''));
  }
  function hexToRgb(hex) {
    const h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function frameToRGBA(frameObj, scale) {
    const s = Math.max(1, (scale | 0) || 1);
    const width = frameObj.w * s, height = frameObj.h * s;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < frameObj.pixels.length; i++) {
      const p = frameObj.pixels[i];
      const rgb = hexToRgb(p.c);
      for (let j = 0; j < s; j++) for (let k = 0; k < s; k++) {
        const off = (((p.y * s + j) * width) + (p.x * s + k)) * 4;
        data[off] = rgb[0]; data[off + 1] = rgb[1]; data[off + 2] = rgb[2]; data[off + 3] = 255;
      }
    }
    return { width, height, data };
  }

  return {
    PALETTE, STATES, GRID, BODY, PROPS,
    frameCount, frameMs, renderFrame, drawFrame, hitTest, ghostMask, frameToRGBA,
    _internals: { BODY_MAP, FEET, EYES, flipX },
  };
});
