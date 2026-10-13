import {
  BoxGeometry,
  type BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { disposeGroup } from "../scene/materials";
import type { BuddyStyle, Pose, Species } from "./options";

export class Buddy {
  readonly group = new Group();
  private readonly body = new Group();
  private readonly head = new Group();
  private readonly arms = [new Group(), new Group()];
  private readonly legs = [new Group(), new Group()];
  private readonly eyes = new Group();
  private readonly smileEyes = new Group();
  private readonly mouth = new Group();
  private readonly openMouth = new Group();
  private readonly materials = new Map<string, MeshStandardMaterial>();
  constructor(
    readonly style: BuddyStyle,
    readonly species: Species,
  ) {
    const sphere = (r: number) =>
      new SphereGeometry(r, style === "facet" ? 7 : 20, style === "facet" ? 5 : 14);
    const fur = style === "clay" ? "#edcdaa" : "#f4e8d3";
    this.group.name = "village-buddy";
    this.group.scale.setScalar(2.4);
    this.group.add(this.body);
    const torso = this.part(new CapsuleGeometry(0.28, 0.2, 4, 12), "#8dd3cf");
    torso.position.y = 0.56;
    this.body.add(torso, this.head, ...this.arms, ...this.legs);
    this.head.position.y = 1.15;
    const skull = this.part(sphere(style === "round" ? 0.46 : 0.43), fur);
    skull.scale.z = 0.87;
    this.head.add(skull, this.eyes, this.smileEyes, this.mouth, this.openMouth);
    for (const sign of [-1, 1]) {
      const ear = this.part(this.earGeometry(), fur);
      ear.position.set(sign * 0.31, species === "dog" ? 0.12 : 0.39, 0);
      if (species === "dog") {
        ear.scale.set(0.85, 1.4, 0.65);
        ear.rotation.z = sign * 0.25;
      }
      if (species === "bunny") ear.position.y = 0.56;
      this.head.add(ear);
      const inner = this.part(sphere(species === "bear" ? 0.065 : 0.08), "#e8a3a7");
      inner.scale.set(0.7, species === "bunny" ? 2 : 1, 0.3);
      inner.position.copy(ear.position);
      inner.position.z = 0.1;
      this.head.add(inner);
      const white = this.part(sphere(0.09), "#fffef9");
      white.scale.set(0.9, 1.15, 0.55);
      white.position.set(sign * 0.16, 0.02, 0.357);
      const pupil = this.part(sphere(0.049), "#253b34");
      pupil.position.set(sign * 0.16, 0.015, 0.4);
      pupil.scale.z = 0.5;
      const highlight = this.part(sphere(0.018), "#fffef9");
      highlight.position.set(sign * 0.16 - 0.015, 0.039, 0.427);
      this.eyes.add(white, pupil, highlight);
      const happy = this.part(new TorusGeometry(0.065, 0.016, 5, 10, Math.PI), "#253b34");
      happy.position.set(sign * 0.16, 0, 0.39);
      this.smileEyes.add(happy);
      const cheek = this.part(sphere(0.08), "#e8a3a7");
      cheek.scale.set(1.2, 0.6, 0.3);
      cheek.position.set(sign * 0.27, -0.11, 0.31);
      this.head.add(cheek);
    }
    const smile = this.part(new TorusGeometry(0.065, 0.015, 5, 10, Math.PI), "#253b34");
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.105, 0.397);
    this.mouth.add(smile);
    const oh = this.part(sphere(0.055), "#253b34");
    oh.position.set(0, -0.14, 0.392);
    oh.scale.set(0.8, 1.1, 0.4);
    this.openMouth.add(oh);
    for (const [i, sign] of [-1, 1].entries()) {
      const arm = this.arms[i],
        leg = this.legs[i];
      if (!arm || !leg) continue;
      arm.position.set(sign * 0.28, 0.73, 0);
      leg.position.set(sign * 0.14, 0.3, 0);
      const sleeve = this.part(new CapsuleGeometry(0.09, 0.22, 3, 10), "#8dd3cf");
      sleeve.position.y = -0.15;
      const hand = this.part(sphere(0.095), fur);
      hand.position.y = -0.31;
      arm.add(sleeve, hand);
      const foot = this.part(
        style === "facet" ? new BoxGeometry(0.19, 0.2, 0.26) : sphere(0.115),
        "#355c49",
      );
      foot.position.set(0, -0.18, 0.045);
      foot.scale.z = 1.25;
      leg.add(foot);
    }
    this.animate({ pose: "auto", time: 0, distance: 0, moving: false, reduced: false });
  }
  private earGeometry(): BufferGeometry {
    switch (this.species) {
      case "cat":
        return new ConeGeometry(0.15, 0.32, 4);
      case "bunny":
        return new CapsuleGeometry(0.1, 0.32, 4, 10);
      case "bear":
        return new SphereGeometry(0.15, 12, 8);
      case "dog":
        return new CapsuleGeometry(0.12, 0.22, 4, 10);
    }
  }
  private part(geometry: BufferGeometry, color: string): Mesh {
    let material = this.materials.get(color);
    if (!material) {
      material = new MeshStandardMaterial({
        color,
        roughness: this.style === "clay" ? 1 : 0.85,
        flatShading: this.style === "facet",
      });
      this.materials.set(color, material);
    }
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }
  animate(frame: {
    readonly pose: Pose;
    readonly time: number;
    readonly distance: number;
    readonly moving: boolean;
    readonly reduced: boolean;
  }): void {
    const { pose, reduced } = frame,
      time = reduced ? 0.3 : frame.time;
    const stride = frame.moving && !reduced ? Math.sin(frame.distance * 2.4) * 0.6 : 0;
    this.body.position.y = frame.moving && !reduced ? Math.abs(stride) * 0.08 : 0;
    this.head.rotation.set(0, 0, 0);
    for (const [i, arm] of this.arms.entries())
      arm.rotation.set(i === 0 ? stride : -stride, 0, i === 0 ? 0.12 : -0.12);
    for (const [i, leg] of this.legs.entries()) leg.rotation.set(i === 0 ? -stride : stride, 0, 0);
    this.eyes.visible = pose !== "happy";
    this.eyes.scale.y = !reduced && time % 3.2 < 0.09 ? 0.1 : 1;
    this.smileEyes.visible = pose === "happy";
    this.mouth.visible = pose !== "talk";
    this.openMouth.visible = pose === "talk";
    this.openMouth.scale.y = 0.8 + Math.sin(time * 8) * 0.2;
    const right = this.arms[1];
    if (!right) return;
    switch (pose) {
      case "auto":
        break;
      case "wave":
        right.rotation.z = -2.3 + Math.sin(time * 6) * 0.25;
        break;
      case "talk":
        right.rotation.x = -0.8 + Math.sin(time * 5) * 0.2;
        this.head.rotation.x = Math.sin(time * 4) * 0.05;
        break;
      case "happy":
        this.arms.forEach((arm, i) => {
          arm.rotation.z = i === 0 ? 2.2 : -2.2;
        });
        this.body.position.y = reduced ? 0 : Math.abs(Math.sin(time * 5)) * 0.13;
        break;
      case "think":
        right.rotation.x = -2;
        this.head.rotation.z = 0.16;
        break;
      case "sit":
        this.body.position.y = -0.15;
        this.legs.forEach((leg) => {
          leg.rotation.x = -1.45;
        });
        break;
    }
  }
  dispose(): void {
    disposeGroup(this.group);
  }
}
