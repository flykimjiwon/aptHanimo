import { expect, test } from "bun:test";
import {
  BoxGeometry,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
} from "three";
import { BuildingOcclusion } from "./building-occlusion";
import { addLighting, isNightTime, setMapWindows, setSceneNight } from "./lighting";
import { disposeGroup } from "./materials";

test("night mode warms windows and lowers the daylight rig", () => {
  const scene = new Scene();
  const lights = addLighting(scene);
  const material = new MeshStandardMaterial({ color: "#779da5" });
  material.userData.worldWindow = true;
  scene.add(new Mesh(new BoxGeometry(1, 1, 1), material));
  const person = new Sprite(new SpriteMaterial({ color: "#ffffff" }));
  person.userData.kind = "pixel-person";
  scene.add(person);

  setSceneNight(scene, true);

  const sun = lights.getObjectByName("late-morning-sun");
  expect(isNightTime(scene)).toBe(true);
  expect(material.emissiveIntensity).toBeCloseTo(0.82);
  expect(person.material.color.getHexString()).toBe("b8cddd");
  expect(sun).toBeInstanceOf(DirectionalLight);
  if (!(sun instanceof DirectionalLight)) throw new TypeError("daylight rig is missing its sun");
  expect(sun.intensity).toBeCloseTo(0.42);

  setSceneNight(scene, false);
  expect(material.emissiveIntensity).toBe(0);
  expect(person.material.color.getHexString()).toBe("ffffff");
  expect(sun.intensity).toBeCloseTo(1.85);
});

test("map window mode can be reapplied after replacing terrain", () => {
  const map = new Group();
  const material = new MeshStandardMaterial({ color: "#779da5" });
  material.userData.worldWindow = true;
  map.add(new Mesh(new BoxGeometry(1, 1, 1), material));

  setMapWindows(map, true);

  expect(material.emissiveIntensity).toBeCloseTo(0.82);
});

test("building occlusion fades outlines and restores authored opacity", () => {
  const root = new Group();
  const building = new Group();
  building.userData.fadeWithCamera = true;
  const geometry = new BoxGeometry(4, 8, 4);
  const glass = new MeshStandardMaterial({ opacity: 0.9, transparent: true });
  const outline = new LineBasicMaterial({ opacity: 0.34, transparent: true });
  building.add(new Mesh(geometry, glass), new LineSegments(new EdgesGeometry(geometry), outline));
  root.add(building);
  const occlusion = new BuildingOcclusion();
  occlusion.scan(root);

  occlusion.update(new Vector3(0, 0, 10), new Vector3(0, 0, -10), 1);
  expect(glass.opacity).toBeCloseTo(0.054);
  expect(outline.opacity).toBeCloseTo(0.0204);
  expect(glass.depthWrite).toBe(false);

  occlusion.update(new Vector3(10, 0, 10), new Vector3(10, 0, -10), 1);
  expect(glass.opacity).toBeCloseTo(0.9);
  expect(outline.opacity).toBeCloseTo(0.34);
  expect(glass.depthWrite).toBe(true);
});

test("opaque walls remain transparent until their fade-in is complete", () => {
  const root = new Group();
  const building = new Group();
  building.userData.fadeWithCamera = true;
  const wall = new MeshStandardMaterial();
  building.add(new Mesh(new BoxGeometry(4, 8, 4), wall));
  root.add(building);
  const occlusion = new BuildingOcclusion();
  occlusion.scan(root);

  occlusion.update(new Vector3(0, 0, 10), new Vector3(0, 0, -10), 0.02);
  occlusion.update(new Vector3(10, 0, 10), new Vector3(10, 0, -10), 0.02);

  expect(wall.opacity).toBeLessThan(0.99);
  expect(wall.transparent).toBe(true);
  expect(wall.depthWrite).toBe(false);
});

test("group disposal releases sprite atlas textures once", () => {
  const group = new Group();
  const texture = new Texture();
  let disposals = 0;
  texture.addEventListener("dispose", () => {
    disposals += 1;
  });
  group.add(
    new Sprite(new SpriteMaterial({ map: texture })),
    new Sprite(new SpriteMaterial({ map: texture })),
  );

  disposeGroup(group);

  expect(disposals).toBe(1);
  expect(group.children).toHaveLength(0);
});

test("occlusion invalidates the opaque shader when transparency changes", () => {
  const root = new Group();
  const building = new Group();
  building.userData.fadeWithCamera = true;
  const wall = new MeshStandardMaterial();
  building.add(new Mesh(new BoxGeometry(4, 8, 4), wall));
  root.add(building);
  const occlusion = new BuildingOcclusion();
  occlusion.scan(root);
  const initialVersion = wall.version;
  occlusion.update(new Vector3(0, 0, 10), new Vector3(0, 0, -10), 1);
  expect(wall.version).toBe(initialVersion + 1);
  occlusion.update(new Vector3(0, 0, 10), new Vector3(0, 0, -10), 1);
  expect(wall.version).toBe(initialVersion + 1);
  occlusion.update(new Vector3(10, 0, 10), new Vector3(10, 0, -10), 1);
  expect(wall.version).toBe(initialVersion + 2);
});
