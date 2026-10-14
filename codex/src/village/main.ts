import "./village.css";
import { markExplored } from "../community/journal";
import { PALETTES } from "../island/palettes";
import { loadSpatial } from "../spatial/load";
import { bindNeighborhood } from "./neighborhood";
import { poseSchema, preferenceSchema, preferenceUrl, readPreferences } from "./options";
import { bindPad } from "./pad";
import { VillageSession } from "./session";
import { element, villageShell } from "./shell";

villageShell();
element(".v-stage", HTMLElement).append(element("#v-pad", HTMLElement));
const play = document.createElement("div");
play.className = "v-play";
element(".v-stage", HTMLElement).before(play);
play.append(element(".v-stage", HTMLElement), element(".v-bottom", HTMLElement));
let preferences = readPreferences(new URL(location.href));
let session: VillageSession | null = null,
  revision = 0;
const events = new AbortController(),
  app = element("#app", HTMLDivElement);
const dialog = element("#v-settings", HTMLDialogElement),
  loading = element("#v-loading", HTMLElement);
const signal = events.signal;
const refreshNeighborhood = bindNeighborhood(() => session, signal);
bindPad(() => session, signal);
function sync(): void {
  document.body.dataset.theme = preferences.theme;
  document.documentElement.style.setProperty("--v-sky", PALETTES[preferences.theme].sky);
  for (const field of ["theme", "buddy", "species"] as const)
    document.querySelectorAll<HTMLButtonElement>(`button[data-${field}]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset[field] === preferences[field]));
    });
  element("#v-complex", HTMLSelectElement).value = preferences.complex;
  element("#v-legacy", HTMLAnchorElement).href = `/world.html?complex=${preferences.complex}`;
  history.replaceState(history.state, "", preferenceUrl(new URL(location.href), preferences));
}
async function openComplex(): Promise<void> {
  const current = ++revision;
  element(".v-stage", HTMLElement).dataset.ready = "false";
  session?.dispose();
  session = null;
  refreshNeighborhood();
  element("#v-approach", HTMLButtonElement).hidden = true;
  element(".v-bottom", HTMLElement).inert = true;
  element(".v-camera", HTMLElement).inert = true;
  loading.hidden = false;
  loading.innerHTML = "<strong>동네를 펼치고 있어요.</strong><p>건물과 길을 준비하고 있어요.</p>";
  sync();
  try {
    const world = await loadSpatial(preferences.complex);
    if (current !== revision || signal.aborted) return;
    session = new VillageSession(world, preferences);
    refreshNeighborhood();
    element("#v-title", HTMLElement).textContent = world.name;
    document.title = `${world.name} · 한바퀴`;
    loading.hidden = true;
    element(".v-bottom", HTMLElement).inert = false;
    element(".v-camera", HTMLElement).inert = false;
    element(".v-stage", HTMLElement).dataset.ready = "true";
  } catch (error: unknown) {
    if (current !== revision || signal.aborted) return;
    if (!(error instanceof Error)) throw error;
    session?.dispose();
    session = null;
    loading.innerHTML =
      '<strong>동네를 열지 못했어요.</strong><p>연결과 브라우저의 3D 지원을 확인하고 다시 시도해 주세요.</p><button data-action="retry">다시 시도</button><a href="/world.html">기존 생활권 지도 열기</a>';
  }
}
app.addEventListener(
  "change",
  (e) => {
    if (!(e.target instanceof HTMLSelectElement)) return;
    switch (e.target.id) {
      case "v-complex":
        preferences = preferenceSchema.parse({ ...preferences, complex: e.target.value });
        void openComplex();
        break;
      case "v-building":
        session?.selectBuilding(e.target.value);
        break;
    }
  },
  { signal },
);
app.addEventListener(
  "click",
  (e) => {
    if (!(e.target instanceof Element)) return;
    const button = e.target.closest("button");
    if (!button) return;
    for (const field of ["theme", "buddy", "species"] as const) {
      const value = button.dataset[field];
      if (value) {
        preferences = preferenceSchema.parse({ ...preferences, [field]: value });
        sync();
        if (field === "theme") session?.setPalette(preferences);
        else session?.setBuddy(preferences);
        if (field !== "theme") markExplored(preferences.complex, "buddy");
        return;
      }
    }
    const pose = poseSchema.safeParse(button.dataset.pose);
    if (pose.success) {
      session?.setPose(pose.data);
      return;
    }
    if (button.dataset.building) {
      session?.selectBuilding(button.dataset.building);
      return;
    }
    switch (button.dataset.action) {
      case "retry":
        void openComplex();
        break;
      case "settings":
        session?.pause();
        dialog.showModal();
        break;
      case "close-settings":
        dialog.close();
        break;
      case "show-friend":
        dialog.close();
        session?.follow();
        break;
      case "walk":
        session?.toggleWalk();
        break;
      case "follow":
        session?.follow();
        break;
      case "overview":
        session?.overview();
        break;
      case "top":
        session?.overview(true);
        break;
      case "rotate":
        session?.view.rig.rotate();
        break;
      case "plus":
        session?.view.rig.zoom(1.2);
        break;
      case "minus":
        session?.view.rig.zoom(1 / 1.2);
        break;
      case "approach":
        session?.approach();
        break;
      case "controls": {
        const pad = element("#v-pad", HTMLElement);
        pad.hidden = !pad.hidden;
        document.querySelectorAll('[data-action="controls"]').forEach((b) => {
          b.setAttribute("aria-expanded", String(!pad.hidden));
        });
        if (pad.hidden) session?.input([0, 0]);
        else {
          session?.follow();
          element(".v-stage", HTMLElement).scrollIntoView({ block: "nearest" });
        }
        break;
      }
    }
  },
  { signal },
);
dialog.addEventListener(
  "click",
  (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        dialog.close();
    }
  },
  { signal },
);
window.addEventListener(
  "pagehide",
  () => {
    revision++;
    events.abort();
    session?.dispose();
  },
  { once: true },
);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
void openComplex();
