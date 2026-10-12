import {
  Armchair,
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Baby,
  Bike,
  Bookmark,
  BookOpen,
  Building2,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
  Coffee,
  Compass,
  Copy,
  createIcons,
  DoorOpen,
  Download,
  Dumbbell,
  Footprints,
  GraduationCap,
  House,
  Info,
  Layers,
  MapPin,
  Minus,
  Mountain,
  MoveUpRight,
  Navigation,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Route,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  SquareParking,
  TrainFront,
  Trash2,
  Trees,
  Users,
  X,
} from "lucide";
import type { Complex } from "./complexes";
import { LAYERS, type Layer, MODES, type Mode, PARTIES, type Party, type Place } from "./data";
import type { ConnectionStatus } from "./presence";
import type { Route as Journey } from "./routes";
import { escapeHtml } from "./storage";
export function icons(): void {
  createIcons({
    icons: {
      ArrowDown,
      ArrowDownUp,
      ArrowLeft,
      ArrowRight,
      ArrowUp,
      ArrowUpDown,
      ArrowUpRight,
      Armchair,
      Baby,
      Bike,
      BookOpen,
      Bookmark,
      Building2,
      CarFront,
      Check,
      ChevronDown,
      ChevronRight,
      Coffee,
      Compass,
      Copy,
      DoorOpen,
      Download,
      Dumbbell,
      Footprints,
      GraduationCap,
      House,
      Info,
      Layers,
      MapPin,
      Minus,
      Mountain,
      MoveUpRight,
      Navigation,
      Pause,
      Pencil,
      Play,
      Plus,
      RotateCcw,
      Route,
      Search,
      ShoppingBasket,
      SlidersHorizontal,
      SquareParking,
      TrainFront,
      Trash2,
      Trees,
      Users,
      X,
    },
    attrs: { "stroke-width": 1.7, "aria-hidden": "true" },
  });
}
export const icon = (name: string) => `<i data-lucide="${name}"></i>`;
export function getElement<T extends HTMLElement>(selector: string, kind: { new (): T }): T {
  const element = document.querySelector(selector);
  if (!(element instanceof kind)) throw new TypeError(`Missing UI element: ${selector}`);
  return element;
}
export function shell(root: HTMLElement): void {
  root.innerHTML = `<header class="app-header"><a class="brand" href="/"><span class="brand-mark">${icon("house")}</span><strong>한바퀴<span class="brand-dot">.</span></strong><span class="brand-caption">살아볼 동네를, 먼저 걸어요</span></a><nav class="header-actions" aria-label="주요 메뉴"><button class="quiet catalog-button" data-action="catalog" aria-label="서울 단지 도감">${icon("compass")}<span>서울 단지 도감</span></button><span class="header-divider"></span><button class="quiet" data-action="sources" aria-label="정보 출처">${icon("info")}<span>정보 출처</span></button><button class="notebook-button" data-action="notebook" aria-label="나의 수첩">${icon("book-open")}<span>나의 수첩</span> <b id="note-count">0</b></button></nav></header>
  <main class="app-main"><aside class="sidebar" aria-label="단지와 탐색 장소"><div id="complex-intro"></div><div id="journey"></div><div class="places-heading"><h2>어디까지 걸어볼까요?</h2><span id="place-count"></span></div><div class="filters" role="group" aria-label="장소 종류"><button data-filter="all" aria-pressed="true">전체</button><button data-filter="transport" aria-pressed="false">교통</button><button data-filter="school" aria-pressed="false">교육</button><button data-filter="life" aria-pressed="false">생활</button></div><div id="place-list" class="place-list"></div><div class="sponsor" id="sponsor"><span class="ad-tag">광고 데모</span><button data-action="ad" class="sponsor-link"><strong>좋은 동네 산책을 응원해요</strong><span>우리 동네 파트너 자리 ${icon("arrow-up-right")}</span></button><button data-action="dismiss-ad" class="icon-button ad-close" aria-label="광고 닫기">${icon("x")}</button></div><p class="sidebar-foot">직접 걸어볼 날을 위한 작은 예습.</p></aside>
  <section class="world" aria-label="단지 탐색 월드"><div id="world-stage" class="world-stage"></div><div id="world-labels" class="world-labels"></div><div class="world-top"><div class="scene-title"><span class="tiny-label">YOUR LITTLE NEIGHBORHOOD</span><strong id="scene-name">신당의 작은 일상</strong></div><button class="presence-button" data-action="invite">${icon("users")}<span id="presence-label">연결 중</span><span class="live-dot" id="live-dot"></span></button></div><div class="party-control"><div class="segmented" id="party-controls" role="group" aria-label="동행 캐릭터"></div><span>동행 캐릭터</span></div><div class="layer-control" id="layer-controls" role="group" aria-label="탐색 공간"></div><div class="camera-controls"><button class="icon-button compass-button" data-action="rotate" aria-label="시점 회전">${icon("compass")}<span>N</span></button><div class="camera-group"><button class="icon-button" data-action="zoom-in" aria-label="확대">${icon("plus")}</button><button class="icon-button" data-action="zoom-out" aria-label="축소">${icon("minus")}</button></div><button class="icon-button" data-action="reset-camera" aria-label="시점 초기화">${icon("rotate-ccw")}</button><button class="icon-button" data-action="help" aria-label="조작 방법">${icon("info")}</button></div><div class="world-caption"><span class="terrain-key"></span><span id="world-caption">실제 장소를 담은, 작은 체험 모형</span></div><div class="touch-pad" role="group" aria-label="방향 이동"><button data-direction="up" aria-label="화면 위쪽 길로">${icon("arrow-up")}</button><button data-direction="left" aria-label="화면 왼쪽 길로">${icon("arrow-left")}</button><button data-action="home" aria-label="출발점으로">${icon("navigation")}</button><button data-direction="right" aria-label="화면 오른쪽 길로">${icon("arrow-right")}</button><button data-direction="down" aria-label="화면 아래쪽 길로">${icon("arrow-down")}</button></div><div class="mode-dock"><div id="mode-controls" class="mode-controls" role="group" aria-label="이동 방식"></div><span class="dock-hint" id="mode-hint"></span></div><div id="trip-status" class="trip-status" role="status">장소를 고르고, 나의 속도로 출발해요.</div><div class="canvas-loading" id="canvas-loading"><span class="brand-mark">${icon("house")}</span><strong>동네를 펼치고 있어요</strong><span>잠시 후 산책을 시작해요</span></div></section></main><div id="toast" class="toast" role="status" hidden></div><dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title"></h2><button class="icon-button" data-action="close-dialog" aria-label="닫기">${icon("x")}</button></div><div id="dialog-body" class="dialog-body"></div></dialog>`;
  icons();
}
export function intro(complex: Complex): void {
  getElement("#complex-intro", HTMLElement).innerHTML =
    `<div class="eyebrow">${icon("map-pin")}${complex.district}<span>VOL. 0${complex.variant + 1}</span></div><button class="complex-picker" data-action="complexes"><h1>${complex.name}</h1>${icon("chevron-down")}</button><p class="intro-copy">${complex.theme}</p><div class="complex-facts"><div><strong>${complex.homes}</strong><span>세대</span></div><div><strong>${complex.buildings}</strong><span>개동</span></div><div><strong>${complex.built}</strong><span>입주 표기</span></div></div>`;
  getElement("#scene-name", HTMLElement).textContent =
    complex.variant === 0
      ? "신당의 작은 일상"
      : complex.variant === 1
        ? "왕십리의 작은 일상"
        : "행당의 새로운 일상";
  icons();
}
export function controls(mode: Mode, party: Party, layer: Layer): void {
  getElement("#mode-controls", HTMLElement).innerHTML = Object.entries(MODES)
    .map(
      ([id, m]) =>
        `<button data-mode="${id}" aria-pressed="${mode === id}">${icon(m.icon)}<span>${m.label}</span></button>`,
    )
    .join("");
  getElement("#party-controls", HTMLElement).innerHTML = Object.entries(PARTIES)
    .map(
      ([id, label]) =>
        `<button data-party="${id}" aria-pressed="${party === id}">${label}</button>`,
    )
    .join("");
  getElement("#layer-controls", HTMLElement).innerHTML = Object.entries(LAYERS)
    .map(
      ([id, label]) =>
        `<button data-layer="${id}" aria-pressed="${layer === id}">${icon(id === "ground" ? "trees" : id === "community" ? "coffee" : "square-parking")}<span>${label}</span>${id !== "ground" ? "<small>구조 예시</small>" : ""}</button>`,
    )
    .join("");
  getElement("#mode-hint", HTMLElement).textContent = MODES[mode].hint;
  getElement("#world-caption", HTMLElement).textContent =
    layer === "ground"
      ? "실제 좌표 기반 · 고도/출입 정보는 범례에서 확인"
      : "실내 구조 예시 · 실제 도면을 재현하지 않았어요";
  icons();
}
export function placeList(places: readonly Place[], selected: string, filter: string): void {
  getElement("#place-list", HTMLElement).innerHTML =
    places
      .map(
        (p) =>
          `<button class="place-row ${p.id === selected ? "selected" : ""}" data-place="${p.id}" aria-pressed="${p.id === selected}"><span class="place-icon">${icon(p.icon)}</span><span class="place-text"><strong>${p.name}</strong><small>${p.distance}</small></span>${icon("chevron-right")}</button>`,
      )
      .join("") ||
    '<p class="empty-state">이 공간에는 해당 종류의 장소가 없어요.<br>전체를 눌러 둘러보세요.</p>';
  document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset["filter"] === filter));
  });
  getElement("#place-count", HTMLElement).textContent = `${places.length}곳`;
  icons();
}
export function journey(
  place: Place,
  route: Journey | null,
  moving: boolean,
  arrived: boolean,
): void {
  const approached = (route?.endpointDistance ?? 0) > 6 && (route?.meters ?? Infinity) < 1;
  const reached = arrived || approached;
  getElement("#journey", HTMLElement).innerHTML =
    `<article class="journey"><div class="journey-eyebrow">${icon("route")}<span>${approached ? "인근 길에 도착했어요" : reached ? "도착했어요" : moving ? "지금 걷는 길" : "오늘의 목적지"}</span><button class="icon-button" data-action="place-detail" aria-label="${place.name} 자세히 보기">${icon("arrow-up-right")}</button></div><h2>${place.name}</h2><div class="journey-stats">${route ? `<strong>${Math.round(route.meters)}<small>m</small></strong><span>약 ${route.minutes}분</span><span>${route.basis === "spatial" ? "계단·출입 현장 확인" : route.stairs ? `계단 ${route.stairs}구간` : "등록 계단 없음"}</span>` : "<span>경로를 표시할 수 없어요</span>"}</div><p class="model-label">${route?.basis === "spatial" ? ((route.endpointDistance ?? 0) > 6 ? `목적지 약 ${Math.round(route.endpointDistance ?? 0)}m 인근 길까지 · 출입구 미확인` : "실제 좌표 기반 경로 추정 · 출입 여부 미확인") : place.layer === "ground" ? "동네 경로를 표시할 수 없어요 · 공간 자료와 이동 방식을 확인해 주세요" : "실내 구조 예시 · 실제 길찾기와 달라요"}</p><div class="journey-actions"><button class="primary-button" data-action="${reached ? "save-note" : moving ? "pause" : "start"}" ${!route ? "disabled" : ""}>${icon(reached ? "bookmark" : moving ? "pause" : "footprints")}<span>${reached ? "이곳을 수첩에 담기" : moving ? "잠시 멈추기" : "길안내 따라가기"}</span>${!reached && !moving ? icon("arrow-right") : ""}</button>${moving ? `<button class="icon-button secondary" data-action="cancel-trip" aria-label="이동 취소">${icon("x")}</button>` : ""}</div><button class="text-button" data-action="teleport-selected">${icon("navigation")}이곳에서 시작</button>${place.id === "community-door" || place.id === "parking-door" ? `<button class="text-button" data-action="enter">${icon("door-open")}구조 예시 안으로 들어가기</button>` : ""}</article>`;
  let quick = document.querySelector<HTMLButtonElement>("#quick-start");
  if (!quick) {
    quick = document.createElement("button");
    quick.id = "quick-start";
    quick.className = "quick-start";
    getElement(".world", HTMLElement).append(quick);
  }
  quick.dataset["action"] = reached ? "save-note" : moving ? "pause" : "start";
  quick.disabled = !route;
  quick.innerHTML = `<span>${place.short}<small>${reached ? "도착 · 수첩에 담기" : moving ? "이동 중 · 잠시 멈추기" : route ? `${Math.round(route.meters)}m · 체험 경로` : "도보로 바꿔보세요"}</small></span>${icon(reached ? "bookmark" : moving ? "pause" : "arrow-right")}`;
  icons();
}
export function showDialog(title: string, html: string): void {
  getElement("#dialog-title", HTMLElement).textContent = title;
  getElement("#dialog-body", HTMLElement).innerHTML = html;
  const dialog = getElement("#dialog", HTMLDialogElement);
  if (!dialog.open) dialog.showModal();
  icons();
}
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string): void {
  const element = getElement("#toast", HTMLElement);
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, 3500);
}
export function safeText(value: string): string {
  return escapeHtml(value);
}

export function presenceIndicator(connection: ConnectionStatus, peerCount: number): void {
  getElement("#presence-label", HTMLElement).textContent =
    connection === "connected"
      ? `나 포함 ${peerCount + 1}명`
      : connection === "connecting"
        ? "연결 중"
        : connection === "full"
          ? "정원 초과 · 혼자"
          : "혼자 탐색 중";
  getElement("#live-dot", HTMLElement).classList.toggle("connected", connection === "connected");
}

export function filterPlaces(
  places: readonly Place[],
  layer: Layer,
  filter: string,
): readonly Place[] {
  return places.filter(
    (p) =>
      p.layer === layer &&
      p.id !== "home" &&
      (filter === "all" ||
        (filter === "transport"
          ? p.icon === "train-front"
          : filter === "school"
            ? p.icon === "graduation-cap" || p.icon === "book-open"
            : p.icon !== "train-front" && p.icon !== "graduation-cap" && p.icon !== "book-open")),
  );
}
