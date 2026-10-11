import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  SphereGeometry,
} from "three";
import type { CharacterStyle } from "../world-style";
import { C, type MaterialPalette } from "./materials";

type SolidStyle = Exclude<
  CharacterStyle,
  "crew-pixel" | "paper-scout" | "ink-friend" | "sticker-pop"
>;

function part(
  geometry:
    | BoxGeometry
    | CapsuleGeometry
    | ConeGeometry
    | CylinderGeometry
    | IcosahedronGeometry
    | SphereGeometry,
  options: { readonly color: string; readonly name: string },
  palette: MaterialPalette,
): Mesh {
  const { color, name } = options;
  const mesh = new Mesh(geometry, palette.material(color));
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function face(group: Group, palette: MaterialPalette, scale = 1): void {
  for (const x of [-0.31, 0.31]) {
    const eye = part(
      new BoxGeometry(0.2, 0.26, 0.1),
      { color: C.white, name: "crew-eye" },
      palette,
    );
    eye.position.set(x * scale, 1.72 * scale, 0.67 * scale);
    group.add(eye);
    const cheek = part(
      new SphereGeometry(0.11, 7, 5),
      { color: "#f19aac", name: "crew-cheek" },
      palette,
    );
    cheek.scale.set(1.35, 0.72, 0.38);
    cheek.position.set(x * 1.5 * scale, 1.39 * scale, 0.68 * scale);
    group.add(cheek);
  }
}

function scarf(group: Group, palette: MaterialPalette, leaf = false): void {
  const band = part(
    new CylinderGeometry(0.57, 0.58, 0.18, 10),
    { color: C.yellow, name: "crew-scarf" },
    palette,
  );
  band.position.set(0, 1.05, 0);
  group.add(band);
  const tail = part(
    leaf ? new ConeGeometry(0.22, 0.64, 5) : new BoxGeometry(0.3, 0.62, 0.12),
    { color: leaf ? C.tree : C.yellow, name: leaf ? "leaf-scarf-tail" : "crew-scarf-tail" },
    palette,
  );
  tail.rotation.z = leaf ? -0.82 : -0.22;
  tail.position.set(0.56, 0.85, 0.08);
  group.add(tail);
}

function feet(group: Group, palette: MaterialPalette, geometry: "round" | "box" | "bead"): void {
  for (const [index, x] of [-0.43, 0, 0.43].entries()) {
    const foot = part(
      geometry === "box"
        ? new BoxGeometry(0.42, 0.34, 0.62)
        : geometry === "bead"
          ? new IcosahedronGeometry(0.3, 1)
          : new SphereGeometry(0.31, 8, 6),
      { color: index === 1 ? "#4f8179" : C.ink, name: `crew-foot-${index}` },
      palette,
    );
    foot.position.set(x, 0.28, index === 1 ? 0.03 : 0);
    foot.userData.motionRole = `foot-${index}`;
    foot.userData.motionBaseY = foot.position.y;
    group.add(foot);
  }
}

function beadBody(group: Group, color: string, palette: MaterialPalette): void {
  const positions = [
    [-0.42, 0.86],
    [0, 0.74],
    [0.42, 0.86],
    [-0.58, 1.2],
    [-0.2, 1.25],
    [0.2, 1.25],
    [0.58, 1.2],
    [-0.48, 1.58],
    [0, 1.72],
    [0.48, 1.58],
  ] as const;
  for (const [index, [x, y]] of positions.entries()) {
    const bead = part(
      new IcosahedronGeometry(0.35, 1),
      { color, name: `body-bead-${index}` },
      palette,
    );
    bead.position.set(x, y, 0);
    group.add(bead);
  }
}

function accessories(group: Group, style: SolidStyle, palette: MaterialPalette): void {
  if (style === "plush-crew") {
    for (const x of [-0.48, 0.48]) {
      const stitch = part(
        new BoxGeometry(0.18, 0.035, 0.06),
        { color: C.white, name: "plush-stitch" },
        palette,
      );
      stitch.position.set(x, 1.08, 0.61);
      stitch.rotation.z = x;
      group.add(stitch);
    }
  }
  if (style === "leaf-guide") {
    for (const [x, angle] of [
      [-0.2, -0.5],
      [0.2, 0.5],
    ] as const) {
      const leaf = part(
        new ConeGeometry(0.23, 0.72, 5),
        { color: C.tree2, name: "head-leaf" },
        palette,
      );
      leaf.position.set(x, 2.42, 0);
      leaf.rotation.z = angle;
      group.add(leaf);
    }
  }
}

export function solidPerson(
  name: string,
  style: SolidStyle,
  options: { readonly color: string; readonly palette: MaterialPalette },
): Group {
  const { color, palette } = options;
  const person = new Group();
  person.name = name;
  person.userData.kind = "solid-person";
  person.userData.style = style;
  person.userData.motionRole = "body";
  person.userData.motionBaseY = 0;
  const voxel = style === "voxel-walker";
  const rubber = style === "rubber-hose";
  const beads = style === "bead-crew";
  if (beads) beadBody(person, color, palette);
  else {
    const body = part(
      voxel
        ? new BoxGeometry(1.35, 1.46, 1.08)
        : rubber
          ? new CapsuleGeometry(0.51, 0.8, 4, 8)
          : new SphereGeometry(0.83, style === "plush-crew" ? 10 : 12, 8),
      { color: style === "plush-crew" ? "#8cbeb5" : color, name: "crew-dome-body" },
      palette,
    );
    body.scale.y = rubber ? 1.22 : voxel ? 1 : 1.08;
    body.position.set(0, rubber ? 1.35 : 1.28, 0);
    person.add(body);
  }
  if (rubber) {
    for (const x of [-0.52, 0.52]) {
      const arm = part(
        new CylinderGeometry(0.07, 0.07, 0.9, 7),
        { color: C.ink, name: "hose-arm" },
        palette,
      );
      arm.position.set(x, 1.18, 0);
      arm.rotation.z = x > 0 ? -0.25 : 0.25;
      person.add(arm);
    }
  }
  face(person, palette, rubber ? 0.94 : 1);
  scarf(person, palette, style === "leaf-guide");
  feet(person, palette, voxel ? "box" : beads ? "bead" : "round");
  accessories(person, style, palette);
  return person;
}
