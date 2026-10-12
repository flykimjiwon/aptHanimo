import { expect, test } from "bun:test";
import { Group, Mesh, Raycaster, Vector3 } from "three";
import { CHARACTER_IDS, type CharacterStyle } from "../world-style";
import { avatar } from "./avatar";
import { animateAvatar } from "./avatar-motion";
import { disposeGroup, MaterialPalette } from "./materials";
import { PeerAvatars, type PeerState } from "./peer-avatars";
import { solidPerson } from "./solid-person";
import { personRendering } from "./styled-person";

const SOLID_STYLES = [
  "round-buddy",
  "voxel-walker",
  "plush-crew",
  "bead-crew",
  "rubber-hose",
  "leaf-guide",
] as const;

function names(group: Group): readonly string[] {
  const result: string[] = [];
  group.traverse((object) => {
    if (object.name) result.push(object.name);
  });
  return result;
}

function meshSignature(group: Group): string {
  const values: string[] = [];
  group.traverse((object) => {
    if (object instanceof Mesh) values.push(`${object.name}:${object.geometry.type}`);
  });
  return values.sort().join("|");
}

test("all ten character styles select an explicit renderer", () => {
  const renderings = new Map<CharacterStyle, string>(
    CHARACTER_IDS.map((style) => [style, personRendering(style)]),
  );

  expect(renderings.size).toBe(10);
  expect([...renderings.values()].filter((kind) => kind === "atlas")).toHaveLength(4);
  expect([...renderings.values()].filter((kind) => kind === "solid")).toHaveLength(6);
});

test("six solid styles keep PixelCrew cues with distinct real geometry", () => {
  const signatures = new Set<string>();
  for (const style of SOLID_STYLES) {
    const person = solidPerson(style, style, {
      color: "#6ed8e8",
      palette: new MaterialPalette(),
    });
    const parts = names(person);
    expect(person.userData.kind).toBe("solid-person");
    expect(parts.filter((name) => name.startsWith("crew-foot-"))).toHaveLength(3);
    expect(parts.filter((name) => name === "crew-eye")).toHaveLength(2);
    expect(parts.filter((name) => name === "crew-cheek")).toHaveLength(2);
    expect(parts).toContain("crew-scarf");
    signatures.add(meshSignature(person));
    disposeGroup(person);
  }
  expect(signatures.size).toBe(SOLID_STYLES.length);
});

test("solid distance animation returns to an exact still pose", () => {
  const person = solidPerson("round", "round-buddy", {
    color: "#6ed8e8",
    palette: new MaterialPalette(),
  });
  const foot = person.getObjectByName("crew-foot-0");
  if (!(foot instanceof Mesh)) throw new TypeError("solid foot is missing");

  animateAvatar(person, {
    cameraAngle: 0,
    heading: 0,
    movedDistance: 0.2,
    traveledDistance: 0.27,
    reducedMotion: false,
  });
  expect(person.position.y).toBeGreaterThan(0);
  expect(Math.abs(foot.rotation.x)).toBeGreaterThan(0);

  animateAvatar(person, {
    cameraAngle: 0,
    heading: 0,
    movedDistance: 0,
    traveledDistance: 0.27,
    reducedMotion: false,
  });
  expect(person.position.y).toBe(0);
  expect(foot.position.y).toBe(foot.userData.motionBaseY);
  expect(foot.rotation.x).toBe(0);
  disposeGroup(person);
});

test("both pupils remain in front of every solid character's body", () => {
  for (const style of SOLID_STYLES) {
    const model = solidPerson(style, style, { color: "#6ed8e8", palette: new MaterialPalette() });
    model.updateMatrixWorld(true);
    const pupils: Mesh[] = [];
    model.traverse((object) => {
      if (object instanceof Mesh && object.name === "crew-pupil") pupils.push(object);
    });
    expect(pupils).toHaveLength(2);
    for (const pupil of pupils) {
      const origin = pupil.getWorldPosition(new Vector3()).add(new Vector3(0, 0, 5));
      const ray = new Raycaster(origin, new Vector3(0, 0, -1));
      expect(ray.intersectObject(model, true)[0]?.object).toBe(pupil);
    }
    disposeGroup(model);
  }
});

test("solid styles retain companions and every vehicle mode", () => {
  for (const mode of ["walk", "stroller", "bike", "car"] as const) {
    const model = avatar(mode, "family", { style: "round-buddy" });
    const parts = names(model);
    expect(parts).toContain("player-person");
    if (mode === "car") expect(parts).toContain("compact-car");
    else {
      expect(parts).toContain("companion-adult");
      expect(parts).toContain("companion-child");
    }
    if (mode === "bike") {
      expect(parts).toContain("bicycle");
      const rider = model.getObjectByName("player-person");
      if (!(rider instanceof Group)) throw new TypeError("bike rider is missing");
      animateAvatar(model, {
        cameraAngle: 0,
        heading: 0,
        movedDistance: 0,
        traveledDistance: 1,
        reducedMotion: false,
      });
      expect(rider.position.y).toBe(0.46);
    }
    if (mode === "stroller") expect(parts).toContain("stroller");
    disposeGroup(model);
  }
});

test("peer style changes preserve live position without DOM atlases", () => {
  const peers = new PeerAvatars();
  const state: PeerState = {
    id: "neighbor",
    x: 13,
    y: 2,
    z: -8,
    heading: 0.7,
    mode: "walk",
    party: "family",
    layer: "ground",
  };
  peers.setStyle("round-buddy");
  peers.set([state], "ground");
  const before = peers.group.children[0];
  if (!(before instanceof Group)) throw new TypeError("peer group is missing");

  peers.setStyle("voxel-walker");
  const after = peers.group.children[0];
  if (!(after instanceof Group)) throw new TypeError("styled peer group is missing");
  expect(after).not.toBe(before);
  expect(after.position.toArray()).toEqual([13, 2, -8]);
  expect(after.rotation.y).toBeCloseTo(0.7);
  expect(after.userData.characterStyle).toBe("voxel-walker");
  expect(names(after).filter((name) => name === "companion-adult")).toHaveLength(1);
  expect(names(after).filter((name) => name === "companion-child")).toHaveLength(1);
  peers.dispose();
});
