import { describe, expect, test } from "bun:test";
import { OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { WorldView } from "../world-style";
import { CameraRig } from "./camera";

const VIEWS: readonly WorldView[] = ["flat", "isometric", "perspective"];

function groundHit(rig: CameraRig): Vector3 {
  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(), rig.camera);
  const hit = raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
  if (!hit) throw new TypeError(`No ground hit for ${rig.view}`);
  return hit;
}

describe("CameraRig zoom", () => {
  test("applies continuous multiplicative zoom for pinch gestures", () => {
    // Given
    const rig = new CameraRig();

    // When
    rig.scaleBy(1.5);

    // Then
    expect(rig.requestedZoom).toBeCloseTo(1.5);
  });

  test("clamps close zoom to the readable walking bound", () => {
    // Given
    const rig = new CameraRig();

    // When
    rig.scaleBy(100);

    // Then
    expect(rig.requestedZoom).toBe(2.5);
    expect(rig.zoomPercent).toBe(250);
  });

  test("clamps wide zoom to the neighborhood bound", () => {
    // Given
    const rig = new CameraRig();

    // When
    rig.scaleBy(0.0001);

    // Then
    expect(rig.requestedZoom).toBe(0.25);
    expect(rig.zoomPercent).toBe(25);
  });

  test("retains additive zoom for existing camera buttons", () => {
    // Given
    const rig = new CameraRig();

    // When
    rig.scale(0.2);

    // Then
    expect(rig.requestedZoom).toBeCloseTo(1.2);
    expect(rig.zoomPercent).toBe(120);
  });

  test("projects a billboard head along camera-local up with a pixel gap", () => {
    // Given
    const rig = new CameraRig();
    const feet = new Vector3(0, 0, 0);
    rig.resize(1_000, 800);
    rig.camera.updateMatrixWorld();

    // When
    const base = rig.project(feet);
    const head = rig.projectBillboard(feet, 5, 4);

    // Then
    expect(head.x).toBeCloseTo(base.x);
    expect(base.y - head.y).toBeCloseTo(94.91, 1);
  });
});

describe("CameraRig projections", () => {
  test("uses orthographic flat/isometric views and a true perspective camera", () => {
    const rig = new CameraRig();

    rig.setView("flat");
    expect(rig.camera).toBeInstanceOf(OrthographicCamera);
    rig.setView("isometric");
    expect(rig.camera).toBeInstanceOf(OrthographicCamera);
    rig.setView("perspective");
    expect(rig.camera).toBeInstanceOf(PerspectiveCamera);
    expect((rig.camera as PerspectiveCamera).fov).toBe(45);
  });

  test("keeps center rays and target projection correct at every view, aspect, and zoom bound", () => {
    for (const view of VIEWS) {
      for (const [width, height] of [
        [1_280, 720],
        [375, 667],
      ] as const) {
        for (const zoomFactor of [0.001, 1, 100]) {
          const rig = new CameraRig();
          rig.resize(width, height);
          rig.setView(view);
          rig.scaleBy(zoomFactor);
          rig.update(1);

          const hit = groundHit(rig);
          const center = rig.project(new Vector3());
          expect(hit.x).toBeCloseTo(0, 5);
          expect(hit.z).toBeCloseTo(0, 5);
          expect(center.x).toBeCloseTo(width / 2, 5);
          expect(center.y).toBeCloseTo(height / 2, 5);
          expect(center.visible).toBe(true);
        }
      }
    }
  });

  test("updates each projection on resize", () => {
    const rig = new CameraRig();
    rig.resize(1_200, 600);
    const orthographic = rig.camera;
    if (!(orthographic instanceof OrthographicCamera)) throw new TypeError("Expected orthographic");
    expect(
      (orthographic.right - orthographic.left) / (orthographic.top - orthographic.bottom),
    ).toBe(2);

    rig.setView("perspective");
    const perspective = rig.camera;
    if (!(perspective instanceof PerspectiveCamera)) throw new TypeError("Expected perspective");
    expect(perspective.aspect).toBe(2);
    rig.resize(400, 800);
    expect(perspective.aspect).toBe(0.5);
  });

  test("renders flat north-up and ignores orbit rotation", () => {
    const rig = new CameraRig();
    rig.resize(1_000, 800);
    rig.setView("flat");
    const before = rig.camera.position.clone();
    const center = rig.project(new Vector3());
    const north = rig.project(new Vector3(0, 0, -10));
    const east = rig.project(new Vector3(10, 0, 0));

    rig.rotate(1.2);
    rig.update(1);

    expect(rig.angle).toBe(0);
    expect(rig.camera.position.distanceTo(before)).toBeCloseTo(0);
    expect(north.y).toBeLessThan(center.y);
    expect(east.x).toBeGreaterThan(center.x);
    expect(rig.toWorldInput([0, 1])).toEqual([0, -1]);
  });

  test("orbits in isometric and perspective views with a lower perspective elevation", () => {
    for (const view of ["isometric", "perspective"] as const) {
      const rig = new CameraRig();
      rig.resize(1_000, 800);
      rig.setView(view);
      const before = rig.camera.position.clone();
      rig.rotate(0.5);
      rig.update(1);
      expect(rig.camera.position.distanceTo(before)).toBeGreaterThan(1);
    }

    const rig = new CameraRig();
    rig.resize(1_000, 800);
    rig.setView("perspective");
    const camera = rig.camera;
    const horizontal = Math.hypot(camera.position.x, camera.position.z);
    expect(camera.position.y / horizontal).toBeCloseTo(0.8, 5);
    rig.scaleBy(100);
    rig.update(1);
    expect(camera.position.length()).toBeLessThan(70);
  });

  test("snaps immediately without changing view, zoom, or follow intent", () => {
    const rig = new CameraRig();
    rig.resize(1_000, 800);
    rig.setView("perspective");
    rig.toggleFollow();
    rig.scaleBy(1.5);
    rig.update(1);
    const distance = rig.camera.position.length();
    const destination = new Vector3(42, 7, -19);

    rig.snapTo(destination);

    const projected = rig.project(destination);
    expect(projected.x).toBeCloseTo(500, 5);
    expect(projected.y).toBeCloseTo(400, 5);
    expect(rig.camera.position.distanceTo(destination)).toBeCloseTo(distance, 5);
    expect(rig.view).toBe("perspective");
    expect(rig.requestedZoom).toBe(1.5);
    expect(rig.following).toBe(false);
  });

  test("keeps labels above their anchor after switching projection in place", () => {
    const rig = new CameraRig();
    const feet = new Vector3(12, 4, -8);
    rig.resize(900, 700);
    rig.snapTo(feet);

    for (const view of VIEWS) {
      rig.setView(view);
      const base = rig.project(feet);
      const head = rig.projectBillboard(feet, 5.2, 4);
      expect(base.x).toBeCloseTo(450, 5);
      expect(base.y).toBeCloseTo(350, 5);
      expect(head.x).toBeCloseTo(base.x, 5);
      expect(head.y).toBeLessThan(base.y);
      expect(head.visible).toBe(true);
    }
  });
});
