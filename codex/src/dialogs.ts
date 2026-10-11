import { COMPLEXES, type Complex } from "./complexes";
import { type Place, SOURCES } from "./data";
import { readNotes } from "./storage";
import { icon, safeText, showDialog } from "./ui";
export function chooseComplex(current: Complex): void {
  showDialog(
    "오늘은 어떤 동네를 걸어볼까요?",
    `<p class="dialog-lead">세 개의 단지, 서로 다른 일상.<br>각 단지의 정보와 주변 장소를 만나보세요.</p><div class="complex-grid">${COMPLEXES.map((c) => `<button class="complex-option ${c.id === current.id ? "active" : ""}" data-complex="${c.id}"><span class="mini-building variant-${c.variant}"><b></b><b></b><b></b><i></i></span><span class="eyebrow">${c.district}</span><strong>${c.name}</strong><span>${c.homes}세대 · ${c.buildings}개동 · ${c.built}</span><small>${c.theme}</small><span class="complex-option-cta">${c.id === current.id ? "지금 탐색 중" : "이 동네로 이동"} ${icon("arrow-right")}</span></button>`).join("")}</div><p class="fine-print">각 단지의 실제 건물 윤곽·도로·고도 자료를 개별로 불러옵니다. 범례에서 자료 출처와 추정 범위를 확인하세요.</p>`,
  );
}
export function sourceDialog(complex: Complex): void {
  const officialId =
    complex.id === "haiver" ? "A10078901" : complex.id === "xi" ? "A10026900" : "A10020503";
  const discrepancy =
    complex.id === "haiver"
      ? "서울시 공개 목록에 임대 1동이 별도 관리 레코드로 존재합니다. 주차 대수도 공식 목록 794대, 호갱노노 지하 968대로 달라 집계 범위를 확인해야 합니다."
      : complex.id === "xi"
        ? "동수는 호갱노노 7동, 서울시 공식 목록 6동으로 다릅니다. 화면의 동수는 호갱노노 표기를 사용합니다. 공식 주차대수는 933대이며 도로명주소는 공식 자료를 따릅니다."
        : "서울시 목록은 세대수 0으로 등록돼 있어 실제 0세대로 해석하지 않았습니다. 화면의 958세대·2025.07은 호갱노노 표기이며 공식 목록은 7동·주차 1,239대입니다.";
  showDialog(
    "작은 월드, 투명한 정보",
    `<p class="dialog-lead">확인한 사실과 체험을 위한 모형을 구분했어요.</p><div class="source-date">조사 기준 2026.10.11 · 실시간 갱신 아님</div><section class="source-section"><span class="evidence-tag">출처 확인</span><h3>${complex.name}</h3><p>${complex.homes}세대 · ${complex.buildings}개동 · ${complex.built} 입주 표기<br>${complex.address}</p><a href="${complex.source}" target="_blank" rel="noreferrer">해당 단지 호갱노노 원문 ${icon("arrow-up-right")}</a>${complex.id === "haiver" ? `<a href="${SOURCES.official.url}" target="_blank" rel="noreferrer">서울시 공식 단지 정보 ${icon("arrow-up-right")}</a><a href="${SOURCES.naver.url}" target="_blank" rel="noreferrer">사용자가 제공한 네이버 지도 ${icon("arrow-up-right")}</a><p class="fine-print">동수는 공식 서울시·네이버 15개동, 호갱노노 16개동으로 다릅니다. 본문은 공식 수치를 우선합니다. 신당역 거리도 출입구에 따라 543m와 760m로 다릅니다.</p>` : ""}</section><section class="source-section"><span class="evidence-tag model">체험용 모델</span><h3>모형이 표현하는 것</h3><p>지상의 단지 건물 윤곽은 공개 지도 좌표, 주변 도로와 보행선은 OSM, 지형은 DEM 자료를 사용합니다. 건물 높이의 미등록값과 도로 폭에는 시각화 추정이 포함됩니다. 실내 평면은 구조 예시입니다.</p><p>1 월드 단위는 1m이며 실제 좌표의 상대 위치를 유지합니다. 길안내는 게임 내 충돌과 경로 모델에서 계산한 추정이며 실제 출입 가능 여부·보행 시간·통학 배정을 확인한 자료가 아닙니다.</p></section><section class="source-section"><span class="evidence-tag model">현장에서 확인할 것</span><p>실제 출입 가능한 문, 보도 폭, 계단·경사, 지하주차장과 동 연결, 시설 이용 조건. 커뮤니티의 개인 경험이나 질문을 검증된 결함으로 표현하지 않았습니다.</p></section><section class="source-section"><h3>원본 자료 차이</h3><p>${discrepancy}</p><a href="https://openapt.seoul.go.kr/openApt/index.do?aptCode=${officialId}" target="_blank" rel="noreferrer">서울시 공식 단지 정보 ${icon("arrow-up-right")}</a></section><section class="source-section"><h3>관심 단지 지표</h3><p>별도 조사 자료는 호갱노노의 구별 지난주 인기 지표(2026.09.28~10.04) 상위 10개씩, 총 250개입니다. 이 월드의 세 단지는 제작 대상으로 선정했으며 인기 순위를 뜻하지 않습니다.</p><p><a href="/data/seoul-popular-weekly.json" download>25개 구 주간 관심 단지 데이터 받기</a></p></section>`,
  );
}
export function placeDialog(place: Place, complex: Complex): void {
  showDialog(
    place.name,
    `<span class="evidence-tag ${place.source === "model" ? "model" : ""}">${place.source === "model" ? "체험용 구조" : "출처 확인"}</span><p class="dialog-lead">${place.description}</p><p class="detail-distance">${icon(place.icon)} ${place.distance}</p><h3>현장에서 확인해 볼 것</h3><ul class="check-list">${place.checks.map((c) => `<li>${icon("check")}${c}</li>`).join("")}</ul><div class="dialog-actions"><button class="primary-button" data-action="save-note">${icon("bookmark")}수첩에 기록하기</button><a class="secondary-link" href="${place.source === "official" && complex.id === "haiver" ? SOURCES.official.url : complex.source}" target="_blank" rel="noreferrer">원본 정보 ${icon("arrow-up-right")}</a></div>`,
  );
}
export function noteDialog(place: Place, complex: Complex): void {
  const previous = readNotes().find((n) => n.id === `${complex.id}:${place.id}`);
  showDialog(
    "이곳에서 떠오른 생각",
    `<div class="note-location">${icon("map-pin")}<span>${complex.short} / ${place.name}</span></div><form id="note-form"><label class="field-label" for="note-text">나의 임장 메모</label><textarea id="note-text" name="note" rows="5" maxlength="1500" placeholder="예: 유모차로 실제 출입구까지 걸어보고 싶다.">${safeText(previous?.text ?? "")}</textarea><h3>확인한 항목</h3><p class="fine-print">직접 확인한 항목만 체크해 주세요.</p><div class="note-checks">${place.checks.map((c, i) => `<label><input type="checkbox" name="check" value="${i}" ${previous?.checks.includes(c) ? "checked" : ""}><span>${c}</span></label>`).join("")}</div><button type="submit" class="primary-button">${icon("bookmark")}이 브라우저에 저장</button></form><p class="fine-print">메모는 이 브라우저에만 저장됩니다. 수첩에서 파일로 내려받을 수 있어요.</p>`,
  );
}
export function notebookDialog(): void {
  const notes = readNotes();
  showDialog(
    "나의 산책 수첩",
    `<div class="notebook-top"><p>${notes.length}개의 장소를 담았어요</p><button class="quiet" data-action="export-notes" ${notes.length ? "" : "disabled"}>${icon("download")}내려받기</button></div>${notes.length ? notes.map((n) => `<article class="saved-note"><span class="eyebrow">${safeText(n.complex)} · ${safeText(n.date)}</span><h3>${safeText(n.place)}</h3><p class="note-copy">${safeText(n.text) || "체크한 항목을 기록했어요."}</p>${n.checks.map((c) => `<span class="saved-check">${icon("check")}${safeText(c)}</span>`).join("")}<button class="text-button" data-delete-note="${safeText(n.id)}">기록 삭제</button></article>`).join("") : `<div class="empty-notebook">${icon("book-open")}<h3>아직 비어 있는 수첩</h3><p>마음에 드는 장소를 선택하고<br>확인하고 싶은 점을 기록해 보세요.</p></div>`}`,
  );
}
export function helpDialog(): void {
  showDialog(
    "나의 속도로, 한바퀴",
    `<div class="help-row">${icon("footprints")}<div><h3>원하는 방향으로 자유롭게</h3><p>WASD·방향키를 누르는 동안 계속 걸어요. 모바일은 왼쪽 조이스틱을 움직이세요. 직접 조작하면 길안내가 해제되고 현재 위치에서 바로 이어집니다.</p></div></div><div class="help-row">${icon("map-pin")}<div><h3>목적지까지 길안내</h3><p>장소를 고르고 길안내 따라가기를 눌러요. 빈 땅을 누르면 해당 지점까지 걸어가요. 건물과 이동 방식별 제한을 고려합니다.</p></div></div><div class="help-row">${icon("compass")}<div><h3>가까이 걷고, 넓게 살펴봐요</h3><p>카메라가 캐릭터를 따라옵니다. 드래그로 회전하고, 마우스 휠이나 트랙패드·모바일 두 손가락 핀치로 확대해 보세요. 작은 지도를 누르면 범례와 고도 출처를 볼 수 있어요.</p></div></div><div class="help-row">${icon("users")}<div><h3>같은 동네에서 만나요</h3><p>동행 버튼은 커플·가족 구성이에요. 같은 단지와 방 주소에 접속한 실제 이용자는 우리 Pixel Crew 캐릭터로 함께 보입니다.</p></div></div><p class="fine-print">2.5D 동네는 실제 건물 윤곽과 연속 DEM 지형 위에 그린 체험 모형입니다. 실제 문턱·경사로·출입 허가는 별도 확인이 필요해요. 커뮤니티와 지하는 실제 도면이 없는 구조 예시입니다.</p>`,
  );
}
export function adDialog(): void {
  showDialog(
    "산책을 이어주는 작은 광고",
    `<div class="ad-preview"><span class="ad-tag">광고 데모</span>${icon("coffee")}<h3>산책 뒤, 잠깐의 여유.</h3><p>이곳은 동네 카페·생활 서비스가<br>후원할 수 있는 가상 광고 자리입니다.</p></div><p>현재는 광고 SDK·추적·과금이 연결되지 않은 체험입니다. 입장 안내와 월드 배너처럼 자연스러운 지점에서 광고를 표시하고 바로 닫을 수 있도록 설계했어요.</p><button class="primary-button" data-action="close-dialog">산책 계속하기 ${icon("arrow-right")}</button>`,
  );
}
