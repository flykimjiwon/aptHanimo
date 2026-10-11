import { readTravelSpeed, TRAVEL_SPEEDS } from "./movement-speed";
import type { SpatialWorld } from "./spatial/types";
import { getElement, icon, icons, safeText, showDialog } from "./ui";

let spatial: SpatialWorld | null = null;

export type WorldToolState = {
  readonly night: boolean;
  readonly economy: boolean;
  readonly zoomPercent: number;
};

type GameHUDState = WorldToolState & {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly following: boolean;
  readonly screen: { readonly x: number; readonly y: number; readonly visible: boolean };
  readonly ground: boolean;
  readonly requestedZoom: number;
  readonly fps: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly pixelRatio: number;
};

export function mountGameUI(): void {
  const speed = readTravelSpeed();
  const speedOptions = TRAVEL_SPEEDS.map(
    (value) => `<option value="${value}" ${value === speed ? "selected" : ""}>${value}×</option>`,
  ).join("");
  getElement(".touch-pad", HTMLElement).outerHTML =
    `<div class="joystick-wrap"><div id="joystick" role="slider" tabindex="0" aria-label="자유 이동 조이스틱. 키보드는 WASD 또는 방향키" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="joystick-ring"></span><span id="joystick-knob">${icon("navigation")}</span></div><span>자유롭게 걸어요</span></div>`;
  getElement(".world", HTMLElement).insertAdjacentHTML(
    "beforeend",
    `<div class="world-tools" role="group" aria-label="월드 보기 설정"><button data-action="world-style" aria-label="캐릭터·건물·지도·시점 스타일 선택"><span>스타일</span></button><button data-world-tool="night" aria-pressed="false" aria-label="밤 분위기 켜기"><span>밤</span></button><button data-world-tool="economy" aria-pressed="false" aria-label="부드러운 성능 모드 켜기"><span>부드럽게</span></button><output id="zoom-readout" aria-label="확대 100퍼센트">100%</output><label class="speed-control" for="travel-speed"><span>이동 속도</span><select id="travel-speed">${speedOptions}</select></label></div><button class="mini-map" data-action="map-evidence" aria-label="우리 동네 지도 N ↑ 지도 · 높낮이 · 범례 보기"><span class="mini-map-title">우리 동네 지도 <b>N ↑</b></span><svg id="mini-map-svg" aria-hidden="true"></svg><span class="mini-map-foot">지도 · 높낮이 · 범례 ${icon("arrow-up-right")}</span></button><div class="game-hud"><span class="game-badge">FREE WALK</span><span id="ground-height">실제 공간 자료를 읽는 중</span></div><span id="player-name" class="player-name" aria-hidden="true">나</span><div class="game-shortcuts"><button class="quiet" data-action="teleport-picker">${icon("map-pin")}순간이동</button><button class="quiet" data-action="follow-camera">${icon("navigation")}<span id="camera-mode">동네 전체</span></button><button class="quiet" data-action="home">${icon("house")}출발점</button></div>`,
  );
  const presence = getElement(".presence-button", HTMLButtonElement);
  const topActions = document.createElement("div");
  topActions.className = "world-top-actions";
  topActions.innerHTML =
    '<a class="style-lab-link" href="/style-lab.html">스타일 실험실 · <b>30</b></a>';
  presence.before(topActions);
  topActions.append(presence);
  getElement("#trip-status", HTMLElement).textContent =
    "WASD · 방향키 · 조이스틱으로 자유롭게 산책해요";
  icons();
}
function svgWorld(data: SpatialWorld, marker: boolean): string {
  const core = data.buildings.filter((b) => b.kind === "core").flatMap((b) => b.ring);
  const area =
    !marker && core.length
      ? {
          minX: Math.min(...core.map((p) => p[0])) - 70,
          minZ: Math.min(...core.map((p) => p[1])) - 70,
          maxX: Math.max(...core.map((p) => p[0])) + 70,
          maxZ: Math.max(...core.map((p) => p[1])) + 70,
        }
      : data.bounds;
  const { minX, minZ, maxX, maxZ } = area;
  const line = (points: readonly (readonly [number, number])[]) =>
    points.map((p) => p.join(",")).join(" ");
  return `<svg viewBox="${minX} ${minZ} ${maxX - minX} ${maxZ - minZ}" aria-label="북쪽이 위인 단지 주변 실제 좌표 지도"><rect x="${minX}" y="${minZ}" width="${maxX - minX}" height="${maxZ - minZ}" fill="#e4edce"/>${data.paths.map((p) => `<polyline points="${line(p.points)}" fill="none" stroke="${p.kind === "road" ? "#a9b3a6" : p.kind === "steps" ? "#c67447" : "#fffaf0"}" stroke-width="${Math.max(2, p.width)}" stroke-linecap="round"/>`).join("")}${data.buildings.map((b) => `<polygon points="${line(b.ring)}" fill="${b.kind === "core" ? "#d98258" : "#b3bbaa"}" stroke="#f7f5ed" stroke-width="1"/>`).join("")}${data.pois.map((p) => `<circle cx="${p.position[0]}" cy="${p.position[1]}" r="5" fill="#355f4a"/>`).join("")}${marker ? '<circle id="mini-player" cx="0" cy="0" r="9" fill="#1a5f46" stroke="white" stroke-width="4"/>' : ""}</svg>`;
}
export function setSpatialUI(data: SpatialWorld): void {
  if (spatial === data) return;
  spatial = data;
  const mini = document.querySelector("#mini-map-svg");
  if (!(mini instanceof SVGElement)) throw new TypeError("Missing minimap");
  mini.outerHTML = svgWorld(data, true).replace("<svg ", '<svg id="mini-map-svg" ');
  getElement("#world-caption", HTMLElement).textContent =
    "실제 건물·도로 좌표 · DEM 지형 · 시설 출입은 현장 확인";
}
export function updateWorldToolControls(state: WorldToolState): void {
  const night = getElement('[data-world-tool="night"]', HTMLButtonElement);
  night.setAttribute("aria-pressed", String(state.night));
  night.setAttribute("aria-label", state.night ? "낮 분위기로 바꾸기" : "밤 분위기 켜기");
  const economy = getElement('[data-world-tool="economy"]', HTMLButtonElement);
  economy.setAttribute("aria-pressed", String(state.economy));
  economy.setAttribute(
    "aria-label",
    state.economy ? "기본 화질로 바꾸기" : "부드러운 성능 모드 켜기",
  );
  const zoom = getElement("#zoom-readout", HTMLOutputElement);
  zoom.value = `${state.zoomPercent}%`;
  zoom.setAttribute("aria-label", `확대 ${state.zoomPercent}퍼센트`);
}

