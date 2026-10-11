import type { ComplexId } from "./complexes";
import { DEFAULT_WORLD_STYLE, type WorldStyle, worldStyleSchema } from "./world-style";

const STORAGE_KEY = "hanbakwi-world-style-v1";
const STYLE_QUERY_KEYS = ["character", "building", "map", "view"] as const;
type WorldStyleUrlOptions = Readonly<{
  complex?: ComplexId;
  night?: boolean;
}>;

function browserUrl(): URL {
  return new URL(window.location.href);
}

function readStoredWorldStyle(): WorldStyle | null {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (serialized === null) return null;
    const stored: unknown = JSON.parse(serialized);
    const result = worldStyleSchema.safeParse(stored);
    return result.success ? result.data : null;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof DOMException) return null;
    throw error;
  }
}

export function readWorldStyle(): WorldStyle {
  const saved = readStoredWorldStyle() ?? DEFAULT_WORLD_STYLE;
  const params = browserUrl().searchParams;
  const character = worldStyleSchema.shape.character.safeParse(params.get("character"));
  const building = worldStyleSchema.shape.building.safeParse(params.get("building"));
  const map = worldStyleSchema.shape.map.safeParse(params.get("map"));
  const view = worldStyleSchema.shape.view.safeParse(params.get("view"));

  return worldStyleSchema.parse({
    character: character.success ? character.data : saved.character,
    building: building.success ? building.data : saved.building,
    map: map.success ? map.data : saved.map,
    view: view.success ? view.data : saved.view,
  });
}

export function saveWorldStyle(style: WorldStyle): boolean {
  const url = browserUrl();
  for (const key of STYLE_QUERY_KEYS) url.searchParams.set(key, style[key]);
  window.history.replaceState(window.history.state, "", url);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}

export function worldStyleUrl(style: WorldStyle, options: WorldStyleUrlOptions = {}): string {
  const current = browserUrl();
  const url = new URL("/", current);
  url.search = current.search;
  url.hash = current.hash;
  for (const key of STYLE_QUERY_KEYS) url.searchParams.set(key, style[key]);
  if (options.complex !== undefined) url.searchParams.set("complex", options.complex);
  if (options.night !== undefined) url.searchParams.set("night", options.night ? "1" : "0");
  return url.href;
}
