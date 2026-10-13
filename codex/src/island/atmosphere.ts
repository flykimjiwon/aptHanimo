import {
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from "three";
import { disposeGroup } from "../scene/materials";
import type { IslandPalette } from "./palettes";
import { type IslandSite, XI_SITE } from "./site";

export function siteScale(site: IslandSite): number {
  return Math.max(
    (site.bounds.maxX - site.bounds.minX) / (XI_SITE.bounds.maxX - XI_SITE.bounds.minX),
    (site.bounds.maxZ - site.bounds.minZ) / (XI_SITE.bounds.maxZ - XI_SITE.bounds.minZ),
  );
}

export class IslandAtmosphere {
  readonly group = new Group();
  private readonly sun = new DirectionalLight("#fff5dc", 2.5);
  private readonly hemisphere = new HemisphereLight("#fffdf3", "#a6b596", 1.6);
  constructor(site: IslandSite) {
    const scale = siteScale(site);
    this.sun.position.set(site.center[0] - 215 * scale, 300 * scale, site.center[1] + 190 * scale);
    this.sun.target.position.set(site.center[0] - 35 * scale, 0, site.center[1] + 30 * scale);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -250 * scale,
      right: 250 * scale,
      top: 250 * scale,
      bottom: -250 * scale,
      near: 1,
      far: 800 * scale,
    });
    this.sun.shadow.normalBias = 0.6;
    this.sun.shadow.bias = -0.00008;
    const image = document.createElement("canvas");
    image.width = 128;
    image.height = 128;
    const context = image.getContext("2d");
    if (!context) throw new TypeError("Shadow canvas unavailable");
    const fade = context.createRadialGradient(64, 64, 12, 64, 64, 64);
    fade.addColorStop(0, "#27433732");
    fade.addColorStop(1, "#27433700");
    context.fillStyle = fade;
    context.fillRect(0, 0, 128, 128);
    const shadow = new Mesh(
      new PlaneGeometry(340 * scale, 440 * scale),
      new MeshBasicMaterial({
        map: new CanvasTexture(image),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(site.center[0], -40, site.center[1]);
    this.group.add(this.sun, this.sun.target, this.hemisphere, shadow);
  }
  setPalette(palette: IslandPalette): void {
    this.sun.color.set(palette.night ? "#c0d9ff" : "#fff5dc");
    this.sun.intensity = palette.night ? 1.5 : 2.5;
    this.hemisphere.intensity = palette.night ? 1.1 : 1.6;
  }
  dispose(): void {
    this.sun.shadow.dispose();
    disposeGroup(this.group);
  }
}
