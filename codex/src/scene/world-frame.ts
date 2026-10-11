import type { BuildingOcclusion } from "./building-occlusion";
import type { CameraRig } from "./camera";
import type { WorldLabels } from "./labels";
import type { PeerAvatars } from "./peer-avatars";
import type { PlayerAvatar } from "./player-avatar";
import type { WorldPresentation } from "./presentation";

type FrameContext = {
  readonly rig: CameraRig;
  readonly presentation: WorldPresentation;
  readonly player: PlayerAvatar;
  readonly peers: PeerAvatars;
  readonly occlusion: BuildingOcclusion;
  readonly labels: WorldLabels;
  readonly step: (delta: number) => void;
  readonly emitPosition: () => void;
};

export function worldFrame(context: FrameContext): (now: number) => void {
  const { rig, presentation, player, peers, occlusion, labels } = context;
  return (now: number): void => {
    const frame = presentation.beginFrame(now, document.hidden);
    if (!frame.active) return;
    const { delta } = frame;
    for (let step = 0; step < frame.stepCount; step += 1) context.step(frame.stepDelta);
    rig.follow(player.position);
    rig.update(delta);
    const animation = presentation.animationFrame(delta, rig.angle, frame.render);
    peers.update(animation);
    player.animate(animation);
    occlusion.update(rig.camera.position, player.group.position, delta);
    if (frame.render) {
      presentation.render(now, rig.camera);
      labels.update(rig, player.group.position);
    }
    if (presentation.shouldEmitPosition(now)) context.emitPosition();
  };
}
