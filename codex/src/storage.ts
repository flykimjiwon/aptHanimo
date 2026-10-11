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
export function readNotes(): Note[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof DOMException) return [];
    throw error;
  }
}
export function writeNotes(notes: readonly Note[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
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
