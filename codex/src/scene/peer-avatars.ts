import { Group, Vector3 } from "three";
import type { Layer, Mode, Party } from "../data";
import type { CharacterStyle } from "../world-style";
import { avatar } from "./avatar";
import { animateAvatar, prepareAvatarForScene } from "./avatar-motion";
import { C, disposeGroup } from "./materials";
import type { SceneAnimationFrame } from "./presentation";

export type PeerState = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly heading?: number | undefined;
  readonly mode: Mode;
  readonly party: Party;
  readonly layer: Layer;
};

type PeerModel = {
  group: Group;
  readonly signature: string;
  readonly mode: Mode;
  readonly party: Party;
  readonly target: Vector3;
  targetHeading: number;
  traveledDistance: number;
  pendingDistance: number;
};

export class PeerAvatars {
  readonly group = new Group();
  private readonly models = new Map<string, PeerModel>();
  private style: CharacterStyle = "crew-pixel";

  setStyle(style: CharacterStyle): void {
    if (style === this.style) return;
    this.style = style;
    for (const model of this.models.values()) {
      const next = avatar(model.mode, model.party, { color: C.tree, style });
      next.position.copy(model.group.position);
      next.rotation.copy(model.group.rotation);
      prepareAvatarForScene(next);
      this.group.remove(model.group);
      disposeGroup(model.group);
      model.group = next;
      this.group.add(next);
    }
  }

  set(peers: readonly PeerState[], layer: Layer): boolean {
    let appearanceChanged = false;
    const visible = peers.filter((peer) => peer.layer === layer);
    const ids = new Set(visible.map((peer) => peer.id));
    for (const [id, model] of this.models) {
      if (ids.has(id)) continue;
      this.group.remove(model.group);
      disposeGroup(model.group);
      this.models.delete(id);
      appearanceChanged = true;
    }
    for (const peer of visible) {
      const signature = `${peer.mode}:${peer.party}`;
      let model = this.models.get(peer.id);
      if (model?.signature !== signature) {
        if (model) {
          this.group.remove(model.group);
          disposeGroup(model.group);
        }
        const peerGroup = avatar(peer.mode, peer.party, { color: C.tree, style: this.style });
        prepareAvatarForScene(peerGroup);
        peerGroup.position.set(peer.x, peer.y, peer.z);
        peerGroup.rotation.y = peer.heading ?? 0;
        model = {
          group: peerGroup,
          signature,
          mode: peer.mode,
          party: peer.party,
          target: new Vector3(peer.x, peer.y, peer.z),
          targetHeading: peer.heading ?? 0,
          traveledDistance: 0,
          pendingDistance: 0,
        };
        this.models.set(peer.id, model);
        this.group.add(peerGroup);
        appearanceChanged = true;
      }
      model.target.set(peer.x, peer.y, peer.z);
      model.targetHeading = peer.heading ?? model.targetHeading;
    }
    return appearanceChanged;
  }

  update(frame: SceneAnimationFrame): void {
    const amount = Math.min(1, frame.delta * 8);
    for (const model of this.models.values()) {
      const previousX = model.group.position.x;
      const previousZ = model.group.position.z;
      model.group.position.lerp(model.target, amount);
      const turn = Math.atan2(
        Math.sin(model.targetHeading - model.group.rotation.y),
        Math.cos(model.targetHeading - model.group.rotation.y),
      );
      model.group.rotation.y += turn * amount;
      const movedDistance = Math.hypot(
        model.group.position.x - previousX,
        model.group.position.z - previousZ,
      );
      model.traveledDistance += movedDistance;
      model.pendingDistance += movedDistance;
      if (!frame.render) continue;
      animateAvatar(model.group, {
        cameraAngle: frame.cameraAngle,
        heading: model.group.rotation.y,
        movedDistance: model.pendingDistance,
        traveledDistance: model.traveledDistance,
        reducedMotion: frame.reducedMotion,
      });
      model.pendingDistance = 0;
    }
  }

  dispose(): void {
    disposeGroup(this.group);
    this.models.clear();
  }
}