export function updateGameHUD(state: GameHUDState): void {
  const { position, following, screen, ground } = state;
  const stage = getElement("#world-stage", HTMLElement);
  stage.dataset.playerX = position.x.toFixed(2);
  stage.dataset.playerY = position.y.toFixed(2);
  stage.dataset.playerZ = position.z.toFixed(2);
  stage.dataset.zoom = String(state.zoomPercent);
  stage.dataset.requestedZoom = state.requestedZoom.toFixed(3);
  stage.dataset.fps = String(state.fps);
  stage.dataset.drawcalls = String(state.drawCalls);
  stage.dataset.triangles = String(state.triangles);
  stage.dataset.dpr = state.pixelRatio.toFixed(2);
  stage.dataset.time = state.night ? "night" : "day";
  stage.dataset.economy = String(state.economy);
  const tag = getElement("#player-name", HTMLElement);
  tag.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%, -100%)`;
  tag.hidden = !screen.visible;
  const marker = document.querySelector("#mini-player");
  marker?.setAttribute("cx", String(position.x));
  marker?.setAttribute("cy", String(position.z));
  const label = getElement("#ground-height", HTMLElement);
  label.textContent =
    spatial && ground
      ? `지형 고도 약 ${Math.round(position.y + spatial.origin.elevation)}m · DEM`
      : "구조 예시 둘러보기";
  getElement("#camera-mode", HTMLElement).textContent = following ? "동네 전체" : "캐릭터 따라가기";
  updateWorldToolControls(state);
}
export function mapEvidence(): void {
  if (!spatial) return;
  const d = spatial;
  const elevations = d.elevation.values;
  showDialog(
    "실제 지도에서 시작한 동네",
    `<p class="dialog-lead">${safeText(d.name)}의 실제 좌표를 같은 축척으로 옮겼어요.</p><div class="evidence-map">${svgWorld(d, false)}</div><div class="map-legend"><span><i class="core"></i>단지 건물</span><span><i class="context"></i>주변 건물</span><span><i class="road"></i>도로</span><span><i class="walk"></i>보행로</span><span><i class="steps"></i>계단 표기</span><span>월드 등고선 · 5m 간격</span></div><div class="source-date">북쪽 ↑ · 1 월드 단위 = 1m · 건물 ${d.buildings.length}개 / 도로·보행선 ${d.paths.length}개</div><section class="source-section"><h3>고도와 공간의 정확도</h3><p>이 지역 고도 자료 범위 약 ${Math.round(Math.min(...elevations))}~${Math.round(Math.max(...elevations))}m. ${safeText(d.elevation.resolution)}.</p><p>${safeText(d.elevation.status)} 도로 폭과 미등록 건물 높이는 시각화 추정이 포함됩니다. 미세한 문턱·경사로·출입 허가를 확인한 자료가 아닙니다.</p><p>건물 외관은 단지별 실제 사진을 참고해 단순화했어요. 로고는 공식 원본을 사용하며, 부착 위치·창 수·옥상 장식은 실측하지 않은 게임 표현입니다. 건물 기단은 DEM에 맞춘 표현이며 실제 옹벽 도면이 아닙니다.</p><p>공원 경계와 지상 철도 위치는 OpenStreetMap 자료를 반영했습니다. 철도 높이·폭·침목은 표현상 추정이며 통행 가능성을 뜻하지 않습니다.</p></section>${d.sources.map((s) => `<section class="source-section"><a href="${safeText(s.url)}" target="_blank" rel="noreferrer">${safeText(s.title)} ${icon("arrow-up-right")}</a><p class="fine-print">${safeText(s.note)} · 확인 ${safeText(s.checked)}</p></section>`).join("")}`,
  );
}
