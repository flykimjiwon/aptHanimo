import {
  BoxGeometry,
  type BufferGeometry,
  CapsuleGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { C, type MaterialPalette } from "./materials";

type PersonColors = {
  readonly shirt: string;
  readonly hair: string;
  readonly bag: string;
};

type PartSpec = {
  readonly geometry: BufferGeometry;
  readonly color: string;
  readonly name: string;
};

function part(spec: PartSpec, palette: MaterialPalette): Mesh {
  const mesh = new Mesh(spec.geometry, palette.material(spec.color));
  mesh.name = spec.name;
  mesh.userData["part"] = spec.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function arm(side: "left" | "right", colors: PersonColors, palette: MaterialPalette): Group {
  const pivot = new Group();
  const direction = side === "left" ? -1 : 1;
  pivot.name = `${side}-arm`;
  pivot.userData["part"] = `${side}-arm`;
  pivot.position.set(direction * 0.3, 1.12, 0);
  const sleeve = part(
    { geometry: new CapsuleGeometry(0.095, 0.28, 3, 7), color: colors.shirt, name: "sleeve" },
    palette,
  );
  sleeve.position.y = -0.2;
  sleeve.rotation.z = direction * -0.12;
  pivot.add(sleeve);
  const hand = part(
    { geometry: new SphereGeometry(0.09, 8, 6), color: C.skin, name: "hand" },
    palette,
  );
  hand.position.set(direction * 0.04, -0.43, 0);
  pivot.add(hand);
  return pivot;
}

function face(head: Group, palette: MaterialPalette): void {
  for (const x of [-0.13, 0.13]) {
    const eye = part(
      { geometry: new SphereGeometry(0.042, 8, 6), color: C.ink, name: "eye" },
      palette,
    );
    eye.position.set(x, 0.04, 0.335);
    head.add(eye);
    const blush = part(
      { geometry: new SphereGeometry(0.043, 8, 5), color: C.flower, name: "blush" },
      palette,
    );
    blush.scale.set(1.35, 0.62, 0.35);
    blush.position.set(x * 1.52, -0.07, 0.326);
    head.add(blush);
  }
  const mouth = part(
    {
      geometry: new TorusGeometry(0.045, 0.011, 5, 10, Math.PI),
      color: C.coral,
      name: "smile",
    },
    palette,
  );
  mouth.position.set(0, -0.1, 0.35);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
}

export function toyPerson(name: string, colors: PersonColors, palette: MaterialPalette): Group {
  const person = new Group();
  person.name = name;
  person.userData["kind"] = "person";
  person.userData["walkCycle"] = true;
  for (const [side, x] of [
    ["left", -0.14],
    ["right", 0.14],
  ] as const) {
    const leg = part(
      { geometry: new CapsuleGeometry(0.115, 0.3, 3, 7), color: C.ink, name: `${side}-leg` },
      palette,
    );
    leg.position.set(x, 0.35, 0);
    person.add(leg);
  }
  const body = part(
    { geometry: new CapsuleGeometry(0.27, 0.38, 4, 9), color: colors.shirt, name: "torso" },
    palette,
  );
  body.scale.set(1, 1, 0.8);
  body.position.y = 0.9;
  person.add(body, arm("left", colors, palette), arm("right", colors, palette));
  const bag = part(
    { geometry: new BoxGeometry(0.42, 0.48, 0.18), color: colors.bag, name: "backpack" },
    palette,
  );
  bag.position.set(0, 0.94, -0.26);
  person.add(bag);
  const headGroup = new Group();
  headGroup.name = "head";
  headGroup.userData["part"] = "head";
  headGroup.position.y = 1.52;
  const head = part(
    { geometry: new SphereGeometry(0.36, 14, 10), color: C.skin, name: "face" },
    palette,
  );
  head.scale.set(1, 1.05, 0.96);
  headGroup.add(head);
  const hair = part(
    {
      geometry: new SphereGeometry(0.375, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      color: colors.hair,
      name: "hair",
    },
    palette,
  );
  hair.position.y = 0.04;
  headGroup.add(hair);
  face(headGroup, palette);
  person.add(headGroup);
  return person;
}
