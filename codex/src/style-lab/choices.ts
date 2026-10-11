import { z } from "zod";
import { BUILDING_STYLES } from "./buildings";
import { CHARACTER_STYLES } from "./characters";
import { MAP_STYLES } from "./map-catalog";
import type { LabChoice } from "./preview";

export const CATALOG = {
  character: CHARACTER_STYLES,
  building: BUILDING_STYLES,
  map: MAP_STYLES,
} as const;
export type Category = keyof typeof CATALOG;
export const CATEGORY_NAMES = { character: "캐릭터", building: "건물", map: "월드맵" } as const;
export const CATEGORY_PREFIX = { character: "C", building: "B", map: "M" } as const;
const DEFAULT: LabChoice = {
  character: "crew-pixel",
  building: "soft-isometric",
  map: "soft-village",
  complex: "haiver",
  night: false,
};
const schema = z.object({
  character: z.string(),
  building: z.string(),
  map: z.string(),
  complex: z.enum(["haiver", "xi", "cherbo"]),
  night: z.boolean(),
});
export const categories = ["character", "building", "map"] as const;

export function readChoice(): LabChoice {
  let saved: unknown = null;
  try {
    const text = localStorage.getItem("hanbakwi-style-choice");
    if (text) saved = JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError) && !(error instanceof DOMException)) throw error;
  }
  const stored = schema.safeParse(saved);
  const choice = stored.success ? stored.data : { ...DEFAULT };
  const params = new URLSearchParams(location.search);
  for (const category of categories) {
    const id = params.get(category) ?? choice[category];
    choice[category] = CATALOG[category].some((style) => style.id === id) ? id : DEFAULT[category];
  }
  const complex = z
    .enum(["haiver", "xi", "cherbo"])
    .safeParse(params.get("complex") ?? choice.complex);
  choice.complex = complex.success ? complex.data : "haiver";
  choice.night = params.has("night") ? params.get("night") === "1" : choice.night;
  return choice;
}
export function saveChoice(choice: LabChoice): boolean {
  const url = new URL(location.href);
  for (const category of categories) url.searchParams.set(category, choice[category]);
  url.searchParams.set("complex", choice.complex);
  url.searchParams.set("night", choice.night ? "1" : "0");
  history.replaceState(null, "", url);
  try {
    localStorage.setItem("hanbakwi-style-choice", JSON.stringify(choice));
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}
export function styleCode(category: Category, id: string): string {
  return `${CATEGORY_PREFIX[category]}${String(CATALOG[category].findIndex((style) => style.id === id) + 1).padStart(2, "0")}`;
}
export function choiceDocument(choice: LabChoice): string {
  return JSON.stringify(
    {
      project: "한바퀴 스타일 실험실",
      version: 3,
      savedAt: new Date().toISOString(),
      choice,
      styles: categories.map((category) => ({
        category,
        code: styleCode(category, choice[category]),
        ...CATALOG[category].find((style) => style.id === choice[category]),
      })),
      source:
        "사용자가 제작한 PixelCrew: stepped dome / white square eyes / pink cheeks / three block feet",
      geography:
        "동일한 실제 좌표 데이터, 스타일 비교용 높이 축약. 동선/실거주 사실은 본편에서 검증.",
      url: location.href,
    },
    null,
    2,
  );
}
