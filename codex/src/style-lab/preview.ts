import type { ComplexId } from "../complexes";
import { TravelSpeedState } from "../movement-speed";
import type { SpatialWorld } from "../spatial/types";
import { drawNeighborhood, screenDirectionToWorld, screenToWorld } from "./maps";
import type { MapFrame, ScreenPoint } from "./types";

export type LabChoice = {
  character: string;
  building: string;
  map: string;
  complex: ComplexId;
  night: boolean;
};

export class LabPreview {
  readonly travelSpeed = new TravelSpeedState();
  private readonly ctx: CanvasRenderingContext2D;
  private data: SpatialWorld | null = null;
  private readonly camera = { x: 0, z: 0, zoom: 1 };
  private readonly player = { x: 0, z: 0, phase: 0, facing: 0 };
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly observer: ResizeObserver;
  private input: ScreenPoint = { x: 0, y: 0 };
  private target: ScreenPoint | null = null;
  private following = true;
  private dirty = true;
  private last = 0;
  private lastRender = 0;
  private animation = 0;
  private playing = false;
  private elapsed = 0;
  private width = 800;
  private height = 430;
  private sampledFrames = 0;
  private sampledAt = 0;
  private telemetryAt = 0;
  private drawDuration = 0;
  private drawSamples = 0;
  private renderFps = 0;
  private readonly origin = { x: 0, z: 0 };

  constructor(
    readonly canvas: HTMLCanvasElement,
    private choice: LabChoice,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new TypeError("Style preview canvas unavailable");
    this.ctx = ctx;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    this.animation = requestAnimationFrame(this.frame);
  }

