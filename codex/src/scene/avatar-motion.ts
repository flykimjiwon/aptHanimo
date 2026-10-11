import { type Group, Mesh, Sprite } from "three";

export type AvatarMotionFrame = {
  readonly cameraAngle: number;
  readonly heading: number;
  readonly movedDistance: number;
  readonly traveledDistance: number;
  readonly reducedMotion: boolean;
};

const WALK_COLUMNS = [1, 2, 3, 2] as const;
const STEP_DISTANCE = 0.18;
const MOTION_THRESHOLD = 0.002;

function directionRow(heading: number, cameraAngle: number): number {
  const relative = Math.atan2(Math.sin(heading - cameraAngle), Math.cos(heading - cameraAngle));
  if (Math.abs(relative) <= Math.PI / 4) return 0;
  if (Math.abs(relative) >= (Math.PI * 3) / 4) return 1;
  return relative > 0 ? 2 : 3;
}

export function prepareAvatarForScene(avatar: Group): void {
  avatar.traverse((object) => {
    if (
      !(object instanceof Sprite) ||
      (object.userData.kind !== "pixel-person" && object.userData.kind !== "atlas-person")
    )
      return;
    object.castShadow = false;
    object.renderOrder = 3;
    object.material.depthTest = false;
    object.material.depthWrite = false;
  });
}

export function animateAvatar(avatar: Group, frame: AvatarMotionFrame): void {
  const moving = frame.movedDistance > MOTION_THRESHOLD;
  const cycleIndex = Math.floor(frame.traveledDistance / STEP_DISTANCE) % WALK_COLUMNS.length;
  const animatedColumn = WALK_COLUMNS[cycleIndex] ?? 2;
  const column = moving ? (frame.reducedMotion ? 2 : animatedColumn) : 0;
  const row = directionRow(frame.heading, frame.cameraAngle);
  const activeMotion = moving && !frame.reducedMotion;
  const stride = Math.sin((frame.traveledDistance / STEP_DISTANCE) * Math.PI);
  avatar.traverse((object) => {
    if (
      object instanceof Sprite &&
      (object.userData.kind === "pixel-person" || object.userData.kind === "atlas-person")
    ) {
      object.material.map?.offset.set(column / 4, (3 - row) / 4);
      return;
    }
    const baseY = object.userData.motionBaseY;
    if (typeof baseY === "number") {
      if (object.userData.motionRole === "body")
        object.position.y = baseY + (activeMotion ? Math.abs(stride) * 0.08 : 0);
      else if (object instanceof Mesh && typeof object.userData.motionRole === "string") {
        const footIndex = Number(object.userData.motionRole.slice(-1));
        const offset = footIndex === 1 ? Math.PI : 0;
        const footStride = Math.sin((frame.traveledDistance / STEP_DISTANCE) * Math.PI + offset);
        object.position.y = baseY + (activeMotion ? Math.max(0, footStride) * 0.16 : 0);
        object.rotation.x = activeMotion ? footStride * 0.28 : 0;
      }
    }
    if (activeMotion && object.name.endsWith("-wheel"))
      object.rotation.x -= frame.movedDistance / 0.2;
  });
}
