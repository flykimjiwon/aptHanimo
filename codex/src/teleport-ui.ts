import type { Layer, Mode, Place } from "./data";
import type { World } from "./scene/world";
import { getElement, icon, safeText, showDialog, toast } from "./ui";

type TeleportContext = {
  readonly places: readonly Place[];
  readonly world: World | null;
  mode: Mode;
  layer: Layer;
  selected: string;
  readonly switchLayer: (layer: Layer) => void;
  readonly refresh: () => void;
  readonly status: (text: string) => void;
};

function evidenceLabel(place: Place): string {
  return place.source === "model" || place.layer !== "ground" ? "구조 예시" : "실제 좌표";
}

export function teleportToKnownPlace(context: TeleportContext, id: string): void {
  const place = context.places.find((candidate) => candidate.id === id) ?? null;
  const world = context.world;
  if (!place || !world) {
    toast(
      place ? "동네 자료를 읽은 뒤 시작 장소를 선택해 주세요." : "확인된 시작 장소가 아니에요.",
    );
    return;
  }
  if (context.layer !== place.layer) context.switchLayer(place.layer);
  context.selected = place.id;
  world.teleport(place.node);
  getElement("#world-stage", HTMLElement).dataset.currentNode = place.node;
  context.refresh();
  context.status(
    place.layer === "ground" && context.mode === "car"
      ? `${place.short} 인근 이동 가능한 길에서 시작해요`
      : `${place.short}에서 바로 둘러보기 시작해요`,
  );
}

export function showTeleportDialog(
  places: readonly Place[],
  selected: string,
  onSelect: (id: string) => void,
): void {
  showDialog(
    "어디에서 시작할까요?",
    `<p class="dialog-lead">확인하고 싶은 장소로 바로 이동해 그 주변부터 살펴보세요.</p><button class="primary-button" data-action="teleport-map">지도에서 직접 시작 위치 고르기</button><div class="place-list">${places
      .map(
        (place) =>
          `<button class="place-row${place.id === selected ? " selected" : ""}" data-teleport-id="${safeText(place.id)}" aria-pressed="${place.id === selected}"><span class="place-icon">${icon(place.icon)}</span><span class="place-text"><strong>${safeText(place.name)}</strong><small>${evidenceLabel(place)} · ${safeText(place.category)}</small></span>${icon("navigation")}</button>`,
      )
      .join(
        "",
      )}</div><p class="fine-print">자동차는 선택한 장소와 가장 가까운 이동 가능한 길에서 시작해요. 실내 장소는 실제 평면이 아닌 구조 예시입니다.</p>`,
  );
  const dialog = getElement("#dialog", HTMLDialogElement);
  dialog.querySelectorAll<HTMLButtonElement>("[data-teleport-id]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const id = button.dataset.teleportId;
        if (!id) return;
        onSelect(id);
        dialog.close();
      },
      { once: true },
    );
  });
}
