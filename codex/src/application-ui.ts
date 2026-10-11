import type { Controller } from "./controller";
import { setSpatialUI } from "./game-ui";
import type { SpatialWorld } from "./spatial/types";
import { readNotes } from "./storage";
import { controls, filterPlaces, getElement, intro, journey, placeList } from "./ui";

export function refreshApplication(app: Controller, spatial: SpatialWorld | null): void {
  intro(app.complex);
  controls(app.mode, app.party, app.layer);
  placeList(filterPlaces(app.places, app.layer, app.filter), app.selected, app.filter);
  const path = app.world?.planTo(app.place().id) ?? null;
  const arrived = app.world?.nearPlace === app.place().id;
  journey(app.place(), path, app.world?.moving ?? false, arrived);
  app.world?.setPlaces(app.places, app.selected);
  if (!app.world?.moving) app.world?.setRoute(path);
  const noteCount = readNotes().length;
  getElement("#note-count", HTMLElement).textContent = String(noteCount);
  getElement(".notebook-button", HTMLButtonElement).setAttribute(
    "aria-label",
    `나의 수첩 ${noteCount}`,
  );
  document.title = `${app.complex.short} · 한바퀴`;
  if (spatial && app.layer === "ground") setSpatialUI(spatial);
}
