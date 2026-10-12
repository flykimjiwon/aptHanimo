import { expect, test } from "bun:test";
import { Box3, Mesh, Vector3 } from "three";
import { presets } from "../world-style-presets";
import { disposeGroup } from "./materials";
import { stylePreviewScene } from "./style-preview-scene";

test("solid concept models fit the preview camera and use the selected building treatment", () => {
  for (const id of ["cozy", "clay", "voxel", "watercolor", "realistic"] as const) {
    const model = stylePreviewScene(presets[id]);
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    expect(size.toArray().every(Number.isFinite)).toBe(true);
    expect(size.x).toBeLessThan(10);
    expect(size.y).toBeLessThan(5);
    expect(size.z).toBeLessThan(10);
    const house = model.getObjectByName("building-style-sample");
    expect(house?.userData.renderStyle).toBe(presets[id].building);
    expect(house?.getObjectByName("stylized-facade-windows")).toBeDefined();
    expect(model.getObjectByName("preview-player")?.userData.style).toBe(presets[id].character);
    disposeGroup(model);
  }
});

test("disposing a preview never disposes another scene's character resources", () => {
  const world = stylePreviewScene(presets.cozy);
  const preview = stylePreviewScene(presets.cozy);
  let worldDisposed = 0;
  let previewDisposed = 0;
  world.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.addEventListener("dispose", () => worldDisposed++);
    }
  });
  preview.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.addEventListener("dispose", () => previewDisposed++);
    }
  });
  disposeGroup(preview);
  expect(previewDisposed).toBeGreaterThan(0);
  expect(worldDisposed).toBe(0);
  expect(world.children.length).toBeGreaterThan(0);
  disposeGroup(world);
  expect(worldDisposed).toBeGreaterThan(0);
});
