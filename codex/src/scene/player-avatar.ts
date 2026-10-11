import { type Group, type Scene, Vector3 } from "three";
import type { Mode, Party } from "../data";
import { node } from "../graph";
import type { CharacterStyle } from "../world-style";
import { avatar } from "./avatar";
import { animateAvatar, prepareAvatarForScene } from "./avatar-motion";
import type { CameraRig } from "./camera";
import { disposeGroup } from "./materials";
import type { MotorPosition } from "./motor";
import type { SceneAnimationFrame } from "./presentation";

export class PlayerAvatar {
  group: Group = avatar("walk", "solo");
  private readonly previousFramePosition = new Vector3();
  private traveledDistance = 0;
  private pendingDistance = 0;
  private mode: Mode = "walk";
  private party: Party = "solo";
  private style: CharacterStyle = "crew-pixel";

  constructor(private readonly scene: Scene) {
    prepareAvatarForScene(this.group);
    this.resetMotion();
    scene.add(this.group);
  }

  get position(): MotorPosition {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      z: this.group.position.z,
      heading: this.group.rotation.y,
    };
  }

  set(mode: Mode, party: Party): void {
    this.mode = mode;
    this.party = party;
    this.rebuild();
  }

  setStyle(style: CharacterStyle): void {
    if (style === this.style) return;
    this.style = style;
    this.rebuild();
  }

  private rebuild(): void {
    const next = avatar(this.mode, this.party, { style: this.style });
    next.position.copy(this.group.position);
    next.rotation.y = this.group.rotation.y;
    this.scene.remove(this.group);
    disposeGroup(this.group);
    this.group = next;
    prepareAvatarForScene(next);
    this.resetMotion();
    this.scene.add(next);
  }

  teleportModel(id: string): void {
    const point = node(id).position;
    this.group.position.set(point[0], point[1] + 0.75, point[2]);
    this.resetMotion();
  }

  teleport(position: MotorPosition): void {
    this.sync(position);
    this.resetMotion();
  }

  sync(position: MotorPosition): void {
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.y = position.heading;
  }

  screenPosition(rig: CameraRig): {
    readonly x: number;
    readonly y: number;
    readonly visible: boolean;
  } {
    const head = this.group.position.clone();
    const authoredScale = this.group.userData.visualScale;
    const visualScale = typeof authoredScale === "number" ? authoredScale : this.group.scale.y;
    return rig.projectBillboard(head, visualScale * 2.8, 4);
  }

  animate(frame: SceneAnimationFrame): void {
    const movedDistance = Math.hypot(
      this.group.position.x - this.previousFramePosition.x,
      this.group.position.z - this.previousFramePosition.z,
    );
    this.traveledDistance += movedDistance;
    this.pendingDistance += movedDistance;
    this.previousFramePosition.copy(this.group.position);
    if (!frame.render) return;
    animateAvatar(this.group, {
      cameraAngle: frame.cameraAngle,
      heading: this.group.rotation.y,
      movedDistance: this.pendingDistance,
      traveledDistance: this.traveledDistance,
      reducedMotion: frame.reducedMotion,
    });
    this.pendingDistance = 0;
  }

  private resetMotion(): void {
    this.previousFramePosition.copy(this.group.position);
    this.traveledDistance = 0;
    this.pendingDistance = 0;
  }

  dispose(): void {
    disposeGroup(this.group);
  }
}
