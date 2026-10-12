import { afterEach, expect, test } from "bun:test";
import { COMPLEXES, placesFor } from "./complexes";
import { filterNotes, noteCheckChoices, noteDestination, replaceNote } from "./notebook-model";
import { type Note, readNotes, readNotesState, writeNotes } from "./storage";

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const key = "hanbakwi-notes-v1";
const note: Note = {
  id: "haiver:station",
  complex: "하이베르",
  place: "신당역",
  text: "유모차 출입구 확인",
  checks: ["예전 확인 항목"],
  date: "2026. 10. 12.",
};
function storage(raw: string | null, blocked = false) {
  const values = new Map<string, string>(raw === null ? [] : [[key, raw]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (id: string) => values.get(id) ?? null,
      setItem: (id: string, value: string) => {
        if (blocked) throw new DOMException("Storage blocked", "QuotaExceededError");
        values.set(id, value);
      },
    },
  });
  return values;
}
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

test("legacy note IDs resolve every authored place in all three complexes", () => {
  for (const complex of COMPLEXES)
    for (const place of placesFor(complex)) {
      expect(noteDestination(`${complex.id}:${place.id}`)).toEqual({ complex, place });
    }
});
test("unknown or ambiguous saved destinations never fall back to another place", () => {
  for (const id of [
    "station",
    "xi:removed",
    "haiver:station:extra",
    "unknown:home",
    "haiver2:home",
  ])
    expect(noteDestination(id)).toBeNull();
});
test("search intersects complex and all query words across text and checked items", () => {
  const other = { ...note, id: "xi:station", complex: "왕십리자이" };
  const result = filterNotes([note, other], "xi", "  유모차   예전  ");
  expect(result).toEqual([other]);
});
test("search normalizes Korean Unicode and Latin case", () => {
  const result = filterNotes(
    [{ ...note, text: "Cafe 출입구" }],
    "all",
    "CAFE 출입구".normalize("NFD"),
  );
  expect(result).toHaveLength(1);
});
test("empty search returns newest saved records first without mutating storage order", () => {
  const notes = [note, { ...note, id: "xi:station" }];
  const result = filterNotes(notes, "all", "  ");
  expect(result.map((item) => item.id)).toEqual(["xi:station", "haiver:station"]);
  expect(notes[0]).toBe(note);
});
test("unmapped historical notes remain visible under all complexes", () => {
  const old = { ...note, id: "retired:gate" };
  expect(filterNotes([old], "all", "")).toEqual([old]);
});
test("editing preserves historical checks alongside current check choices", () => {
  const choices = noteCheckChoices(note);
  expect(choices).toContain("예전 확인 항목");
  expect(choices).toEqual([...new Set(choices)]);
  expect(choices.length).toBeGreaterThan(note.checks.length);
});
test("editing an unmapped note preserves its saved checks", () => {
  const choices = noteCheckChoices({ ...note, id: "old:missing" });
  expect(choices).toEqual(note.checks);
});
test("editing one complex does not overwrite the same place in another complex", () => {
  const other = { ...note, id: "xi:station" };
  const edited = { ...note, text: "새로운 메모" };
  const result = replaceNote([note, other], edited);
  expect(result).toEqual([other, edited]);
});
test("v1 records survive read and write without a key migration", () => {
  const values = storage(JSON.stringify([note]));
  expect(writeNotes(replaceNote(readNotes(), { ...note, text: "수정" }))).toBe(true);
  expect(JSON.parse(values.get(key) ?? "null")).toEqual([{ ...note, text: "수정" }]);
});
test("a 501st record is rejected before overwriting the readable 500 records", () => {
  const notes = Array.from({ length: 500 }, (_, i) => ({ ...note, id: `old:${i}` }));
  const raw = JSON.stringify(notes);
  const values = storage(raw);
  expect(writeNotes([...notes, note])).toBe(false);
  expect(values.get(key)).toBe(raw);
});
test("an overlong edit is rejected without losing the previous note", () => {
  const raw = JSON.stringify([note]);
  const values = storage(raw);
  expect(writeNotes([{ ...note, text: "x".repeat(1501) }])).toBe(false);
  expect(values.get(key)).toBe(raw);
});
test("malformed storage is reported and never silently replaced", () => {
  for (const raw of ["{", "", "{}", '[{"text":"only"}]']) {
    const values = storage(raw);
    expect(readNotesState().error).not.toBeNull();
    expect(writeNotes([note])).toBe(false);
    expect(values.get(key)).toBe(raw);
  }
});
test("blocked storage leaves the previous record untouched", () => {
  const raw = JSON.stringify([note]);
  const values = storage(raw, true);
  expect(writeNotes([{ ...note, text: "수정" }])).toBe(false);
  expect(values.get(key)).toBe(raw);
});
