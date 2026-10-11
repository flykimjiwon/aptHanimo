import {
  AmbientLight,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Scene,
  Sprite,
} from "three";
import { C } from "./materials";

const DAY = {
  ambient: 0.4,
  sky: 1.18,
  sun: 1.85,
  fill: 0.3,
  sunColor: "#fff2d2",
  skyColor: "#fff9e9",
  groundColor: "#adc389",
} as const;

const NIGHT = {
  ambient: 0.2,
  sky: 0.58,
  sun: 0.42,
  fill: 0.18,
  sunColor: "#b9c8eb",
  skyColor: "#7184ad",
  groundColor: "#334840",
} as const;

export function addLighting(scene: Scene): Group {
  const lights = new Group();
  lights.name = "soft-daylight";
  const ambient = new AmbientLight("#fffef9", 0.34);
  ambient.name = "paper-bounce";
  const sky = new HemisphereLight("#fff9e9", "#adc389", 1.45);
  sky.name = "sky-and-grass-fill";
  const sun = new DirectionalLight("#fff2d2", 2.75);
  sun.name = "late-morning-sun";
  sun.position.set(-450, 850, 380);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -760;
  sun.shadow.camera.right = 760;
  sun.shadow.camera.top = 760;
  sun.shadow.camera.bottom = -760;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 1_800;
  sun.shadow.normalBias = 0.08;
  sun.shadow.bias = -0.00008;
  const fill = new DirectionalLight("#d9ece5", 0.42);
  fill.name = "cool-facade-fill";
  fill.position.set(140, 90, -180);
  lights.add(ambient, sky, sun, sun.target, fill);
  scene.add(lights);
  return lights;
}

function setWindowMaterial(material: MeshStandardMaterial, night: boolean): void {
  if (material.userData.worldWindow !== true) return;
  if (night) material.emissive.set(C.glassWarm);
  else material.emissive.setRGB(0, 0, 0);
  material.emissiveIntensity = night ? 0.82 : 0;
}

export function setMapWindows(root: Object3D, night: boolean): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) setWindowMaterial(material, night);
    }
  });
}

export function setSceneNight(scene: Scene, night: boolean): void {
  const preset = night ? NIGHT : DAY;
  scene.traverse((object) => {
    if (object instanceof AmbientLight && object.name === "paper-bounce") {
      object.intensity = preset.ambient;
    } else if (object instanceof HemisphereLight && object.name === "sky-and-grass-fill") {
      object.intensity = preset.sky;
      object.color.set(preset.skyColor);
      object.groundColor.set(preset.groundColor);
    } else if (object instanceof DirectionalLight && object.name === "late-morning-sun") {
      object.intensity = preset.sun;
      object.color.set(preset.sunColor);
    } else if (object instanceof DirectionalLight && object.name === "cool-facade-fill") {
      object.intensity = preset.fill;
      object.color.set(night ? "#788cad" : "#d9ece5");
    }
    if (object instanceof Sprite && object.userData.kind === "pixel-person") {
      object.material.color.set(night ? "#b8cddd" : "#ffffff");
    }
  });
  scene.userData.worldTime = night ? "night" : "day";
  setMapWindows(scene, night);
}

export function setWorldTime(root: Object3D, night: boolean): void {
  if (root instanceof Scene) {
    setSceneNight(root, night);
    return;
  }
  setMapWindows(root, night);
  root.userData.worldTime = night ? "night" : "day";
}

export function isNightTime(root: Object3D): boolean {
  return root.userData.worldTime === "night";
}
