import { OrthographicCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { siteScale } from "./atmosphere";
import { type IslandSite, XI_SITE } from "./site";

export class IslandCamera {
  private fitting = true;
  private aspect = 1;
  readonly camera = new OrthographicCamera(-200, 200, 170, -170, 1, 2000);
  readonly controls: OrbitControls;
  constructor(
    canvas: HTMLCanvasElement,
    private readonly changed: () => void,
    private readonly site: IslandSite = XI_SITE,
  ) {
    this.camera.far = Math.max(2000, 2000 * siteScale(site));
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
      half = Math.max(170, 140 / aspect) * siteScale(this.site);
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
    const scale = siteScale(this.site);
    this.camera.position.set(
      this.site.center[0] + 290 * scale,
      285 * scale,
      this.site.center[1] + 360 * scale,
    );
    this.controls.target.set(this.site.center[0], 0, this.site.center[1]);
    this.camera.zoom = this.aspect < 1 ? 0.95 : 1.2;
    this.update();
  }
  top(): void {
    this.fitting = false;
    this.camera.position.set(
      this.site.center[0],
      500 * siteScale(this.site),
      this.site.center[1] + 0.1,
    );
    this.controls.target.set(this.site.center[0], 0, this.site.center[1]);
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
    this.camera.zoom = Math.min(
      this.controls.maxZoom,
      Math.max(this.controls.minZoom, this.camera.zoom * factor),
    );
    this.update();
  }
  focus(target: Vector3, zoom: number): void {
    this.fitting = false;
    this.camera.position.add(target.clone().sub(this.controls.target));
    this.controls.target.copy(target);
    this.camera.zoom = zoom;
    this.update();
  }
  follow(target: Vector3): void {
    if (this.controls.target.equals(target)) return;
    this.focus(target, this.camera.zoom);
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
