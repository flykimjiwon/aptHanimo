import "./island.css";
import { Raycaster, Vector2 } from "three";
import { loadSpatial } from "../spatial/load";
import { PALETTES, type PaletteId } from "./palettes";
import { IslandView } from "./view";

function element<T extends HTMLElement>(selector: string, kind: { new (): T }): T {
  const node = document.querySelector(selector);
  if (!(node instanceof kind)) throw new TypeError(`Missing island element: ${selector}`);
  return node;
}
const app = element("#island-app", HTMLDivElement);
app.innerHTML = `<header class="island-header"><a class="island-brand" href="/?complex=xi"><img src="/favicon.svg" alt="" width="32" height="32">한바퀴<span>단지 섬</span></a><a class="original-link" href="/?complex=xi">기존 버전 열기 <span aria-hidden="true">↗</span></a></header>
<main><section class="island-intro" aria-labelledby="island-title"><div><p class="island-eyebrow">서울 성동구 · 하왕십리동</p><h1 id="island-title">왕십리자이<span class="island-subtitle">작은 섬으로 만나는 우리 동네</span></h1></div><div class="island-palettes" role="group" aria-label="섬 분위기">${Object.entries(
  PALETTES,
)
  .map(
    ([id, p]) =>
      `<button data-palette="${id}" aria-pressed="${id === "garden"}"><i style="background:${p.roof}" aria-hidden="true"></i>${p.label}</button>`,
  )
  .join("")}</div></section>
<section class="island-stage" aria-label="단지 섬 탐색"><div id="island-canvas"></div><div id="island-labels"></div><div class="island-loading" role="status"><span class="island-loading-dot"></span><strong>우리 동네를 작은 섬으로</strong><p>건물과 길을 놓고 있어요.</p></div><div class="island-compass" aria-label="북쪽 표시"><span id="north-arrow" aria-hidden="true">↑</span>N</div><div class="island-camera" role="group" aria-label="시점 조작"><button data-view="rotate" aria-label="섬 시점 45도 회전">↻</button><button data-view="plus" aria-label="섬 확대">+</button><button data-view="minus" aria-label="섬 축소">−</button></div><aside class="island-detail" hidden aria-label="선택한 동"><button data-view="close-detail" aria-label="동 정보 닫기">×</button><span>왕십리자이</span><h2 id="building-name"></h2><p>이 동의 위치와 주변 빈 공간을 살펴보세요.</p><button class="detail-overview" data-view="overview">단지 전체로 돌아가기</button></aside><div class="island-pad" hidden role="group" aria-label="캐릭터 이동"><button data-direction="up" aria-label="위쪽으로 걷기">↑</button><button data-direction="left" aria-label="왼쪽으로 걷기">←</button><button data-direction="down" aria-label="아래쪽으로 걷기">↓</button><button data-direction="right" aria-label="오른쪽으로 걷기">→</button></div></section>
<section class="island-bottom" aria-label="산책과 지도 조작"><p id="island-status" role="status">드래그로 돌리고, 건물 번호를 눌러 살펴보세요.</p><div class="island-dock"><button data-view="overview" class="dock-secondary">전체 보기</button><button data-view="walk" class="dock-primary" aria-pressed="false"><span aria-hidden="true">♧</span>친구와 산책</button><button data-view="top" class="dock-secondary">위에서 보기</button><button data-view="close" class="dock-secondary">가까이 보기</button></div><p class="island-caption">실제 단지 윤곽 · 7개 동 배치 <span>위성 지도를 참고해 만든 작은 모형</span></p></section>
<details class="island-sources"><summary>어디까지 실제 모습인가요?</summary><p>단지 윤곽과 7개 동 위치·외곽선은 기존 지도 자료를 사용하고, 2026년 10월 12일 네이버 위성 화면에서 북쪽으로 뻗은 동 배치와 남쪽 마당을 대조했어요. 위성 촬영일은 확인하지 않았어요.</p><p>한눈에 보기 위해 건물 높이는 55%, 지형 높낮이는 35%로 표현했어요. 나무·창문·땅의 단면은 분위기를 위한 연출이고, 섬 경계는 법적 지적 경계나 실제 통행 가능 여부를 보증하지 않아요. 실제 생활권 길찾기는 기존 버전에서 이어갈 수 있어요.</p><p><a href="https://map.naver.com/p/entry/place/35689784?c=18.00,0,0,2,dh" target="_blank" rel="noreferrer">위성 지도 보기 ↗</a> · <a href="https://hogangnono.com/apt/aEc43" target="_blank" rel="noreferrer">단지 지도 출처 ↗</a> · 길 © OpenStreetMap contributors / ODbL 1.0</p></details></main>`;

