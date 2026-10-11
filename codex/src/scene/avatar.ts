import { CircleGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import type { Mode, Party } from "../data";
import type { CharacterStyle } from "../world-style";
import { bicycleModel, compactCar, strollerModel } from "./avatar-vehicles";
import { C, MaterialPalette } from "./materials";
import { styledPerson } from "./styled-person";

export type AvatarOptions = {
  readonly color?: string;
  readonly style?: CharacterStyle;
};

type AvatarBuild = {
  readonly color: string;
  readonly style: CharacterStyle;
  readonly palette: MaterialPalette;
};

function person(name: string, color: string, build: AvatarBuild): Group {
  return styledPerson(name, build.style, { color, palette: build.palette });
}

function addCompanions(group: Group, party: Party, build: AvatarBuild): void {
  if (party === "solo") return;
  const companion = person("companion-adult", C.tree2, build);
  companion.position.set(-0.78, 0, -1.18);
  companion.rotation.y = -0.08;
  companion.userData.trailIndex = 1;
  group.add(companion);
  if (party !== "family") return;
  const child = person("companion-child", C.yellow, build);
  child.scale.setScalar(0.68);
  child.position.set(0.7, 0, -1.55);
  child.rotation.y = 0.1;
  child.userData.trailIndex = 2;
  group.add(child);
}

function walkingAvatar(mode: Exclude<Mode, "car">, build: AvatarBuild): Group {
  const group = new Group();
  const primary = person("player-person", build.color, build);
  if (mode === "bike") {
    primary.position.set(0, 0.46, -0.08);
    if (primary.userData.motionBaseY !== undefined)
      primary.userData.motionBaseY = primary.position.y;
    primary.rotation.x = -0.08;
    group.add(bicycleModel(build.palette));
  } else if (mode === "stroller") group.add(strollerModel(build.palette));
  group.add(primary);
  return group;
}

export function avatar(mode: Mode, party: Party, options: AvatarOptions = {}): Group {
  const build: AvatarBuild = {
    color: options.color ?? "#6ee7ff",
    style: options.style ?? "crew-pixel",
    palette: new MaterialPalette(),
  };
  const group = new Group();
  group.name = "avatar";
  group.userData.kind = "avatar";
  group.userData.mode = mode;
  group.userData.party = party;
  group.userData.characterStyle = build.style;
  group.userData.visualScale = 1.85;
  group.scale.setScalar(1.85);
  const shadow = new Mesh(
    new CircleGeometry(0.7, 16),
    new MeshBasicMaterial({
      color: "#355246",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  shadow.name = "avatar-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.65;
  shadow.position.y = 0.08;
  group.add(shadow);
  if (mode === "car") {
    group.add(compactCar(build.color, build.palette));
    const driver = person("player-person", build.color, build);
    driver.scale.setScalar(0.62);
    driver.position.set(-0.28, 0.67, -0.12);
    if (driver.userData.motionBaseY !== undefined) driver.userData.motionBaseY = driver.position.y;
    group.add(driver);
  } else {
    group.add(walkingAvatar(mode, build));
    addCompanions(group, party, build);
  }
  return group;
}
