import { z } from "zod";
import { noteCheckChoices, noteDestination, replaceNote } from "./notebook-model";
import { editNoteDialog, notebookDialog, updateNotebookResults } from "./notebook-view";
import { readNotes, readNotesState, writeNotes } from "./storage";
import { getElement, safeText, showDialog, toast } from "./ui";
export function bindNotebook(context: {
  readonly revisit: (id: string) => Promise<boolean>;
  readonly refresh: () => void;
}): void {
  document.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.id === "notebook-search")
      updateNotebookResults();
  });
  document.addEventListener("change", (event) => {
    if (event.target instanceof HTMLSelectElement && event.target.id === "notebook-complex")
      updateNotebookResults();
  });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const { editNote, deleteNote: deleteId, revisitNote } = button.dataset;
    if (editNote) {
      const note = readNotes().find((item) => item.id === editNote);
      if (note) editNoteDialog(note, true);
    } else if (deleteId) {
      const note = readNotes().find((item) => item.id === deleteId);
      if (!note) return;
      showDialog(
        "이 기록을 삭제할까요?",
        `<p>${safeText(note.complex)} / ${safeText(note.place)}</p><p class="fine-print">메모와 체크한 항목이 이 브라우저에서 삭제됩니다.</p><div class="note-actions"><button class="quiet" data-notebook-back>취소</button><button class="text-button note-delete" data-confirm-delete-note="${safeText(deleteId)}">기록 삭제</button></div>`,
      );
      getElement("[data-notebook-back]", HTMLButtonElement).focus();
    } else if (button.dataset.confirmDeleteNote)
      deleteNote(button.dataset.confirmDeleteNote, context.refresh);
    else if (revisitNote) {
      button.disabled = true;
      button.textContent = "지도를 여는 중…";
      void context.revisit(revisitNote).then((opened) => {
        if (!button.isConnected) return;
        if (opened) getElement("#dialog", HTMLDialogElement).close();
        else {
          button.disabled = false;
          button.textContent = "지도에서 보기";
          const row = button.closest("article");
          const message = row?.querySelector(".note-map-feedback") ?? document.createElement("p");
          message.className = "note-map-feedback fine-print";
          message.setAttribute("role", "alert");
          message.textContent =
            "장소를 열지 못했어요. 지도 연결과 장소 지원 여부를 확인한 뒤 다시 눌러 주세요. 기록은 그대로 보관돼요.";
          row?.append(message);
        }
      });
    } else if (button.hasAttribute("data-notebook-back")) notebookDialog();
    else if (button.hasAttribute("data-notebook-reset")) {
      getElement("#notebook-search", HTMLInputElement).value = "";
      getElement("#notebook-complex", HTMLSelectElement).value = "all";
      updateNotebookResults();
      getElement("#notebook-search", HTMLInputElement).focus();
    }
  });
  document.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== "note-form") return;
    event.preventDefault();
    const feedback = getElement("#note-feedback", HTMLElement);
    feedback.textContent = "";
    const fail = (message: string): void => {
      feedback.textContent = message;
      feedback.focus();
    };
    const form = new FormData(event.target);
    const result = z.string().max(1500).safeParse(form.get("note"));
    if (!result.success) {
      fail("메모는 1,500자 이내로 작성해 주세요.");
      return;
    }
    const id = event.target.dataset.noteId ?? "";
    const { notes, error } = readNotesState();
    if (error) {
      fail(error);
      return;
    }
    const previous = notes.find((note) => note.id === id);
    const destination = noteDestination(id);
    if (!previous && !destination) {
      fail("기록할 장소를 찾지 못했어요. 수첩을 다시 열어 주세요.");
      return;
    }
    const note = previous ?? {
      id,
      complex: destination?.complex.name ?? "",
      place: destination?.place.name ?? "",
      text: "",
      checks: [],
      date: "",
    };
    const choices = noteCheckChoices(note);
    const checks = choices.filter((check) => form.getAll("check").includes(check));
    if (!result.data.trim() && !checks.length) {
      fail("메모를 쓰거나 확인한 항목을 선택해 주세요.");
      return;
    }
    const updated = replaceNote(notes, {
      ...note,
      text: result.data.trim(),
      checks,
      date: new Date().toLocaleDateString("ko-KR"),
    });
    if (writeNotes(updated)) {
      if (event.target.dataset.fromNotebook === "true") notebookDialog();
      else getElement("#dialog", HTMLDialogElement).close();
      context.refresh();
      toast("수첩에 담았어요. 이 브라우저에 저장됩니다.");
    } else
      fail(
        "기록을 저장하지 못했어요. 저장 공간과 기록 수(최대 500개)를 확인하고 메모를 따로 복사해 주세요.",
      );
  });
}

export function deleteNote(id: string, refresh: () => void): void {
  if (writeNotes(readNotes().filter((n) => n.id !== id))) {
    notebookDialog();
    refresh();
    toast("기록을 삭제했어요.");
  } else toast("브라우저 저장 공간에 접근할 수 없어요.");
}