let view: IslandView | null = null;
const events = new AbortController();
const status = element("#island-status", HTMLElement),
  stage = element(".island-stage", HTMLElement);
function selectBuilding(id: string): void {
  const building = view?.world.buildings.find((b) => b.id === id && b.kind === "core");
  if (!building || !view) return;
  view.walker.pause();
  syncWalk();
  view.focus(id);
  element("#building-name", HTMLElement).textContent = building.name;
  element(".island-detail", HTMLElement).hidden = false;
  for (const [key, button] of view.labels) button.setAttribute("aria-pressed", String(key === id));
  status.textContent = `${building.name}을 가까이 보고 있어요. 드래그로 다른 면도 살펴보세요.`;
}
function syncWalk(): void {
  const walking = view?.walker.active ?? false,
    button = element('[data-view="walk"]', HTMLButtonElement);
  button.setAttribute("aria-pressed", String(walking));
  button.textContent = walking ? "산책 잠시 멈추기" : "친구와 산책";
  element(".island-pad", HTMLElement).hidden = !walking;
}
function applyPalette(id: PaletteId): void {
  if (!view) return;
  view.setPalette(PALETTES[id]);
  document.body.dataset.palette = id;
  document.documentElement.style.setProperty("--island-sky", PALETTES[id].sky);
  document.querySelectorAll<HTMLButtonElement>("button[data-palette]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.palette === id));
  });
}
app.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element) || !view) return;
    const button = event.target.closest("button");
    if (!button) return;
    const palette = button.dataset.palette;
    if (palette === "garden" || palette === "clay" || palette === "dusk") {
      applyPalette(palette);
      return;
    }
    if (button.dataset.building) {
      selectBuilding(button.dataset.building);
      return;
    }
    switch (button.dataset.view) {
      case "overview":
        view.rig.overview();
        for (const button of view.labels.values()) button.setAttribute("aria-pressed", "false");
        element(".island-detail", HTMLElement).hidden = true;
        status.textContent = "단지의 실제 윤곽과 7개 동 배치를 한눈에 살펴보세요.";
        break;
      case "top":
        view.rig.top();
        element(".island-detail", HTMLElement).hidden = true;
        status.textContent = "북쪽이 위예요. 건물 위치와 단지 안의 길을 비교해 보세요.";
        break;
      case "rotate":
        view.rig.rotate();
        break;
      case "plus":
        view.rig.zoom(1.2);
        break;
      case "minus":
        view.rig.zoom(1 / 1.2);
        break;
      case "close":
        view.closeWalk();
        status.textContent = "친구를 가까이 보고 있어요. 바닥을 누르면 그곳으로 걸어가요.";
        break;
      case "close-detail":
        element(".island-detail", HTMLElement).hidden = true;
        break;
      case "walk":
        if (view.walker.active) {
          view.walker.pause();
          view.walker.update(0, [0, 0], false);
          view.render();
          status.textContent = "잠시 쉬는 중이에요. 다시 눌러 산책을 이어가세요.";
        } else {
          view.walker.start();
          view.play();
          view.renderer.domElement.focus();
          status.textContent = "친구가 단지를 산책해요. 바닥을 누르거나 방향키로 함께 걸어요.";
        }
        syncWalk();
        break;
    }
  },
  { signal: events.signal },
);

