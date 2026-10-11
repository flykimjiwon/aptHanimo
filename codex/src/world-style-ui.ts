import "./world-style.css";
import { BUILDING_STYLES } from "./style-lab/building-catalog";
import { CHARACTER_STYLES } from "./style-lab/character-catalog";
import { MAP_STYLES } from "./style-lab/map-catalog";
import { getElement, safeText, showDialog, toast } from "./ui";
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
      `<button type="button" class="world-style-preset" data-world-style-preset="${id}" aria-pressed="${sameStyle(style, presets[id])}">${presetLabels[id]}</button>`,
  ).join("");
  showDialog(
    "월드 스타일",
    `<div class="world-style-dialog"><p class="world-style-lead">캐릭터, 건물, 지도와 시점을 고르면 지금 걷는 월드에 바로 적용돼요.</p><section class="world-style-preset-section" aria-labelledby="world-style-presets-title"><h3 id="world-style-presets-title">먼저 골라볼 조합</h3><div class="world-style-presets" role="group" aria-label="스타일 조합 추천">${presetButtons}</div></section><div class="world-style-selectors">${selectorMarkup("character", CHARACTER_IDS, { title: "동행 캐릭터", selected: selection.character })}${selectorMarkup("building", BUILDING_IDS, { title: "건물 표현", selected: selection.building })}${selectorMarkup("map", MAP_IDS, { title: "동네 바탕", selected: selection.map })}<label class="world-style-field"><span>시점</span><select data-world-style="view" aria-label="시점">${VIEW_IDS.map((id) => `<option value="${id}" ${selection.view === id ? "selected" : ""}>${viewLabels[id].title}</option>`).join("")}</select><small data-world-style-description="view">${safeText(viewLabels[selection.view].description)}</small></label></div><p class="world-style-note">표현만 바뀝니다. 실제 좌표, 고도, 길, 충돌, 이동 속도는 그대로예요.</p><div class="world-style-actions"><button type="button" data-world-style-share>조합 링크 복사</button><span role="status" aria-live="polite" data-world-style-status>선택하면 바로 적용돼요.</span></div></div>`,
  );

  const dialog = getElement("#dialog", HTMLDialogElement);
  const body = getElement("#dialog-body", HTMLElement);
  const controller = new AbortController();
  activeDialogController = controller;
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
        if (!navigator.clipboard) {
          toast("주소창의 링크를 복사하면 같은 스타일로 열 수 있어요.");
          return;
        }
        void navigator.clipboard
          .writeText(url)
          .then(() => toast("스타일 조합 링크를 복사했어요."))
          .catch((error: unknown) => {
            if (error instanceof Error) toast("주소창의 링크를 복사해 주세요.");
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
