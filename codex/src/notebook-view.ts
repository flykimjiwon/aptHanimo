import { COMPLEXES, type Complex } from "./complexes";
import type { Place } from "./data";
import { filterNotes, noteCheckChoices, noteDestination } from "./notebook-model";
import { type Note, readNotes, readNotesState } from "./storage";
import { getElement, icon, icons, safeText, showDialog } from "./ui";

let query = "";
let complexFilter = "all";

function savedNote(note: Note): string {
  const destination = noteDestination(note.id);
  return `<article class="saved-note"><span class="eyebrow">${safeText(note.complex)} · ${safeText(note.date)}</span><h3>${safeText(note.place)}</h3><p class="note-copy">${safeText(note.text) || "체크한 항목을 기록했어요."}</p><p class="fine-print">직접 확인한 항목 ${note.checks.length}개</p>${note.checks.map((check) => `<p class="saved-check">${icon("check")}<span>${safeText(check)}</span></p>`).join("")}<div class="note-actions"><button class="quiet" data-edit-note="${safeText(note.id)}">${icon("pencil")}기록 수정</button><button class="quiet" data-revisit-note="${safeText(note.id)}" ${destination ? "" : "disabled"}>${icon("map-pin")}지도에서 보기</button><button class="text-button note-delete" data-delete-note="${safeText(note.id)}">${icon("trash-2")}삭제</button></div>${destination ? "" : '<p class="fine-print">현재 지도에 없는 장소예요. 기록 수정과 내려받기는 계속 사용할 수 있어요.</p>'}</article>`;
}

export function updateNotebookResults(): void {
  const search = getElement("#notebook-search", HTMLInputElement);
  query = search.value;
  complexFilter = getElement("#notebook-complex", HTMLSelectElement).value;
  const { notes, error } = readNotesState();
  const filtered = filterNotes(notes, complexFilter, query);
  if (error) {
    getElement("#notebook-result-count", HTMLElement).textContent = "수첩을 불러오지 못했어요";
    getElement("#notebook-results", HTMLElement).innerHTML =
      `<p role="alert">${safeText(error)}</p><button class="quiet" data-notebook-back>다시 읽기</button>`;
    return;
  }
  getElement("#notebook-result-count", HTMLElement).textContent =
    `${notes.length}개 중 ${filtered.length}개의 기록`;
  getElement("#notebook-results", HTMLElement).innerHTML = filtered.length
    ? filtered.map(savedNote).join("")
    : `<div class="empty-notebook">${icon("search")}<h3>${notes.length ? "일치하는 기록이 없어요" : "첫 산책을 기록해 보세요"}</h3><p>${notes.length ? "다른 검색어를 쓰거나 단지 선택을 바꿔 보세요." : "지도에서 장소를 고른 뒤 수첩에 기록하면 이곳에서 다시 이어갈 수 있어요."}</p>${notes.length ? '<button class="quiet" data-notebook-reset>검색 초기화</button>' : '<button class="quiet" data-action="close-dialog">지도로 돌아가기</button>'}</div>`;
  icons();
}

export function notebookDialog(): void {
  const notes = readNotes();
  showDialog(
    "나의 산책 수첩",
    `<section class="notebook-view"><div class="notebook-top"><p>기록을 찾고, 다음 산책을 이어가요.</p><button class="quiet" data-action="export-notes" ${notes.length ? "" : "disabled"}>${icon("download")}전체 내려받기</button></div><div class="notebook-filters"><label><span class="field-label">기록 검색</span><input id="notebook-search" type="search" maxlength="200" placeholder="장소, 메모, 확인한 항목" value="${safeText(query)}"></label><label><span class="field-label">단지</span><select id="notebook-complex"><option value="all">모든 단지</option>${COMPLEXES.map((complex) => `<option value="${complex.id}" ${complexFilter === complex.id ? "selected" : ""}>${complex.short}</option>`).join("")}</select></label></div><p id="notebook-result-count" class="fine-print" role="status" aria-live="polite"></p><div id="notebook-results"></div><p class="fine-print">이 브라우저에 저장된 개인 기록이에요. 지도에서 보기는 목적지를 선택하며, 실제 방문이나 출입 확인을 뜻하지 않아요.</p></section>`,
  );
  updateNotebookResults();
  getElement("#dialog", HTMLDialogElement).scrollTop = 0;
  getElement("#notebook-search", HTMLInputElement).focus({ preventScroll: true });
}

export function editNoteDialog(note: Note, fromNotebook: boolean): void {
  const choices = noteCheckChoices(note);
  showDialog(
    "이곳에서 떠오른 생각",
    `<div class="note-location">${icon("map-pin")}<span>${safeText(note.complex)} / ${safeText(note.place)}</span></div><form id="note-form" data-note-id="${safeText(note.id)}" data-from-notebook="${fromNotebook}"><label class="field-label" for="note-text">나의 임장 메모</label><textarea id="note-text" name="note" rows="5" maxlength="1500" placeholder="예: 유모차로 실제 출입구까지 걸어보고 싶다.">${safeText(note.text)}</textarea><h3>확인한 항목</h3><p class="fine-print">직접 확인한 항목만 체크해 주세요. 이전에 기록한 항목도 함께 표시해요.</p><div class="note-checks">${choices.map((check) => `<label><input type="checkbox" name="check" value="${safeText(check)}" ${note.checks.includes(check) ? "checked" : ""}><span>${safeText(check)}</span></label>`).join("")}</div><div class="note-actions"><button type="submit" class="primary-button">${icon("bookmark")}이 브라우저에 저장</button><button type="button" class="quiet" ${fromNotebook ? "data-notebook-back" : 'data-action="close-dialog"'}>취소</button></div></form><p class="fine-print">메모는 이 브라우저에만 저장됩니다. 수첩에서 파일로 내려받을 수 있어요.</p>`,
  );
  const feedback = document.createElement("p");
  feedback.id = "note-feedback";
  feedback.className = "note-feedback";
  feedback.setAttribute("role", "alert");
  feedback.tabIndex = -1;
  getElement("#note-form", HTMLFormElement).prepend(feedback);
  getElement("#dialog", HTMLDialogElement).scrollTop = 0;
  getElement("#note-text", HTMLTextAreaElement).focus({ preventScroll: true });
}

export function noteDialog(place: Place, complex: Complex): void {
  const id = `${complex.id}:${place.id}`;
  editNoteDialog(
    readNotes().find((note) => note.id === id) ?? {
      id,
      complex: complex.name,
      place: place.name,
      text: "",
      checks: [],
      date: "",
    },
    false,
  );
}
