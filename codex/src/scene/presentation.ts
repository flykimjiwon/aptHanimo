import type { Camera, Object3D, Scene, WebGLRenderer } from "three";
import { TravelSpeedState } from "../movement-speed";
import { setSceneNight } from "./lighting";

export type PresentationFrame = {
  readonly active: boolean;
  readonly delta: number;
  readonly render: boolean;
  readonly stepCount: number;
  readonly stepDelta: number;
};

export type SceneAnimationFrame = {
  readonly cameraAngle: number;
  readonly delta: number;
  readonly reducedMotion: boolean;
  readonly render: boolean;
};

const POSITION_INTERVAL = 180;
const MAX_DELTA = 0.1;
const FIXED_STEP = 1 / 60;

function insideFadingBuilding(object: Object3D): boolean {
  let current = object.parent;
  while (current) {
    if (current.userData.fadeWithCamera === true) return true;
    current = current.parent;
  }
  return false;
}

export class WorldPresentation {
  readonly travelSpeed = new TravelSpeedState();
  private readonly abort = new AbortController();
  private readonly mobileQuery = matchMedia("(max-width: 720px), (pointer: coarse)");
  private readonly reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  private nightMode = false;
  private economyMode = false;
  private lastUpdateAt = 0;
  private nextRenderAt = 0;
  private lastRenderedAt = 0;
  private lastPositionAt = 0;
  private accumulator = 0;
  private fpsValue = 0;
  private drawCallValue = 0;
  private triangleValue = 0;
  private pixelRatioValue = 1;

  constructor(
    private readonly scene: Scene,
    private readonly renderer: WebGLRenderer,
  ) {
    this.renderer.shadowMap.autoUpdate = false;
    document.addEventListener("visibilitychange", this.resetClock, {
      signal: this.abort.signal,
    });
    this.refreshPixelRatio();
    this.reapplyScene();
  }

  get night(): boolean {
    return this.nightMode;
  }

  get economy(): boolean {
    return this.economyMode;
  }

  get fps(): number {
    return Math.round(this.fpsValue);
  }

  get drawCalls(): number {
    return this.drawCallValue;
  }

  get triangles(): number {
    return this.triangleValue;
  }

  get pixelRatio(): number {
    return this.pixelRatioValue;
  }

  get reducedMotion(): boolean {
    return this.reducedMotionQuery.matches;
  }

  toggleNight(): boolean {
    this.nightMode = !this.nightMode;
    this.reapplyScene();
    return this.nightMode;
  }

  toggleEconomy(): boolean {
    this.economyMode = !this.economyMode;
    this.renderer.shadowMap.enabled = !this.economyMode;
    this.renderer.shadowMap.needsUpdate = !this.economyMode;
    this.nextRenderAt = 0;
    this.refreshPixelRatio();
    return this.economyMode;
  }

  refreshPixelRatio(): void {
    const cap = this.economyMode ? 1 : this.mobileQuery.matches ? 1.25 : 1.5;
    this.pixelRatioValue = Math.min(devicePixelRatio, cap);
    this.renderer.setPixelRatio(this.pixelRatioValue);
  }

  reapplyScene(): void {
    setSceneNight(this.scene, this.nightMode);
    this.scene.traverse((object) => {
      if (object.castShadow && insideFadingBuilding(object)) object.castShadow = false;
    });
    this.renderer.shadowMap.needsUpdate = !this.economyMode;
  }

  beginFrame(now: number, hidden: boolean): PresentationFrame {
    if (hidden) {
      this.resetTimes(now);
      this.accumulator = 0;
      return { active: false, delta: 0, render: false, stepCount: 0, stepDelta: FIXED_STEP };
    }
    const delta =
      this.lastUpdateAt === 0 ? 0 : Math.min((now - this.lastUpdateAt) / 1_000, MAX_DELTA);
    this.lastUpdateAt = now;
    const interval = 1_000 / (this.economyMode ? 30 : 60);
    const render = this.nextRenderAt === 0 || now + 1 >= this.nextRenderAt;
    if (render) {
      this.nextRenderAt = this.nextRenderAt === 0 ? now + interval : this.nextRenderAt + interval;
      if (this.nextRenderAt < now) this.nextRenderAt = now + interval;
    }
    this.accumulator = Math.min(this.accumulator + delta, FIXED_STEP * 5);
    const stepCount = Math.min(5, Math.floor(this.accumulator / FIXED_STEP));
    this.accumulator -= stepCount * FIXED_STEP;
    return {
      active: true,
      delta,
      render,
      stepCount: this.travelSpeed.steps(stepCount),
      stepDelta: FIXED_STEP,
    };
  }

  animationFrame(delta: number, cameraAngle: number, render: boolean): SceneAnimationFrame {
    return { cameraAngle, delta, reducedMotion: this.reducedMotion, render };
  }

  render(now: number, camera: Camera): void {
    this.renderer.render(this.scene, camera);
    if (this.lastRenderedAt > 0) {
      const elapsed = now - this.lastRenderedAt;
      if (elapsed > 0 && elapsed < 1_000) {
        const sample = 1_000 / elapsed;
        this.fpsValue = this.fpsValue === 0 ? sample : this.fpsValue * 0.85 + sample * 0.15;
      }
    }
    this.lastRenderedAt = now;
    this.drawCallValue = this.renderer.info.render.calls;
    this.triangleValue = this.renderer.info.render.triangles;
  }

  shouldEmitPosition(now: number): boolean {
    if (now - this.lastPositionAt <= POSITION_INTERVAL) return false;
    this.lastPositionAt = now;
    return true;
  }

  dispose(): void {
    this.abort.abort();
  }

  private readonly resetClock = (): void => {
    this.resetTimes(0);
  };

  private resetTimes(now: number): void {
    this.lastUpdateAt = now;
    this.nextRenderAt = 0;
    this.lastRenderedAt = 0;
  }
}
