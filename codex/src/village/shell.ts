import { PALETTES } from "../island/palettes";
import { BUDDIES, POSES, SPECIES } from "./options";

export function element<T extends HTMLElement>(selector: string, kind: { new (): T }): T {
  const node = document.querySelector(selector);
  if (!(node instanceof kind)) throw new TypeError(`Missing village element: ${selector}`);
  return node;
}
function choices(name: string, labels: Readonly<Record<string, string>>): string {
  return `<div class="v-choices">${Object.entries(labels)
    .map(
      ([id, label]) =>
        `<button type="button" data-${name}="${id}" aria-pressed="false"><span aria-hidden="true" class="v-check">✓</span>${label}</button>`,
    )
    .join("")}</div>`;
}
export function villageShell(): void {
  element("#app", HTMLDivElement).innerHTML =
    `<header class="v-header"><a class="v-brand" href="/"><img src="/favicon.svg" width="32" height="32" alt="">한바퀴</a><p>내 일상이 될 동네</p><button data-action="settings" aria-haspopup="dialog">꾸미기</button></header>
<main><section class="v-intro" aria-labelledby="v-title"><div><p class="v-eyebrow">작은 섬에서 시작하는 동네 산책</p><h1 id="v-title">왕십리자이</h1></div><label class="v-complex">동네 선택<select id="v-complex"><option value="xi">왕십리자이</option><option value="haiver">래미안신당하이베르</option><option value="cherbo">라체르보푸르지오써밋</option></select></label></section>
<section class="v-stage" aria-label="단지 지도"><div id="v-canvas"></div><div id="v-labels"></div><button id="v-friend" data-action="follow" hidden>친구 찾기</button><div class="v-compass"><span id="v-north" aria-hidden="true">↑</span><span>북</span></div><div class="v-camera" role="group" aria-label="지도 시점"><button data-action="rotate" aria-label="지도 회전">↻</button><button data-action="plus" aria-label="지도 확대">+</button><button data-action="minus" aria-label="지도 축소">−</button></div><div id="v-loading" role="status"><strong>동네를 펼치고 있어요.</strong><p>건물과 길을 준비하고 있어요.</p></div></section>
<section class="v-bottom" aria-label="산책 조작"><p id="v-status" role="status">드래그로 둘러보고, 바닥을 눌러 걸어가세요.</p><div class="v-dock"><button data-action="overview">전체 보기</button><button data-action="walk" class="v-primary" aria-pressed="false">산책 시작</button><button data-action="follow" aria-pressed="false">친구 따라가기</button><button data-action="top">위에서 보기</button></div><div class="v-tools"><label>동 살펴보기<select id="v-building"><option value="">동 번호로 찾기</option></select></label><button id="v-approach" data-action="approach" hidden>이 동 주변으로 걷기</button><button data-action="controls" aria-expanded="false" aria-controls="v-pad">직접 걷기</button></div><div id="v-pad" hidden role="group" aria-label="걷는 방향"><button data-direction="up" aria-label="앞으로 걷기">↑</button><button data-direction="left" aria-label="왼쪽으로 걷기">←</button><button data-direction="down" aria-label="뒤로 걷기">↓</button><button data-direction="right" aria-label="오른쪽으로 걷기">→</button></div></section>
<details class="v-sources"><summary>실제 지도와 모형의 차이</summary><p>단지 윤곽과 동 배치는 기존 지도 자료를 사용해요. 왕십리자이는 2026년 10월 12일 위성 화면과 대조했어요. 다른 두 단지는 이번에 위성 화면을 새로 대조하지 않았어요.</p><p>높이는 건물 55%·지형 35%로 줄였고, 나무·창문·지층은 연출이에요. 캐릭터는 모형의 빈 공간을 약 4배속으로 걸어요. 실제 출입 가능 여부나 도보 시간을 안내하는 경로는 아니에요. 라체르보 단지 안 보행로는 자료에 없어 임의의 길을 그리지 않았어요.</p><p>단지 지도: 호갱노노 · 길 © OpenStreetMap contributors / ODbL 1.0 · 지형 Mapzen/Tilezen Terrarium</p><nav aria-label="기존 화면"><a id="v-legacy" href="/world.html?complex=xi">생활권 지도·임장 수첩</a><a href="/island.html">이전 단지 섬</a><a href="/style-lab.html">디자인 실험실</a></nav></details></main>
<dialog id="v-settings" aria-labelledby="v-settings-title"><header><div><p class="v-eyebrow">내 취향의 작은 동네</p><h2 id="v-settings-title">친구와 분위기</h2></div><button data-action="close-settings" aria-label="꾸미기 닫기">×</button></header><div class="v-settings-body"><fieldset><legend>동네 분위기</legend>${choices("theme", Object.fromEntries(Object.entries(PALETTES).map(([id, p]) => [id, p.label])))}</fieldset><fieldset><legend>친구의 질감</legend>${choices("buddy", BUDDIES)}</fieldset><fieldset><legend>귀여운 귀</legend>${choices("species", SPECIES)}</fieldset><fieldset><legend>표정과 동작</legend>${choices("pose", POSES)}</fieldset><p>설정을 닫으면 친구를 가까이 볼 수 있어요. 걷기를 시작하면 자연스러운 동작으로 돌아와요.</p><button data-action="close-settings" class="v-primary">친구 보러 가기</button></div></dialog>`;
}
