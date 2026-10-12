import "./world-style.css";
import type { StylePreview } from "./scene/style-preview";
import { BUILDING_STYLES } from "./style-lab/building-catalog";
import { CHARACTER_STYLES } from "./style-lab/character-catalog";
import { MAP_STYLES } from "./style-lab/map-catalog";
import { getElement, icon, safeText, showDialog } from "./ui";
import {
  BUILDING_IDS,
  type BuildingStyle,
  CHARACTER_IDS,
  type CharacterStyle,
  MAP_IDS,
  type MapStyle,
  VIEW_IDS,
  type WorldStyle,
  type WorldView,
  worldStyleSchema,
} from "./world-style";
import {
  extraStyleCopy,
  presetDescriptions,
  presetLabels,
  presets,
  viewLabels,
  WORLD_STYLE_PRESET_IDS,
} from "./world-style-presets";
import { worldStyleUrl } from "./world-style-storage";

type StyleCopy = Readonly<{ title: string; description: string }>;
type StyleSelection = {
  character: CharacterStyle;
  building: BuildingStyle;
  map: MapStyle;
  view: WorldView;
};
let activeDialogController: AbortController | null = null;

function styleCopy(family: "character" | "building" | "map", id: string): StyleCopy {
  if (family === "character") {
    const option = CHARACTER_STYLES.find((item) => item.id === id);
    return option
      ? { title: option.title, description: option.description }
      : { title: id, description: "캐릭터 표현 스타일이에요." };
  }
  if (family === "building") {
    const option = BUILDING_STYLES.find((item) => item.id === id);
    if (option) return { title: option.title, description: option.description };
    if (id === "realistic") return extraStyleCopy.building.realistic;
    return { title: id, description: "건물 표현 스타일이에요." };
  }
  const option = MAP_STYLES.find((item) => item.id === id);
  if (option) return { title: option.title, description: option.description };
  if (id === "realistic-neighborhood") return extraStyleCopy.map["realistic-neighborhood"];
  return { title: id, description: "동네 바탕 스타일이에요." };
}

function optionMarkup(
  ids: readonly string[],
  family: "character" | "building" | "map",
  selected: string,
): string {
  return ids
    .map((id) => {
      const option = styleCopy(family, id);
      return `<option value="${safeText(id)}" ${selected === id ? "selected" : ""}>${safeText(option.title)}</option>`;
    })
    .join("");
}

function selectorMarkup(
  family: "character" | "building" | "map",
  ids: readonly string[],
  state: { readonly title: string; readonly selected: string },
): string {
  const { title, selected } = state;
  const copy = styleCopy(family, selected);
  return `<label class="world-style-field"><span>${title}</span><select data-world-style="${family}" aria-label="${title}">${optionMarkup(ids, family, selected)}</select><small data-world-style-description="${family}">${safeText(copy.description)}</small></label>`;
}

function sameStyle(left: WorldStyle, right: WorldStyle): boolean {
  return (
    left.character === right.character &&
    left.building === right.building &&
    left.map === right.map &&
    left.view === right.view
  );
}

function selectorStyle(field: string, value: string, selection: StyleSelection): boolean {
  if (field === "character") {
    const parsed = worldStyleSchema.shape.character.safeParse(value);
    if (!parsed.success) return false;
    selection.character = parsed.data;
    return true;
  }
  if (field === "building") {
    const parsed = worldStyleSchema.shape.building.safeParse(value);
    if (!parsed.success) return false;
    selection.building = parsed.data;
    return true;
  }
  if (field === "map") {
    const parsed = worldStyleSchema.shape.map.safeParse(value);
    if (!parsed.success) return false;
    selection.map = parsed.data;
    return true;
  }
  return false;
}

function currentStyle(selection: StyleSelection): WorldStyle {
  return worldStyleSchema.parse(selection);
}

function dialogElement<T extends HTMLElement>(
  root: ParentNode,
  selector: string,
  kind: { new (): T },
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof kind)) throw new TypeError(`Missing style dialog element: ${selector}`);
  return element;
}

