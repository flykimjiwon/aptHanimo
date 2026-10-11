import { z } from "zod";
import type { Complex } from "./complexes";
import type { Place } from "./data";
import { notebookDialog } from "./dialogs";
import { readNotes, writeNotes } from "./storage";
import { getElement, toast } from "./ui";
export function bindNotebook(context: {
  readonly place: () => Place;
  readonly complex: () => Complex;
  readonly refresh: () => void;
}): void {
  document.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== "note-form") return;
    event.preventDefault();
    const form = new FormData(event.target);
    const result = z.string().max(1500).safeParse(form.get("note"));
    if (!result.success) {
      toast("메모는 1,500자 이내로 작성해 주세요.");
      return;
    }
    const target = context.place();
    const complex = context.complex();
    const checks = form.getAll("check").flatMap((value) => {
      const item = target.checks[Number(value)];
      return item ? [item] : [];
    });
    if (!result.data.trim() && !checks.length) {
      toast("메모를 쓰거나 확인한 항목을 선택해 주세요.");
      return;
    }
    const id = `${complex.id}:${target.id}`;
    const notes = readNotes().filter((n) => n.id !== id);
    notes.push({
      id,
      complex: complex.name,
      place: target.name,
      text: result.data.trim(),
      checks,
      date: new Date().toLocaleDateString("ko-KR"),
    });
    if (writeNotes(notes)) {
      getElement("#dialog", HTMLDialogElement).close();
      context.refresh();
      toast("수첩에 담았어요. 이 브라우저에 저장됩니다.");
    } else toast("저장 공간에 접근할 수 없어요. 메모를 따로 복사해 주세요.");
  });
}

export function deleteNote(id: string, refresh: () => void): void {
  if (writeNotes(readNotes().filter((n) => n.id !== id))) {
    notebookDialog();
    refresh();
    toast("기록을 삭제했어요.");
  } else toast("브라우저 저장 공간에 접근할 수 없어요.");
}
