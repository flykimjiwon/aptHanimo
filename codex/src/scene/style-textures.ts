import {
  DataTexture,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";

export type SurfacePattern = "paper" | "pixels" | "hatch" | "wood" | "wash" | "grain" | "grid";

function shade(pattern: SurfacePattern, x: number, y: number): number {
  const noise = (Math.sin(x * 127.1 + y * 311.7) * 43_758.5453) % 1;
  switch (pattern) {
    case "paper":
      return 0.95 + Math.abs(noise) * 0.05 - (y % 23 === 0 ? 0.03 : 0);
    case "pixels":
      return (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 0.9 : 1;
    case "hatch":
      return (x + y) % 14 < 2 ? 0.63 : 0.98;
    case "wood":
      return 0.82 + Math.sin(y * 0.3 + Math.sin(x * 0.1) * 2) * 0.12;
    case "wash":
      return 0.88 + Math.sin(x * 0.07) * Math.cos(y * 0.09) * 0.09 + Math.abs(noise) * 0.03;
    case "grain":
      return 0.91 + Math.abs(noise) * 0.09;
    case "grid":
      return x % 32 < 1 || y % 32 < 1 ? 0.73 : 1;
  }
}

export class StyleTextures {
  private readonly textures = new Map<SurfacePattern, DataTexture>();

  get(pattern: SurfacePattern): DataTexture {
    const existing = this.textures.get(pattern);
    if (existing) return existing;
    const size = 128;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4;
        const value = Math.round(shade(pattern, x, y) * 255);
        pixels[index] = value;
        pixels[index + 1] = value;
        pixels[index + 2] = value;
        pixels[index + 3] = 255;
      }
    }
    const texture = new DataTexture(pixels, size, size, RGBAFormat, UnsignedByteType);
    texture.name = `procedural-${pattern}`;
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    if (pattern !== "pixels") {
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
    }
    texture.needsUpdate = true;
    this.textures.set(pattern, texture);
    return texture;
  }
}
