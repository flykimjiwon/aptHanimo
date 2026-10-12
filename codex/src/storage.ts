import { z } from "zod";

const schema = z
  .array(
    z.object({
      id: z.string(),
      complex: z.string(),
      place: z.string(),
      text: z.string().max(1500),
      checks: z.array(z.string()),
      date: z.string(),
    }),
  )
  .max(500);
export type Note = z.infer<typeof schema>[number];
const KEY = "hanbakwi-notes-v1";
export function readNotesState(): { readonly notes: Note[]; readonly error: string | null } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { notes: [], error: null };
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { notes: parsed.data, error: null }
      : { notes: [], error: "저장된 수첩 형식을 읽을 수 없어요. 기존 데이터는 덮어쓰지 않았어요." };
  } catch (error) {
    if (error instanceof SyntaxError)
      return {
        notes: [],
        error: "저장된 수첩이 손상되어 읽을 수 없어요. 기존 데이터는 덮어쓰지 않았어요.",
      };
    if (error instanceof DOMException)
      return {
        notes: [],
        error:
          "브라우저 저장 공간에 접근할 수 없어요. 브라우저의 사이트 저장 설정을 확인해 주세요.",
      };
    throw error;
  }
}
export function readNotes(): Note[] {
  return readNotesState().notes;
}
export function writeNotes(notes: readonly Note[]): boolean {
  const parsed = schema.safeParse(notes);
  if (!parsed.success || readNotesState().error) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(parsed.data));
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}
export function downloadNotes(notes: readonly Note[]): void {
  const text =
    "# 한바퀴 · 나의 임장 수첩\n\n" +
    notes
      .map(
        (n) =>
          `## ${n.complex} · ${n.place}\n${n.date}\n\n${n.text}\n\n${n.checks.map((c) => `- [x] ${c}`).join("\n")}`,
      )
      .join("\n\n---\n\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "한바퀴_임장수첩.md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
