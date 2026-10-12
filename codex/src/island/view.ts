import {
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PCFSoftShadowMap,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { disposeGroup } from "../scene/materials";
import type { SpatialWorld } from "../spatial/types";
import { islandBuilding } from "./buildings";
import { IslandCamera } from "./camera";
import { disposeIsland } from "./dispose";
import { islandGarden } from "./garden";
import { IslandInput } from "./input";
import { islandLand } from "./land";
import type { IslandPalette } from "./palettes";
import { buildingBase, buildingCenter, HEIGHT_SCALE } from "./site";
import { IslandWalk } from "./walk";

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
  readonly walker: IslandWalk;
  readonly labels = new Map<string, HTMLButtonElement>();
  private land = new Group();
  private readonly sun = new DirectionalLight("#fff5dc", 2.5);
  private readonly hemisphere = new HemisphereLight("#fffdf3", "#a6b596", 1.6);
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
    readonly labelHost: HTMLElement,
  ) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0, 0);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "실제 왕십리자이 단지 윤곽과 7개 동으로 만든 3D 섬",
    );
    this.renderer.domElement.setAttribute("role", "img");
    host.append(this.renderer.domElement);
    this.rig = new IslandCamera(this.renderer.domElement, () => this.render());
    this.sun.position.set(-180, 300, 160);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -250,
      right: 250,
      top: 250,
      bottom: -250,
      near: 1,
      far: 800,
    });
    this.sun.shadow.normalBias = 0.6;
    this.sun.shadow.bias = -0.00008;
    this.scene.add(this.sun, this.hemisphere);
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
      new PlaneGeometry(340, 440),
      new MeshBasicMaterial({
        map: new CanvasTexture(image),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(35, -40, -30);
    this.scene.add(shadow);
    this.walker = new IslandWalk(world);
    this.movement = new IslandInput(() => this.walker.active);
    this.scene.add(this.walker.group);
    for (const b of world.buildings.filter((b) => b.kind === "core")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "island-number";
      button.textContent = b.name.replace("동", "");
      button.setAttribute("aria-label", `${button.textContent} 동 살펴보기`);
      button.dataset.building = b.id;
      labelHost.append(button);
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
          cancelAnimationFrame(this.walkingFrame);
          this.walkingFrame = 0;
          this.last = 0;
        } else this.play();
      },
      { signal },
    );
  }
  setPalette(palette: IslandPalette): void {
    const next = new Group();
    next.add(islandLand(this.world, palette), islandGarden(this.world, palette));
    for (const b of this.world.buildings.filter((b) => b.kind === "core"))
      next.add(islandBuilding(b, this.world, palette));
    this.scene.remove(this.land);
    disposeIsland(this.land);
    this.land = next;
    this.scene.add(next);
    this.sun.color = new Color(palette.night ? "#c0d9ff" : "#fff5dc");
    this.sun.intensity = palette.night ? 1.5 : 2.5;
    this.hemisphere.intensity = palette.night ? 1.1 : 1.6;
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
  play(): void {
    if (this.walkingFrame || !this.walker.active || document.hidden || this.disposed) return;
    const tick = (time: number): void => {
      this.walkingFrame = 0;
      if (!this.walker.active || document.hidden || this.disposed) {
        this.last = 0;
        return;
      }
      const delta = this.last ? Math.min((time - this.last) / 1000, 0.05) : 0;
      this.last = time;
      const direction = this.movement.direction(this.controls.getAzimuthalAngle());
      for (let i = 0; i < 4; i++) this.walker.update(delta, direction, this.reduce.matches);
      this.render();
      this.walkingFrame = requestAnimationFrame(tick);
    };
    this.walkingFrame = requestAnimationFrame(tick);
  }
  render(): void {
    if (this.disposed || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
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
          button.hidden = p.z > 1 || Math.abs(p.x) > 0.95 || Math.abs(p.y) > 0.95;
        }
      }
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
    disposeGroup(this.walker.group);
    this.scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          if (m instanceof MeshBasicMaterial) m.map?.dispose();
          m.dispose();
        });
      }
    });
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.host.replaceChildren();
    this.labelHost.replaceChildren();
  }
}