export function showWorldStyleDialog(
  style: WorldStyle,
  onChange: (style: WorldStyle) => void,
): void {
  activeDialogController?.abort();
  const selection: StyleSelection = { ...style };
  const presetButtons = WORLD_STYLE_PRESET_IDS.map(
    (id) =>
      `<button type="button" class="world-style-preset" data-world-style-preset="${id}" aria-pressed="${sameStyle(style, presets[id])}"><span class="concept-picture" aria-hidden="true"><canvas data-concept-thumbnail="${id}"></canvas><span class="concept-placeholder">미리보기 준비 중</span></span><span class="concept-title">${presetLabels[id]}<span class="concept-check">${icon("check")}</span></span><span class="concept-description">${presetDescriptions[id]}</span></button>`,
  ).join("");
  showDialog(
    "어떤 모습으로 걸어볼까요?",
    `<div class="world-style-dialog"><div class="world-style-layout"><section class="concept-preview-pane" aria-label="선택한 컨셉 미리보기"><span class="eyebrow">나의 작은 동네</span><h3 data-concept-name>나만의 조합</h3><div class="concept-preview" data-concept-preview><p class="concept-loading" role="status">친구들을 데려오는 중이에요</p></div><div class="concept-controls" role="group" aria-label="미리보기 조작"><button class="quiet" data-preview="left" aria-label="미리보기 왼쪽 회전" disabled>${icon("arrow-left")}</button><button class="quiet" data-preview="right" aria-label="미리보기 오른쪽 회전" disabled>${icon("arrow-right")}</button><button class="quiet" data-preview="reset" aria-label="미리보기 정면으로" disabled>${icon("rotate-ccw")}</button><button class="quiet" data-preview="walk" aria-pressed="false" disabled>걸음 보기</button></div><p class="world-style-lead">좌우로 돌려 친구들을 살펴보세요. 그림체를 비교하는 작은 모형이에요.</p><button type="button" class="primary-button concept-walk" data-action="close-dialog">${icon("footprints")}이 모습으로 산책하기</button></section><div class="concept-choices"><section class="world-style-preset-section" aria-labelledby="world-style-presets-title"><h3 id="world-style-presets-title">끌리는 컨셉을 골라보세요</h3><p class="world-style-lead">선택한 모습이 산책 중인 동네에도 바로 적용돼요.</p><div class="world-style-presets" role="group" aria-label="스타일 조합 추천">${presetButtons}</div></section><details class="world-style-custom"><summary>캐릭터·건물·시점을 직접 조합하기</summary><div class="world-style-selectors">${selectorMarkup("character", CHARACTER_IDS, { title: "동행 캐릭터", selected: selection.character })}${selectorMarkup("building", BUILDING_IDS, { title: "건물 표현", selected: selection.building })}${selectorMarkup("map", MAP_IDS, { title: "동네 바탕", selected: selection.map })}<label class="world-style-field"><span>시점</span><select data-world-style="view" aria-label="시점">${VIEW_IDS.map((id) => `<option value="${id}" ${selection.view === id ? "selected" : ""}>${viewLabels[id].title}</option>`).join("")}</select><small data-world-style-description="view">${safeText(viewLabels[selection.view].description)}</small></label></div></details><p class="world-style-note">그림체를 바꿔도 실제 지도와 이동 경로는 유지돼요. 2D·2.5D 시점도 직접 조합에서 고를 수 있어요.</p><div class="world-style-actions"><button type="button" data-world-style-share>조합 링크 복사</button><span role="status" aria-live="polite" data-world-style-status>지금 마음에 드는 컨셉을 골라보세요.</span></div></div></div></div>`,
  );

  const dialog = getElement("#dialog", HTMLDialogElement);
  const body = getElement("#dialog-body", HTMLElement);
  const controller = new AbortController();
  activeDialogController = controller;
  let preview: StylePreview | null = null;
  const updateName = (): void => {
    const id = WORLD_STYLE_PRESET_IDS.find((candidate) =>
      sameStyle(currentStyle(selection), presets[candidate]),
    );
    dialogElement(body, "[data-concept-name]", HTMLElement).textContent = id
      ? presetLabels[id]
      : "나만의 조합";
  };
  updateName();
  controller.signal.addEventListener("abort", () => preview?.dispose(), { once: true });
  void import("./scene/style-preview")
    .then(({ StylePreview: Preview }) => {
      if (controller.signal.aborted) return;
      preview = new Preview(
        dialogElement(body, "[data-concept-preview]", HTMLElement),
        currentStyle(selection),
        body,
      );
      dialogElement(body, ".world-style-dialog", HTMLElement).dataset.previewReady = "true";
      dialogElement(body, ".concept-loading", HTMLElement).hidden = true;
      body.querySelectorAll<HTMLButtonElement>("[data-preview]").forEach((button) => {
        button.disabled = false;
      });
    })
    .catch((error: unknown) => {
      if (!(error instanceof Error)) throw error;
      if (controller.signal.aborted) return;
      dialogElement(body, ".concept-loading", HTMLElement).textContent =
        "미리보기를 열지 못했어요. 아래 컨셉을 선택해 동네에서 확인할 수 있어요.";
      body.querySelectorAll<HTMLElement>(".concept-placeholder").forEach((item) => {
        item.textContent = "동네에서 확인하기";
      });
    });
  const apply = (): void => {
    const selected = currentStyle(selection);
    dialogElement(body, '[data-world-style="character"]', HTMLSelectElement).value =
      selected.character;
    dialogElement(body, '[data-world-style="building"]', HTMLSelectElement).value =
      selected.building;
    dialogElement(body, '[data-world-style="map"]', HTMLSelectElement).value = selected.map;
    dialogElement(body, '[data-world-style="view"]', HTMLSelectElement).value = selected.view;
    dialogElement(body, '[data-world-style-description="character"]', HTMLElement).textContent =
      styleCopy("character", selected.character).description;
    dialogElement(body, '[data-world-style-description="building"]', HTMLElement).textContent =
      styleCopy("building", selected.building).description;
    dialogElement(body, '[data-world-style-description="map"]', HTMLElement).textContent =
      styleCopy("map", selected.map).description;
    dialogElement(body, '[data-world-style-description="view"]', HTMLElement).textContent =
      viewLabels[selected.view].description;
    body.querySelectorAll<HTMLButtonElement>("[data-world-style-preset]").forEach((button) => {
      const id = WORLD_STYLE_PRESET_IDS.find(
        (candidate) => candidate === button.dataset["worldStylePreset"],
      );
      button.setAttribute(
        "aria-pressed",
        String(id !== undefined && sameStyle(selected, presets[id])),
      );
    });
    dialogElement(body, "[data-world-style-status]", HTMLElement).textContent =
      "현재 단지에 적용했어요. 조합을 비교하려면 계속 골라보세요.";
    onChange(selected);
    updateName();
    preview?.setStyle(selected);
  };

  body.addEventListener(
    "change",
    (event) => {
      if (!(event.target instanceof HTMLSelectElement)) return;
      const field = event.target.dataset["worldStyle"];
      let changed = false;
      if (field === "view") {
        const value = worldStyleSchema.shape.view.safeParse(event.target.value);
        if (value.success) {
          selection.view = value.data;
          changed = true;
        }
      } else {
        changed = selectorStyle(field ?? "", event.target.value, selection);
      }
      if (changed) apply();
    },
    { signal: controller.signal },
  );
  body.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>("button");
      if (!button) return;
      const previewAction = button.dataset.preview;
      if (previewAction && preview) {
        if (previewAction === "left") preview.rotate(-Math.PI / 4);
        else if (previewAction === "right") preview.rotate(Math.PI / 4);
        else if (previewAction === "reset") preview.reset();
        else if (previewAction === "walk") {
          const playing = preview.toggleWalk();
          button.setAttribute("aria-pressed", String(playing));
          button.textContent = playing ? "걸음 멈추기" : "걸음 보기";
        }
        return;
      }
      const preset = WORLD_STYLE_PRESET_IDS.find(
        (candidate) => candidate === button.dataset["worldStylePreset"],
      );
      if (preset !== undefined) {
        Object.assign(selection, presets[preset]);
        apply();
        return;
      }
      if (button.hasAttribute("data-world-style-share")) {
        const url = worldStyleUrl(currentStyle(selection));
        const status = dialogElement(body, "[data-world-style-status]", HTMLElement);
        if (!navigator.clipboard) {
          status.textContent = "주소창의 링크를 복사하면 같은 스타일로 열 수 있어요.";
          return;
        }
        void navigator.clipboard
          .writeText(url)
          .then(() => {
            status.textContent = "스타일 조합 링크를 복사했어요.";
          })
          .catch((error: unknown) => {
            if (error instanceof Error) status.textContent = "주소창의 링크를 복사해 주세요.";
            else throw error;
          });
      }
    },
    { signal: controller.signal },
  );
  dialog.addEventListener(
    "close",
    () => {
      controller.abort();
      if (activeDialogController === controller) activeDialogController = null;
    },
    { once: true, signal: controller.signal },
  );
}
