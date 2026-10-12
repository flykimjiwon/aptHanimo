import { OrthographicCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SITE_CENTER } from "./site";

export class IslandCamera {
  private fitting = true;
  private aspect = 1;
  readonly camera = new OrthographicCamera(-200, 200, 170, -170, 1, 2000);
  readonly controls: OrbitControls;
  constructor(
    canvas: HTMLCanvasElement,
    private readonly changed: () => void,
  ) {
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = 1.2;
    this.controls.minZoom = 0.65;
    this.controls.maxZoom = 6;
    this.controls.addEventListener("change", changed);
    this.controls.addEventListener("start", () => {
      this.fitting = false;
    });
    this.overview();
  }
  resize(width: number, height: number): void {
    const aspect = width / height,
      half = Math.max(170, 140 / aspect);
    this.aspect = aspect;
    if (this.fitting) this.camera.zoom = aspect < 1 ? 0.95 : 1.2;
    Object.assign(this.camera, {
      left: -half * aspect,
      right: half * aspect,
      top: half,
      bottom: -half,
    });
    this.camera.updateProjectionMatrix();
    this.changed();
  }
  overview(): void {
    this.fitting = true;
    this.camera.position.set(SITE_CENTER[0] + 290, 285, SITE_CENTER[1] + 360);
    this.controls.target.set(SITE_CENTER[0], 0, SITE_CENTER[1]);
    this.camera.zoom = this.aspect < 1 ? 0.95 : 1.2;
    this.update();
  }
  top(): void {
    this.fitting = false;
    this.camera.position.set(SITE_CENTER[0], 500, SITE_CENTER[1] + 0.1);
    this.controls.target.set(SITE_CENTER[0], 0, SITE_CENTER[1]);
    this.camera.zoom = 1;
    this.update();
  }
  rotate(): void {
    const offset = this.camera.position
      .clone()
      .sub(this.controls.target)
      .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
    this.camera.position.copy(this.controls.target).add(offset);
    this.update();
  }
  zoom(factor: number): void {
    this.fitting = false;
    this.camera.zoom = Math.min(6, Math.max(0.65, this.camera.zoom * factor));
    this.update();
  }
  focus(target: Vector3, zoom: number): void {
    this.fitting = false;
    this.camera.position.add(target.clone().sub(this.controls.target));
    this.controls.target.copy(target);
    this.camera.zoom = zoom;
    this.update();
  }
  private update(): void {
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.changed();
  }
  dispose(): void {
    this.controls.dispose();
  }
}
