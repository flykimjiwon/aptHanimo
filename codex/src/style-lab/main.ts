import "./lab.css";
import { z } from "zod";
import { loadBrandImages } from "../architecture/brand-images";
import { parseTravelSpeed } from "../movement-speed";
import { loadSpatial } from "../spatial/load";
import type { SpatialWorld } from "../spatial/types";
import { worldStyleSchema } from "../world-style";
import { worldStyleUrl } from "../world-style-storage";
import {
  CATALOG,
  type Category,
  categories,
  choiceDocument,
  readChoice,
  saveChoice,
} from "./choices";
import { bindLabControls } from "./controls";
import { renderGallery, renderRecipe } from "./gallery";
import { LabPreview } from "./preview";
import { mountLab } from "./shell";

function element<T extends HTMLElement>(selector: string, ctor: { new (): T }): T {
  const found = document.querySelector(selector);
  if (!(found instanceof ctor)) throw new TypeError(`Missing ${selector}`);
  return found;
}
mountLab(element("#lab-app", HTMLElement));
const choice = readChoice();
const preview = new LabPreview(element("#lab-canvas", HTMLCanvasElement), choice);
const releaseControls = bindLabControls(preview);
const gallery = element("#lab-gallery", HTMLElement);
let activeCategory: Category | "all" = "character";
let data: SpatialWorld | null = null;
let request = 0;
const status = (message: string): void => {
  element("#lab-status", HTMLElement).textContent = message;
};
function refresh(rebuild = false): void {
  preview.setChoice(choice);
  renderRecipe(element("#lab-recipe", HTMLElement), choice);
  if (rebuild) renderGallery(gallery, activeCategory, { choice, data });
  else
    gallery.querySelectorAll<HTMLButtonElement>("[data-style-category]").forEach((button) => {
      const category = z.enum(categories).safeParse(button.dataset.styleCategory);
      if (category.success)
        button.setAttribute("aria-pressed", String(choice[category.data] === button.dataset.style));
    });
  element("#lab-night", HTMLButtonElement).setAttribute("aria-pressed", String(choice.night));
  element("#lab-night", HTMLButtonElement).textContent = choice.night ? "낮 산책" : "밤 산책";
  element("#lab-complex", HTMLSelectElement).value = choice.complex;
  if (!saveChoice(choice))
    status("현재 브라우저는 저장을 허용하지 않아 링크로 조합을 보관할 수 있어요.");
}
async function changeComplex(): Promise<void> {
  const ticket = ++request;
  const loading = element("#lab-loading", HTMLElement);
  loading.hidden = false;
  loading.textContent = "동네를 펼치고 있어요";
  try {
    const [loaded, failedBrands] = await Promise.all([
      loadSpatial(choice.complex),
      loadBrandImages(),
    ]);
    if (ticket !== request) return;
    data = loaded;
    preview.setData(loaded);
    refresh(true);
    loading.hidden = true;
    status(
      failedBrands.length > 0
        ? `${loaded.name}을 열었어요 · 로고(${failedBrands.join(", ")})는 다음 단지 선택 때 다시 불러와요.`
        : `${loaded.name}의 실제 좌표로 스타일을 비교해요.`,
    );
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (ticket !== request) return;
    loading.innerHTML = '<button id="lab-retry">자료를 읽지 못했어요 · 다시 시도</button>';
    status("네트워크 연결과 로컬 서버 실행을 확인해 주세요.");
  }
}
function download(contents: Blob, name: string): void {
  const url = URL.createObjectURL(contents);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
const presets = {
  cozy: { character: "round-buddy", building: "soft-isometric", map: "soft-village" },
  pixel: { character: "crew-pixel", building: "pixel-blocks", map: "pixel-grid" },
  paper: { character: "paper-scout", building: "paper-cut", map: "paper-layers" },
} as const;
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("button");
  if (!button) return;
  const category = z.enum(categories).safeParse(button.dataset.styleCategory);
  if (
    category.success &&
    CATALOG[category.data].some((style) => style.id === button.dataset.style)
  ) {
    choice[category.data] = button.dataset.style ?? choice[category.data];
    refresh();
    status("선택한 스타일을 미리보기에 적용했어요.");
    return;
  }
  const tab = z.enum(["character", "building", "map", "all"]).safeParse(button.dataset.category);
  if (tab.success) {
    activeCategory = tab.data;
    document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((t) => {
      t.setAttribute("aria-pressed", String(t === button));
    });
    refresh(true);
    return;
  }
  const preset = z.enum(["cozy", "pixel", "paper"]).safeParse(button.dataset.preset);
  if (preset.success) {
    Object.assign(choice, presets[preset.data]);
    refresh();
    status("추천 조합을 적용했어요. 각 요소를 다시 바꿔도 좋아요.");
    return;
  }
  switch (button.id) {
    case "lab-night":
      choice.night = !choice.night;
      refresh();
      break;
    case "lab-zoom-in":
      preview.zoom(1.2);
      break;
    case "lab-zoom-out":
      preview.zoom(1 / 1.2);
      break;
    case "lab-reset":
      preview.reset();
      break;
    case "lab-play":
      preview.togglePlay();
      break;
    case "lab-retry":
      void changeComplex();
      break;
    case "lab-download":
      download(
        new Blob([choiceDocument(choice)], { type: "application/json" }),
        "한바퀴_내가고른_스타일.json",
      );
      status("조합과 제작 설명을 JSON으로 저장했어요. Claude에 그대로 전달할 수 있어요.");
      break;
    case "lab-open-world": {
      const worldStyle = worldStyleSchema.safeParse({
        character: choice.character,
        building: choice.building,
        map: choice.map,
        view: "isometric",
      });
      if (!worldStyle.success) {
        status("월드에서 지원하지 않는 스타일이 포함돼 있어요.");
        break;
      }
      window.location.assign(
        worldStyleUrl(worldStyle.data, { complex: choice.complex, night: choice.night }),
      );
      break;
    }
    case "lab-capture":
      preview.canvas.toBlob((blob) => {
        if (blob) download(blob, "한바퀴_스타일_미리보기.png");
      });
      status("미리보기 PNG를 저장했어요.");
      break;
    case "lab-share":
      if (!navigator.clipboard) {
        status("주소창의 링크를 복사하면 같은 조합을 열 수 있어요.");
        break;
      }
      void navigator.clipboard
        .writeText(location.href)
        .then(() => status("이 조합의 링크를 복사했어요."))
        .catch((error: unknown) => {
          if (error instanceof Error) status("주소창의 링크를 복사하면 같은 조합을 열 수 있어요.");
          else throw error;
        });
      break;
  }
});
element("#lab-complex", HTMLSelectElement).addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLSelectElement)) return;
  const complex = z.enum(["haiver", "xi", "cherbo"]).parse(event.target.value);
  choice.complex = complex;
  void changeComplex();
});
element("#lab-speed", HTMLSelectElement).addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLSelectElement)) return;
  const speed = parseTravelSpeed(event.target.value);
  if (speed) preview.travelSpeed.set(speed);
});
const timer = setInterval(() => {
  const button = element("#lab-play", HTMLButtonElement);
  button.setAttribute("aria-pressed", String(preview.isPlaying));
  button.textContent = preview.isPlaying ? "Ⅱ 잠시 쉬기" : "▷ 산책 시연";
}, 200);
window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  clearInterval(timer);
  releaseControls();
  preview.dispose();
});
refresh(true);
await changeComplex();