  setData(data: SpatialWorld): void {
    this.data = data;
    this.origin.x = data.spawn[0];
    this.origin.z = data.spawn[1];
    this.reset();
  }
  setChoice(choice: LabChoice): void {
    this.choice = choice;
    this.dirty = true;
  }
  setInput(input: ScreenPoint): void {
    this.input = input;
    if (input.x || input.y) {
      this.target = null;
      this.playing = false;
      this.following = true;
    }
  }
  togglePlay(): boolean {
    this.playing = !this.playing;
    this.target = null;
    this.following = true;
    this.elapsed = 0;
    this.origin.x = this.player.x;
    this.origin.z = this.player.z;
    return this.playing;
  }
  get isPlaying(): boolean {
    return this.playing;
  }
  zoom(factor: number): void {
    this.camera.zoom = Math.max(0.45, Math.min(3.2, this.camera.zoom * factor));
    this.dirty = true;
  }
  reset(): void {
    if (!this.data) return;
    this.player.x = this.data.spawn[0];
    this.player.z = this.data.spawn[1];
    this.player.phase = 0;
    this.camera.x = this.player.x;
    this.camera.z = this.player.z;
    this.camera.zoom = 1;
    this.target = null;
    this.playing = false;
    this.following = true;
    this.dirty = true;
  }
  tap(point: ScreenPoint): void {
    const frame = this.mapFrame();
    if (!frame) return;
    const world = screenToWorld(point, frame);
    this.target = { x: world.x, y: world.z };
    this.playing = false;
    this.following = true;
  }
  pan(delta: ScreenPoint): void {
    const frame = this.mapFrame();
    if (!frame) return;
    const a = screenToWorld({ x: this.width / 2, y: this.height / 2 }, frame);
    const b = screenToWorld({ x: this.width / 2 + delta.x, y: this.height / 2 + delta.y }, frame);
    this.camera.x -= b.x - a.x;
    this.camera.z -= b.z - a.z;
    this.following = false;
    this.dirty = true;
  }
  private resize(): void {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 1.5);
    this.width = Math.max(1, box.width);
    this.height = Math.max(1, box.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirty = true;
  }
  private mapFrame(): MapFrame | null {
    return this.data
      ? {
          width: this.width,
          height: this.height,
          styleId: this.choice.map,
          buildingStyleId: this.choice.building,
          characterStyleId: this.choice.character,
          data: this.data,
          camera: this.camera,
          player: this.player,
          night: this.choice.night,
        }
      : null;
  }
  private setDataset(key: string, value: string): void {
    if (this.canvas.dataset[key] !== value) this.canvas.dataset[key] = value;
  }
  private publishTelemetry(now: number): void {
    if (now - this.telemetryAt < 250) return;
    this.telemetryAt = now;
    if (this.drawSamples > 0) {
      this.setDataset("drawMs", (this.drawDuration / this.drawSamples).toFixed(2));
      this.drawDuration = 0;
      this.drawSamples = 0;
    }
    this.setDataset("playerX", this.player.x.toFixed(2));
    this.setDataset("playerZ", this.player.z.toFixed(2));
    this.setDataset("zoom", this.camera.zoom.toFixed(3));
    this.setDataset("playing", String(this.playing));
    this.setDataset("character", this.choice.character);
    this.setDataset("building", this.choice.building);
    this.setDataset("map", this.choice.map);
    this.setDataset("night", String(this.choice.night));
    this.setDataset("travelSpeed", String(this.travelSpeed.multiplier));
    this.setDataset("renderFps", String(this.renderFps));
    const zoom = document.querySelector("#lab-zoom");
    const zoomText = `${Math.round(this.camera.zoom * 100)}%`;
    if (zoom && zoom.textContent !== zoomText) zoom.textContent = zoomText;
  }
  private move(delta: number): void {
    const travelDelta = this.travelSpeed.scale(delta);
    const oldX = this.player.x;
    const oldZ = this.player.z;
    if (this.playing) {
      this.elapsed += travelDelta;
      this.player.x = this.origin.x + Math.sin(this.elapsed * 0.38) * 23;
      this.player.z = this.origin.z + Math.sin(this.elapsed * 0.76) * 9;
    } else if (this.target) {
      const dx = this.target.x - this.player.x;
      const dz = this.target.y - this.player.z;
      const distance = Math.hypot(dx, dz);
      const amount = Math.min(distance, travelDelta * 12);
      if (distance < 0.2) this.target = null;
      else {
        this.player.x += (dx / distance) * amount;
        this.player.z += (dz / distance) * amount;
      }
    } else if (this.input.x || this.input.y) {
      const vector = screenDirectionToWorld(this.choice.map, this.input);
      const length = Math.hypot(vector.x, vector.z) || 1;
      this.player.x += (vector.x / length) * travelDelta * 12;
      this.player.z += (vector.z / length) * travelDelta * 12;
    }
    if (this.data) {
      this.player.x = Math.max(
        this.data.bounds.minX + 10,
        Math.min(this.data.bounds.maxX - 10, this.player.x),
      );
      this.player.z = Math.max(
        this.data.bounds.minZ + 10,
        Math.min(this.data.bounds.maxZ - 10, this.player.z),
      );
    }
    const dx = this.player.x - oldX;
    const dz = this.player.z - oldZ;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      this.player.facing = Math.atan2(dx, dz);
      this.player.phase = this.reducedMotion.matches ? 0 : this.player.phase + distance * 0.8;
      if (this.following) {
        this.camera.x = this.player.x;
        this.camera.z = this.player.z;
      }
      this.dirty = true;
    }
  }
  private readonly frame = (now: number): void => {
    this.animation = requestAnimationFrame(this.frame);
    const delta = this.last ? Math.min((now - this.last) / 1_000, 0.08) : 0;
    this.last = now;
    if (document.hidden || now - this.lastRender < 1_000 / 30) return;
    const elapsed = this.lastRender ? Math.min((now - this.lastRender) / 1_000, 0.08) : delta;
    this.lastRender = now;
    this.move(elapsed);
    const frame = this.mapFrame();
    if (!frame) return;
    if (this.dirty) {
      const drawStarted = performance.now();
      drawNeighborhood(this.ctx, frame);
      this.drawDuration += performance.now() - drawStarted;
      this.drawSamples += 1;
      this.sampledFrames += 1;
      this.dirty = false;
    }
    if (now - this.sampledAt > 1_000) {
      this.renderFps = Math.round((this.sampledFrames * 1_000) / (now - this.sampledAt));
      this.sampledFrames = 0;
      this.sampledAt = now;
    }
    this.publishTelemetry(now);
  };
  dispose(): void {
    cancelAnimationFrame(this.animation);
    this.observer.disconnect();
  }
}
