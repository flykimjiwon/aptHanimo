import type { SpatialWorld } from "../spatial/types";
import { drawBuildingPreview } from "./buildings";
import { drawCharacterPreview } from "./characters";
import { CATALOG, CATEGORY_NAMES, type Category, categories, styleCode } from "./choices";
import { drawMapPreview } from "./maps";
import type { LabChoice } from "./preview";

export function renderGallery(
  host: HTMLElement,
  active: Category | "all",
  state: { readonly choice: LabChoice; readonly data: SpatialWorld | null },
): void {
  const groups = active === "all" ? categories : [active];
  host.innerHTML = groups
    .flatMap((category) =>
      CATALOG[category].map(
        (style) =>
          `<button class="style-card" data-style-category="${category}" data-style="${style.id}" aria-pressed="${state.choice[category] === style.id}" aria-label="${styleCode(category, style.id)} ${style.title} ${CATEGORY_NAMES[category]} 선택"><div class="style-card-image"><canvas width="480" height="320" aria-hidden="true" data-preview="${style.id}"></canvas><span class="style-index">${styleCode(category, style.id)}</span><span class="style-selected">선택함</span></div><div class="style-card-copy"><h3>${style.title}</h3><p class="style-subtitle">${style.subtitle}</p><p class="style-description">${style.description}</p><span class="style-cost">${CATEGORY_NAMES[category]} · 화면 부담 ${style.cost}</span></div></button>`,
      ),
    )
    .join("");
  for (const category of groups) {
    for (const style of CATALOG[category]) {
      const canvas = host.querySelector(`[data-preview="${style.id}"]`);
      if (!(canvas instanceof HTMLCanvasElement)) continue;
      if (category === "character") drawCharacterPreview(canvas, style.id);
      else if (category === "building") drawBuildingPreview(canvas, style.id);
      else if (state.data) drawMapPreview(canvas, style.id, state.data);
    }
  }
}
export function renderRecipe(host: HTMLElement, choice: LabChoice): void {
  host.innerHTML = categories
    .map((category) => {
      const style = CATALOG[category].find((s) => s.id === choice[category]);
      return `<div class="recipe-line"><span class="recipe-code">${styleCode(category, choice[category])}</span><div><small>${CATEGORY_NAMES[category]}</small><strong>${style?.title ?? "스타일 선택"}</strong></div></div>`;
    })
    .join("");
}
