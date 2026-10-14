import {
  ACESFilmicToneMapping,
  Box3,
  Group,
  Matrix4,
  PCFSoftShadowMap,
  Scene,
  Vector2,
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
import { IslandFrames } from "./frames";
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
  readonly viewport = new Vector2();
  private readonly labelCamera = new Matrix4();
  private readonly labelProjection = new Matrix4();
  private labelVisibility: boolean | null = null;
  get scenery(): Group {
    return this.land;
  }
  private readonly legacyWalker: boolean;
  readonly labels = new Map<string, HTMLButtonElement>();
  private land = new Group();
  private readonly atmosphere: IslandAtmosphere;
  private readonly resize: ResizeObserver;
  private readonly frames: IslandFrames;
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
    this.frames = new IslandFrames({
      animated: () =>
        this.walker.active || (this.walker.needsAnimation?.(this.reduce.matches) ?? false),
      update: (delta) => {
        const direction = this.movement.direction(this.controls.getAzimuthalAngle());
        for (let i = 0; i < (this.legacyWalker ? 4 : 1); i++)
          this.walker.update(delta, direction, this.reduce.matches);
      },
      draw: () => this.draw(),
    });
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
    this.frames.observe(host, () => this.movement.reset());
    const signal = this.events.signal;
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
    this.viewport.set(width, height);
    this.labelVisibility = null;
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
  play(): void {
    this.frames.play();
  }
  render(): void {
    this.frames.render();
  }
  private draw(): void {
    if (this.following) {
      const p = this.walker.position;
      this.rig.follow(new Vector3(p.x, p.y, p.z));
    }
    this.beforeRender?.();
    this.renderer.render(this.scene, this.camera);
    if (
      this.labelVisibility === this.labelsVisible &&
      this.labelCamera.equals(this.camera.matrixWorld) &&
      this.labelProjection.equals(this.camera.projectionMatrix)
    )
      return;
    this.labelVisibility = this.labelsVisible;
    this.labelCamera.copy(this.camera.matrixWorld);
    this.labelProjection.copy(this.camera.projectionMatrix);
    if (!this.labelsVisible) {
      for (const button of this.labels.values()) button.hidden = true;
      return;
    }
    const { x: width, y: height } = this.viewport;
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
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.frames.dispose();
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
