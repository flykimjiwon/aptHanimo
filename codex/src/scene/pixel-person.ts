import {
  CanvasTexture,
  Group,
  LinearFilter,
  NearestFilter,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from "three";
import { drawCharacter } from "../style-lab/characters";
import type { CharacterStyle } from "../world-style";

export function pixelPerson(
  name: string,
  color: string,
  style: CharacterStyle = "crew-pixel",
): Group {
  const pixel = style === "crew-pixel";
  const cell = pixel ? { width: 32, height: 40 } : { width: 96, height: 112 };
  const canvas = document.createElement("canvas");
  canvas.width = cell.width * 4;
  canvas.height = cell.height * 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new TypeError("Pixel character canvas is unavailable");
  const headings = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
  for (const [direction, facing] of headings.entries()) {
    for (let step = 0; step < 4; step += 1) {
      ctx.save();
      ctx.translate(step * cell.width, direction * cell.height);
      drawCharacter(ctx, {
        styleId: style,
        x: cell.width / 2,
        y: cell.height * 0.53,
        size: pixel ? 33 : cell.height * 0.78,
        phase: (step * Math.PI) / 2,
        facing,
        color,
        shadow: false,
      });
      ctx.restore();
    }
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.magFilter = pixel ? NearestFilter : LinearFilter;
  map.minFilter = pixel ? NearestFilter : LinearFilter;
  map.generateMipmaps = false;
  map.repeat.set(0.25, 0.25);
  map.offset.set(0, 0.75);
  const sprite = new Sprite(new SpriteMaterial({ map, alphaTest: 0.5, toneMapped: false }));
  sprite.name = `${style}-sprite`;
  sprite.userData.kind = "pixel-person";
  sprite.userData.rendering = pixel ? "pixel" : "smooth-atlas";
  sprite.userData.style = style;
  sprite.center.set(0.5, 0);
  sprite.scale.set(pixel ? 2.16 : 2.32, pixel ? 2.7 : 2.7, 1);
  const person = new Group();
  person.name = name;
  person.userData.kind = "person";
  person.add(sprite);
  return person;
}
