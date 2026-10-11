import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import type { SpatialWorld, XY } from "../spatial/types";
import type { WorldView } from "../world-style";

type CameraBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
};

type ScreenProjection = {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
};

export type WorldCamera = OrthographicCamera | PerspectiveCamera;

const DEFAULT_ANGLE = 0.62;
const FOLLOW_SIZE = 22;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const PERSPECTIVE_FOV = 45;
const PERSPECTIVE_ELEVATION = 0.8;

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

export class CameraRig {
  interior = false;
  private readonly orthographic = new OrthographicCamera(-50, 50, 40, -40, 0.1, 5_000);
  private readonly perspective = new PerspectiveCamera(PERSPECTIVE_FOV, 1, 0.1, 5_000);
  private currentView: WorldView = "isometric";
  private orbitAngle = DEFAULT_ANGLE;
  private currentZoom = 1;
  private targetAngle = DEFAULT_ANGLE;
  private targetZoom = 1;
  private width = 1;
  private height = 1;
  private followingPlayer = true;
  private overviewSize = 120;
  private readonly target = new Vector3();
  private readonly desiredTarget = new Vector3();
  private readonly overviewTarget = new Vector3();
  private readonly reducedMotionQuery =
    typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)");

  get camera(): WorldCamera {
    return this.currentView === "perspective" ? this.perspective : this.orthographic;
  }

  get view(): WorldView {
    return this.currentView;
  }

  get angle(): number {
    return this.currentView === "flat" ? 0 : this.orbitAngle;
  }

  get following(): boolean {
    return this.followingPlayer;
  }

  get zoom(): number {
    return this.currentZoom;
  }

  get requestedZoom(): number {
    return this.targetZoom;
  }

  get zoomPercent(): number {
    return Math.round(this.targetZoom * 100);
  }

  setView(view: WorldView): void {
    if (view === this.currentView) return;
    this.currentView = view;
    this.applyCamera();
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.update(1);
  }

  setBounds(bounds: CameraBounds): void {
    this.overviewTarget.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    this.overviewSize = Math.max(
      40,
      (bounds.maxZ - bounds.minZ) / 2,
      (bounds.maxX - bounds.minX) / 2,
    );
  }

  setSpatial(data: SpatialWorld): void {
    const points = data.buildings
      .filter((building) => building.kind === "core")
      .flatMap((building) => building.ring);
    if (points.length === 0) {
      this.setBounds(data.bounds);
      return;
    }
    const xs = points.map((point) => point[0]);
    const zs = points.map((point) => point[1]);
    this.setBounds({
      minX: Math.min(...xs) - 100,
      maxX: Math.max(...xs) + 100,
      minZ: Math.min(...zs) - 100,
      maxZ: Math.max(...zs) + 100,
    });
  }

  follow(position: Readonly<{ x: number; y: number; z: number }>): void {
    if (this.followingPlayer) this.desiredTarget.set(position.x, position.y, position.z);
  }

  snapTo(position: Readonly<{ x: number; y: number; z: number }>): void {
    this.target.set(position.x, position.y, position.z);
    this.desiredTarget.copy(this.target);
    this.applyCamera();
  }

  toggleFollow(): boolean {
    this.followingPlayer = !this.followingPlayer;
    if (this.followingPlayer) this.desiredTarget.copy(this.target);
    else this.desiredTarget.copy(this.overviewTarget);
    this.targetZoom = 1;
    return this.followingPlayer;
  }

  rotate(delta: number): void {
    if (this.currentView === "flat" || !Number.isFinite(delta)) return;
    this.targetAngle += delta;
  }

  scale(delta: number): void {
    if (!Number.isFinite(delta)) return;
    this.targetZoom = clampZoom(this.targetZoom + delta);
  }

  scaleBy(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.targetZoom = clampZoom(this.targetZoom * factor);
  }

  reset(): void {
    this.targetAngle = DEFAULT_ANGLE;
    this.targetZoom = 1;
    this.followingPlayer = true;
    if (this.interior) this.snapTo(new Vector3());
  }

  toWorldInput(input: XY): XY {
    const rightX = Math.cos(this.angle);
    const rightZ = -Math.sin(this.angle);
    const forwardX = -Math.sin(this.angle);
    const forwardZ = -Math.cos(this.angle);
    return [rightX * input[0] + forwardX * input[1], rightZ * input[0] + forwardZ * input[1]];
  }

  update(delta: number): void {
    const speed = this.reducedMotionQuery?.matches ? 1 : Math.min(1, Math.max(0, delta) * 9);
    this.orbitAngle += (this.targetAngle - this.orbitAngle) * speed;
    this.currentZoom += (this.targetZoom - this.currentZoom) * speed;
    this.target.lerp(this.desiredTarget, speed);
    this.applyCamera();
  }

  project(position: Vector3): ScreenProjection {
    const projected = position.clone().project(this.camera);
    return {
      x: ((projected.x + 1) * this.width) / 2,
      y: ((1 - projected.y) * this.height) / 2,
      visible:
        projected.z >= -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.97 &&
        Math.abs(projected.y) < 0.9,
    };
  }

  projectBillboard(position: Vector3, height: number, pixelGap: number): ScreenProjection {
    const top = position
      .clone()
      .add(new Vector3(0, height, 0).applyQuaternion(this.camera.quaternion));
    const projected = this.project(top);
    return { ...projected, y: projected.y - pixelGap };
  }

  private applyCamera(): void {
    const aspect = this.width / this.height;
    const baseSize = this.interior ? 21 : this.followingPlayer ? FOLLOW_SIZE : this.overviewSize;
    const size = baseSize / this.currentZoom / Math.min(1, aspect / 1.25);
    const camera = this.camera;
    if (camera instanceof OrthographicCamera) {
      camera.left = -size * aspect;
      camera.right = size * aspect;
      camera.top = size;
      camera.bottom = -size;
      if (this.currentView === "flat") {
        camera.up.set(0, 0, -1);
        camera.position.set(this.target.x, this.target.y + Math.max(180, size * 4), this.target.z);
      } else {
        const distance = Math.max(70, size * 2.2);
        camera.up.set(0, 1, 0);
        camera.position.set(
          this.target.x + Math.sin(this.orbitAngle) * distance,
          this.target.y + distance * 1.45,
          this.target.z + Math.cos(this.orbitAngle) * distance,
        );
      }
    } else {
      camera.aspect = aspect;
      const distance = size / Math.tan((camera.fov * Math.PI) / 360);
      const horizontal = distance / Math.hypot(1, PERSPECTIVE_ELEVATION);
      camera.up.set(0, 1, 0);
      camera.position.set(
        this.target.x + Math.sin(this.orbitAngle) * horizontal,
        this.target.y + horizontal * PERSPECTIVE_ELEVATION,
        this.target.z + Math.cos(this.orbitAngle) * horizontal,
      );
    }
    camera.lookAt(this.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
}
