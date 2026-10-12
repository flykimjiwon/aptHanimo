import "./style.css";
import "./responsive.css";
import "./game.css";
import { z } from "zod";
import { action } from "./actions";
import { loadBrandImages } from "./architecture/brand-images";
import { COMPLEXES } from "./complexes";
import { Controller } from "./controller";
import { mapEvidence, mountGameUI, updateWorldToolControls } from "./game-ui";
import { createMapTeleport } from "./map-teleport";
import { parseTravelSpeed, saveTravelSpeed } from "./movement-speed";
import { bindNotebook, deleteNote } from "./notebook";
import { getElement, shell, toast } from "./ui";
import { saveWorldStyle } from "./world-style-storage";
import { showWorldStyleDialog } from "./world-style-ui";

shell(getElement("#app", HTMLElement));
mountGameUI();
const app = new Controller();
const mapTeleport = createMapTeleport(app);
app.onGround = mapTeleport.onGround;
app.onSelectPlace = mapTeleport.cancel;
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;
  const data = button.dataset;
  if (
    data.complex ||
    data.layer ||
    data.mode ||
    data.place ||
    data.teleportId ||
    data.action === "teleport-selected" ||
    data.action === "teleport-picker" ||
    data.action === "home" ||
    data.action === "enter"
  )
    mapTeleport.cancel();
  if (!app.world && (data.complex || data.layer || data.mode || data.party || data.place)) {
    toast("동네 자료를 읽고 있어요. 잠시 후 선택해 주세요.");
    return;
  }
  if (data.action === "retry-world") void app.initialize();
  else if (data.action === "teleport-map") mapTeleport.arm();
  else if (data.action === "map-evidence") mapEvidence();
  else if (data.action === "world-style") {
    if (!app.world) return;
    showWorldStyleDialog(app.world.style, (style) => {
      app.world?.setStyle(style);
      if (!saveWorldStyle(style))
        toast("현재 브라우저에서는 스타일을 저장할 수 없어 링크로 보관해 주세요.");
    });
  } else if (data.action === "follow-camera") app.world?.rig.toggleFollow();
  else if (data.action) void action(data.action, app);
  if (data.worldTool === "night" && app.world) {
    app.world.presentation.toggleNight();
    updateWorldToolControls({
      night: app.world.presentation.night,
      economy: app.world.presentation.economy,
      zoomPercent: app.world.rig.zoomPercent,
    });
  }
  if (data.worldTool === "economy" && app.world) {
    app.world.presentation.toggleEconomy();
    updateWorldToolControls({
      night: app.world.presentation.night,
      economy: app.world.presentation.economy,
      zoomPercent: app.world.rig.zoomPercent,
    });
  }
  if (data.place) app.selectPlace(data.place);
  if (data.filter) {
    app.filter = data.filter;
    app.refresh();
  }
  const mode = z.enum(["walk", "stroller", "bike", "car"]).safeParse(data.mode);
  if (mode.success) app.setMode(mode.data);
  const party = z.enum(["solo", "couple", "family"]).safeParse(data.party);
  if (party.success) app.setParty(party.data);
  const layer = z.enum(["ground", "community", "parking"]).safeParse(data.layer);
  if (layer.success) app.switchLayer(layer.data);
  if (data.complex) {
    const complex = COMPLEXES.find((c) => c.id === data.complex);
    if (complex) void app.switchComplex(complex);
  }
  if (data.deleteNote) deleteNote(data.deleteNote, app.refresh);
});
document.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLSelectElement) || event.target.id !== "travel-speed") return;
  const speed = parseTravelSpeed(event.target.value);
  if (!speed) return;
  if (app.world) app.world.presentation.travelSpeed.set(speed);
  else saveTravelSpeed(speed);
});
bindNotebook({ place: app.place, complex: () => app.complex, refresh: app.refresh });
window.addEventListener("hashchange", () => app.reconnect());
window.addEventListener("pagehide", (event) => {
  if (event.persisted) app.suspendPresence();
  else app.dispose();
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  if (app.world) app.reconnect();
  else void app.initialize();
});
const failedBrands = await loadBrandImages();
await app.initialize();
if (new URLSearchParams(location.search).get("night") === "1")
  app.world?.presentation.toggleNight();
if (failedBrands.length > 0)
  toast(`건물 로고(${failedBrands.join(", ")})를 불러오지 못했지만 산책은 계속할 수 있어요.`);
