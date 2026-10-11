import type { Group } from "three";
import type { CharacterStyle } from "../world-style";
import type { MaterialPalette } from "./materials";
import { pixelPerson } from "./pixel-person";
import { solidPerson } from "./solid-person";

export type PersonRendering = "atlas" | "solid";

export function personRendering(style: CharacterStyle): PersonRendering {
  switch (style) {
    case "crew-pixel":
    case "paper-scout":
    case "ink-friend":
    case "sticker-pop":
      return "atlas";
    case "round-buddy":
    case "voxel-walker":
    case "plush-crew":
    case "bead-crew":
    case "rubber-hose":
    case "leaf-guide":
      return "solid";
  }
}

export function styledPerson(
  name: string,
  style: CharacterStyle,
  options: { readonly color: string; readonly palette: MaterialPalette },
): Group {
  switch (style) {
    case "crew-pixel":
    case "paper-scout":
    case "ink-friend":
    case "sticker-pop":
      return pixelPerson(name, options.color, style);
    case "round-buddy":
    case "voxel-walker":
    case "plush-crew":
    case "bead-crew":
    case "rubber-hose":
    case "leaf-guide":
      return solidPerson(name, style, options);
  }
}