async function start(): Promise<void> {
  try {
    const world = await loadSpatial("xi");
    if (events.signal.aborted) return;
    view = new IslandView(
      element("#island-canvas", HTMLElement),
      world,
      element("#island-labels", HTMLElement),
    );
    applyPalette("garden");
    element(".island-loading", HTMLElement).hidden = true;
    const canvas = view.renderer.domElement;
    canvas.tabIndex = 0;
    const pointers = new Set<number>();
    let tap: { x: number; y: number } | null = null,
      consumed = false;
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        pointers.add(e.pointerId);
        if (pointers.size === 1) {
          tap = { x: e.clientX, y: e.clientY };
          consumed = false;
        } else consumed = true;
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      "pointermove",
      (e) => {
        if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 5) consumed = true;
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      "pointercancel",
      () => {
        consumed = true;
        pointers.clear();
        tap = null;
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      "pointerup",
      (e) => {
        pointers.delete(e.pointerId);
        if (!tap || consumed || pointers.size || !view) return;
        tap = null;
        const rect = canvas.getBoundingClientRect(),
          ray = new Raycaster();
        ray.setFromCamera(
          new Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((e.clientY - rect.top) / rect.height) * 2,
          ),
          view.camera,
        );
        const hits = ray.intersectObjects(view.scene.children, true);
        for (const hit of hits) {
          let o = hit.object;
          while (o.parent && !o.userData.buildingId) o = o.parent;
          if (typeof o.userData.buildingId === "string") {
            selectBuilding(o.userData.buildingId);
            return;
          }
        }
        const ground = hits.find((h) => h.object.name === "island-ground");
        if (ground && view.walker.goTo([ground.point.x, ground.point.z])) {
          view.play();
          syncWalk();
          status.textContent = "선택한 곳으로 걸어가요. 산책 버튼으로 멈출 수 있어요.";
        } else if (ground)
          status.textContent = "이 지점은 걸어갈 수 없어요. 단지 안의 다른 빈 공간을 골라 주세요.";
      },
      { signal: events.signal },
    );
    view.controls.addEventListener("change", () => {
      if (view)
        element("#north-arrow", HTMLElement).style.transform =
          `rotate(${view.controls.getAzimuthalAngle()}rad)`;
    });
    element("#north-arrow", HTMLElement).style.transform =
      `rotate(${view.controls.getAzimuthalAngle()}rad)`;
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-direction]")) {
      const directions: Readonly<Record<string, readonly [number, number]>> = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
      };
      button.addEventListener(
        "pointerdown",
        (e) => {
          const d = directions[button.dataset.direction ?? ""];
          if (d) {
            button.setPointerCapture(e.pointerId);
            view?.input(...d);
          }
        },
        { signal: events.signal },
      );
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"] as const)
        button.addEventListener(name, () => view?.input(0, 0), { signal: events.signal });
    }
    stage.dataset.ready = "true";
  } catch (error: unknown) {
    if (!(error instanceof Error)) throw error;
    view?.dispose();
    view = null;
    const loading = element(".island-loading", HTMLElement);
    loading.hidden = false;
    loading.innerHTML =
      '<strong>단지 섬을 열지 못했어요</strong><p>연결과 브라우저의 3D 지원을 확인한 뒤 다시 열어 주세요.</p><button id="island-retry">다시 시도</button><a href="/?complex=xi">기존 버전 열기</a>';
    element("#island-retry", HTMLButtonElement).addEventListener("click", () => location.reload(), {
      signal: events.signal,
    });
  }
}
window.addEventListener(
  "pagehide",
  () => {
    events.abort();
    view?.dispose();
  },
  { once: true },
);
void start();
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
