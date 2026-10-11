import {
  BoxGeometry,
  type BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { C, type MaterialPalette } from "./materials";

type VehiclePart = {
  readonly geometry: BufferGeometry;
  readonly color: string;
  readonly name: string;
};

function vehiclePart(spec: VehiclePart, palette: MaterialPalette): Mesh {
  const mesh = new Mesh(spec.geometry, palette.material(spec.color));
  mesh.name = spec.name;
  mesh.userData["part"] = spec.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function strollerModel(palette: MaterialPalette): Group {
  const group = new Group();
  group.name = "stroller";
  group.userData["kind"] = "vehicle";
  for (const [x, z] of [
    [-0.38, 0.55],
    [0.38, 0.55],
    [-0.38, 1.27],
    [0.38, 1.27],
  ] as const) {
    const wheel = vehiclePart(
      {
        geometry: new TorusGeometry(0.16, 0.055, 6, 12),
        color: C.ink,
        name: "stroller-wheel",
      },
      palette,
    );
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.18, z);
    group.add(wheel);
  }
  const basket = vehiclePart(
    {
      geometry: new BoxGeometry(0.72, 0.42, 0.82),
      color: C.tree2,
      name: "stroller-basket",
    },
    palette,
  );
  basket.position.set(0, 0.57, 0.92);
  group.add(basket);
  const hood = vehiclePart(
    {
      geometry: new SphereGeometry(0.45, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
      color: C.roofWarm,
      name: "stroller-hood",
    },
    palette,
  );
  hood.position.set(0, 0.84, 0.92);
  group.add(hood);
  const baby = vehiclePart(
    { geometry: new SphereGeometry(0.16, 10, 7), color: C.wall2, name: "baby-face" },
    palette,
  );
  baby.position.set(0, 0.73, 1.18);
  group.add(baby);
  return group;
}

export function bicycleModel(palette: MaterialPalette): Group {
  const group = new Group();
  group.name = "bicycle";
  group.userData["kind"] = "vehicle";
  for (const z of [-0.62, 0.78]) {
    const wheel = vehiclePart(
      { geometry: new TorusGeometry(0.42, 0.045, 7, 18), color: C.ink, name: "bike-wheel" },
      palette,
    );
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.45, z);
    group.add(wheel);
  }
  const frame = vehiclePart(
    { geometry: new BoxGeometry(0.1, 0.1, 1.35), color: C.coral, name: "bike-frame" },
    palette,
  );
  frame.position.set(0, 0.69, 0.08);
  frame.rotation.x = -0.15;
  group.add(frame);
  const handle = vehiclePart(
    {
      geometry: new CylinderGeometry(0.035, 0.035, 0.62, 8),
      color: C.ink,
      name: "handlebar",
    },
    palette,
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 1.02, 0.7);
  group.add(handle);
  return group;
}

export function compactCar(color: string, palette: MaterialPalette): Group {
  const group = new Group();
  group.name = "compact-car";
  group.userData["kind"] = "vehicle";
  const body = vehiclePart(
    { geometry: new BoxGeometry(1.5, 0.5, 2.55), color, name: "car-body" },
    palette,
  );
  body.position.y = 0.54;
  group.add(body);
  const cabin = vehiclePart(
    { geometry: new CapsuleGeometry(0.55, 0.62, 4, 10), color: C.glass, name: "car-cabin" },
    palette,
  );
  cabin.scale.set(1.05, 0.62, 1.18);
  cabin.rotation.x = Math.PI / 2;
  cabin.position.set(0, 0.94, -0.18);
  group.add(cabin);
  for (const [x, z] of [
    [-0.76, -0.76],
    [0.76, -0.76],
    [-0.76, 0.76],
    [0.76, 0.76],
  ] as const) {
    const wheel = vehiclePart(
      {
        geometry: new CylinderGeometry(0.23, 0.23, 0.14, 10),
        color: C.ink,
        name: "car-wheel",
      },
      palette,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.34, z);
    group.add(wheel);
  }
  for (const x of [-0.46, 0.46]) {
    const light = vehiclePart(
      { geometry: new SphereGeometry(0.11, 8, 5), color: C.yellow, name: "headlight" },
      palette,
    );
    light.scale.z = 0.35;
    light.position.set(x, 0.58, 1.29);
    group.add(light);
  }
  return group;
}
