import { COMPLEXES, placesFor } from "./complexes";
import type { Note } from "./storage";

export function noteDestination(id: string) {
  const complex = COMPLEXES.find((item) => id.startsWith(`${item.id}:`));
  if (!complex) return null;
  const place = placesFor(complex).find((item) => id === `${complex.id}:${item.id}`);
  return place ? { complex, place } : null;
}

export function noteCheckChoices(note: Note): readonly string[] {
  return [...new Set([...(noteDestination(note.id)?.place.checks ?? []), ...note.checks])];
}

export function filterNotes(
  notes: readonly Note[],
  complex: string,
  query: string,
): readonly Note[] {
  const words = query.normalize("NFC").trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return [...notes].reverse().filter((note) => {
    if (complex !== "all" && noteDestination(note.id)?.complex.id !== complex) return false;
    const text = [note.complex, note.place, note.text, ...note.checks]
      .join(" ")
      .normalize("NFC")
      .toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function replaceNote(notes: readonly Note[], note: Note): readonly Note[] {
  return [...notes.filter((item) => item.id !== note.id), note];
}
