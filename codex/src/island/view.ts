import {
  ACESFilmicToneMapping,
  Box3,
  Group,
  PCFSoftShadowMap,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { disposeGroup } from "../scene/materials";
import type { SpatialWorld } from "../spatial/types";
import type { IslandActor } from "./actor";
import { IslandAtmosphere } from "./atmosphere";
import { islandBuilding } from "./buildings";
import { IslandCamera } from "./camera";
import { disposeIsland } from "./dispose";
import { islandGarden } from "./garden";
import { IslandInput } from "./input";
import { islandLand } from "./land";
import type { IslandPalette } from "./palettes";
import { buildingBase, buildingCenter, HEIGHT_SCALE, type IslandSite, XI_SITE } from "./site";
import { IslandWalk } from "./walk";

export type IslandViewOptions = {
  readonly labelHost: HTMLElement;
  readonly site?: IslandSite;
  readonly walker?: IslandActor;
};

export class IslandView {
  readonly renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  readonly scene = new Scene();
  readonly rig: IslandCamera;
  get camera() {
    return this.rig.camera;
  }
  get controls() {
    return this.rig.controls;
  }
  readonly walker: IslandActor;
  readonly labelHost: HTMLElement;
  readonly site: IslandSite;
  beforeRender: (() => void) | null = null;
  following = false;
  labelsVisible = true;
  get scenery(): Group {
    return this.land;
  }
  private readonly legacyWalker: boolean;
  readonly labels = new Map<string, HTMLButtonElement>();
  private land = new Group();
  private readonly atmosphere: IslandAtmosphere;
  private readonly resize: ResizeObserver;
  private frame = 0;
  private last = 0;
  private walkingFrame = 0;
  private readonly events = new AbortController();
  private disposed = false;
  private readonly reduce = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly movement: IslandInput;
  constructor(
    readonly host: HTMLElement,
    readonly world: SpatialWorld,
    options: HTMLElement | IslandViewOptions,
  ) {
    const settings = options instanceof HTMLElement ? { labelHost: options } : options;
    this.labelHost = settings.labelHost;
    this.site = settings.site ?? XI_SITE;
    this.legacyWalker = !settings.walker;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0, 0);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      `실제 ${world.name} 단지 윤곽과 ${world.buildings.filter((b) => b.kind === "core").length}개 동으로 만든 3D 섬`,
    );
    this.renderer.domElement.setAttribute("role", "img");
    host.append(this.renderer.domElement);
    this.rig = new IslandCamera(this.renderer.domElement, () => this.render(), this.site);
    this.atmosphere = new IslandAtmosphere(this.site);
    this.scene.add(this.atmosphere.group);
    this.walker = settings.walker ?? new IslandWalk(world);
    this.movement = new IslandInput(() => this.walker.active);
    this.scene.add(this.walker.group);
    for (const b of world.buildings.filter((b) => b.kind === "core")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "island-number";
      button.textContent = b.name.replace("동", "");
      button.setAttribute("aria-label", `${button.textContent} 동 살펴보기`);
      button.dataset.building = b.id;
      this.labelHost.append(button);
      this.labels.set(b.id, button);
    }
    this.resize = new ResizeObserver(() => this.resizeCanvas());
    this.resize.observe(host);
    const signal = this.events.signal;
    document.addEventListener(
      "visibilitychange",
      () => {
        this.movement.reset();
        if (document.hidden) {
          cancelAnimationFrame(this.frame);
          this.frame = 0;
          cancelAnimationFrame(this.walkingFrame);
          this.walkingFrame = 0;
          this.last = 0;
        } else {
          this.render();
          this.play();
        }
      },
      { signal },
    );
    this.reduce.addEventListener(
      "change",
      () => {
        this.walker.update(0, [0, 0], this.reduce.matches);
        this.render();
        this.play();
      },
      { signal },
    );
  }
  setPalette(palette: IslandPalette): void {
    const next = new Group();
    next.add(
      islandLand(this.world, palette, this.site),
      islandGarden(this.world, palette, this.site),
    );
    for (const b of this.world.buildings.filter((b) => b.kind === "core"))
      next.add(islandBuilding(b, this.world, palette));
    this.scene.remove(this.land);
    disposeIsland(this.land);
    this.land = next;
    this.scene.add(next);
    this.atmosphere.setPalette(palette);
    this.render();
  }
  private resizeCanvas(): void {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.rig.resize(width, height);
  }
  focus(id: string): void {
    const target = this.land.getObjectByName(id);
    if (target) this.rig.focus(new Box3().setFromObject(target).getCenter(new Vector3()), 2);
  }
  closeWalk(): void {
    const p = this.walker.position;
    this.rig.focus(new Vector3(p.x, p.y, p.z), 5);
  }
  input(x: number, z: number): void {
    this.movement.setTouch(x, z);
  }
  private needsFrame(): boolean {
    return this.walker.active || (this.walker.needsAnimation?.(this.reduce.matches) ?? false);
  }
  play(): void {
    if (this.walkingFrame || !this.needsFrame() || document.hidden || this.disposed) return;
    const tick = (time: number): void => {
      this.walkingFrame = 0;
      if (!this.needsFrame() || document.hidden || this.disposed) {
        this.last = 0;
        return;
      }
      const delta = this.last ? Math.min((time - this.last) / 1000, 0.05) : 0;
      this.last = time;
      const direction = this.movement.direction(this.controls.getAzimuthalAngle());
      for (let i = 0; i < (this.legacyWalker ? 4 : 1); i++)
        this.walker.update(delta, direction, this.reduce.matches);
      this.render();
      this.walkingFrame = requestAnimationFrame(tick);
    };
    this.walkingFrame = requestAnimationFrame(tick);
  }
  render(): void {
    if (this.disposed || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      if (this.following) {
        const p = this.walker.position;
        this.rig.follow(new Vector3(p.x, p.y, p.z));
      }
      this.beforeRender?.();
      this.renderer.render(this.scene, this.camera);
      const { width, height } = this.host.getBoundingClientRect();
      for (const b of this.world.buildings.filter((b) => b.kind === "core")) {
        const c = buildingCenter(b),
          p = new Vector3(
            c[0],
            buildingBase(this.world, b) + b.height * HEIGHT_SCALE + 5,
            c[1],
          ).project(this.camera),
          button = this.labels.get(b.id);
        if (button) {
          button.style.left = `${((p.x + 1) * width) / 2}px`;
          button.style.top = `${((1 - p.y) * height) / 2}px`;
          button.hidden =
            !this.labelsVisible || p.z > 1 || Math.abs(p.x) > 0.95 || Math.abs(p.y) > 0.95;
        }
      }
      this.frame = 0;
    });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.walkingFrame);
    this.events.abort();
    this.movement.dispose();
    this.resize.disconnect();
    this.rig.dispose();
    disposeIsland(this.land);
    if (this.walker.dispose) this.walker.dispose();
    else disposeGroup(this.walker.group);
    this.atmosphere.dispose();
    this.scene.clear();
    this.beforeRender = null;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.host.replaceChildren();
    this.labelHost.replaceChildren();
  }
}
