import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  OrthographicCamera,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import type { WorldStyle } from "../world-style";
import { presets, WORLD_STYLE_PRESET_IDS } from "../world-style-presets";
import { animateAvatar } from "./avatar-motion";
import { worldMapTheme } from "./map-style";
import { disposeGroup } from "./materials";
import { stylePreviewScene } from "./style-preview-scene";

export class StylePreview {
  private readonly renderer = new WebGLRenderer({ antialias: true, powerPreference: "low-power" });
  private readonly scene = new Scene();
  private readonly sun = new DirectionalLight("#fff2d2", 3);
  private readonly perspective = new PerspectiveCamera(38, 1, 0.1, 100);
  private readonly orthographic = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  private readonly events = new AbortController();
  private resize: ResizeObserver | null = null;
  private visibility: IntersectionObserver | null = null;
  private readonly reduce = matchMedia("(prefers-reduced-motion: reduce)");
  private model = new Group();
  private style: WorldStyle;
  private angle = 0;
  private playing = false;
  private visible = true;
  private frame = 0;
  private distance = 0;
  private lastTime = 0;
  private disposed = false;
  private width = 0;
  private height = 0;
  private pixelRatio = 0;

  constructor(
    private readonly host: HTMLElement,
    style: WorldStyle,
    thumbnails: ParentNode,
  ) {
    this.style = style;
    try {
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = PCFSoftShadowMap;
      this.renderer.domElement.setAttribute("role", "img");
      this.renderer.domElement.setAttribute("aria-label", "선택한 캐릭터와 동네 그림체 미리보기");
      this.scene.add(new AmbientLight("#fffef9", 2));
      const sun = this.sun;
      sun.position.set(-3, 8, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(512, 512);
      sun.shadow.camera.left = -6;
      sun.shadow.camera.right = 6;
      sun.shadow.camera.top = 6;
      sun.shadow.camera.bottom = -6;
      sun.shadow.normalBias = 0.03;
      this.scene.add(sun, this.model);
      this.renderer.setSize(320, 200, false);
      for (const id of WORLD_STYLE_PRESET_IDS) {
        this.replace(presets[id]);
        this.draw(320, 200);
        const canvas = thumbnails.querySelector(`[data-concept-thumbnail="${id}"]`);
        if (canvas instanceof HTMLCanvasElement) {
          canvas.width = 320;
          canvas.height = 200;
          canvas.getContext("2d")?.drawImage(this.renderer.domElement, 0, 0);
        }
      }
      this.replace(style);
      host.prepend(this.renderer.domElement);
      this.resize = new ResizeObserver(() => this.render());
      this.resize.observe(host);
      this.visibility = new IntersectionObserver(([entry]) => {
        this.visible = entry?.isIntersecting ?? false;
        this.schedule();
      });
      this.visibility.observe(host);
      document.addEventListener("visibilitychange", () => this.schedule(), {
        signal: this.events.signal,
      });
      this.reduce.addEventListener("change", () => this.schedule(), { signal: this.events.signal });
      this.bindDrag();
      this.render();
    } catch (error: unknown) {
      this.dispose();
      throw error;
    }
  }

  setStyle(style: WorldStyle): void {
    if (this.disposed) return;
    this.replace(style);
    this.render();
  }

  rotate(delta: number): void {
    this.angle = (this.angle + delta) % (Math.PI * 2);
    this.render();
  }

  reset(): void {
    this.angle = 0;
    this.render();
  }

  toggleWalk(): boolean {
    this.playing = !this.playing;
    this.schedule();
    return this.playing;
  }

  private replace(style: WorldStyle): void {
    this.scene.remove(this.model);
    disposeGroup(this.model);
    this.style = style;
    this.model = stylePreviewScene(style);
    this.scene.add(this.model);
    this.scene.background = new Color(worldMapTheme(style.map).background);
  }

  private draw(width: number, height: number): void {
    const aspect = width / height;
    const camera = this.style.view === "perspective" ? this.perspective : this.orthographic;
    this.perspective.aspect = aspect;
    this.orthographic.left = -4.7 * aspect;
    this.orthographic.right = 4.7 * aspect;
    this.orthographic.top = 4.7;
    this.orthographic.bottom = -4.7;
    camera.up.set(0, 1, 0);
    if (this.style.view === "flat") {
      camera.up.set(0, 0, -1);
      camera.position.set(0, 14, 0);
    } else camera.position.set(5.4, this.style.view === "perspective" ? 5.8 : 10, 11.5);
    camera.lookAt(0, 0.8, 0);
    camera.updateProjectionMatrix();
    this.model.rotation.y = this.angle;
    animateAvatar(this.model, {
      cameraAngle: 0.44 - this.angle,
      heading: 0,
      movedDistance: this.playing ? 0.02 : 0,
      traveledDistance: this.distance,
      reducedMotion: this.reduce.matches,
    });
    this.renderer.render(this.scene, camera);
  }

  private render(): void {
    if (this.disposed) return;
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio, 1.5);
    if (width !== this.width || height !== this.height || ratio !== this.pixelRatio) {
      this.width = width;
      this.height = height;
      this.pixelRatio = ratio;
      this.renderer.setPixelRatio(ratio);
      this.renderer.setSize(width, height, false);
    }
    this.draw(width, height);
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.lastTime = 0;
    this.render();
    if (this.disposed || !this.playing || !this.visible || document.hidden || this.reduce.matches)
      return;
    const tick = (now: number): void => {
      this.distance += this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) * 0.8 : 0;
      this.lastTime = now;
      this.render();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private bindDrag(): void {
    const canvas = this.renderer.domElement;
    let pointer: {
      readonly id: number;
      readonly x: number;
      readonly y: number;
      readonly angle: number;
    } | null = null;
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0 || pointer) return;
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: this.angle };
      },
      { signal: this.events.signal },
    );
    canvas.addEventListener(
      "pointermove",
      (event) => {
        if (!pointer || pointer.id !== event.pointerId) return;
        const dx = event.clientX - pointer.x;
        if (Math.abs(dx) < Math.abs(event.clientY - pointer.y) || Math.abs(dx) < 4) return;
        canvas.setPointerCapture(event.pointerId);
        this.angle = pointer.angle + (dx / Math.max(1, canvas.clientWidth)) * Math.PI * 2;
        this.render();
      },
      { signal: this.events.signal },
    );
    for (const type of [
      "pointerup",
      "pointercancel",
      "lostpointercapture",
      "pointerleave",
    ] as const)
      canvas.addEventListener(
        type,
        () => {
          pointer = null;
        },
        { signal: this.events.signal },
      );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.events.abort();
    this.resize?.disconnect();
    this.visibility?.disconnect();
    disposeGroup(this.model);
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
