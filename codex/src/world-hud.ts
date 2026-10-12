import { updateGameHUD } from "./game-ui";
import type { World } from "./scene/world";

export function monitorWorldHUD(
  world: World,
  ground: () => boolean,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    updateGameHUD({
      position: world.position,
      following: world.rig.following,
      screen: world.screenPosition,
      ground: ground(),
      night: world.presentation.night,
      economy: world.presentation.economy,
      zoomPercent: world.rig.zoomPercent,
      requestedZoom: world.rig.requestedZoom,
      fps: world.presentation.fps,
      drawCalls: world.presentation.drawCalls,
      triangles: world.presentation.triangles,
      pixelRatio: world.presentation.pixelRatio,
    });
  }, 250);
}
