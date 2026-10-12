import type { Layer } from "../data";
import type { XY } from "../spatial/types";
import type { ModelDriver } from "./model-driver";
import type { PlayerAvatar } from "./player-avatar";
import type { SpatialDriver } from "./spatial-driver";

type PlayerStep = {
  readonly layer: Layer;
  readonly driver: SpatialDriver | null;
  readonly model: ModelDriver;
  readonly player: Pick<PlayerAvatar, "sync" | "group">;
  readonly manual: boolean;
  readonly input: XY;
  readonly paused: boolean;
  readonly onComplete?: (blocked: boolean) => void;
};

export function stepPlayer(state: PlayerStep, delta: number): string | null {
  if (state.layer === "ground" && state.driver) {
    const outcome = state.driver.step(delta, state.input, state.paused);
    state.player.sync(state.driver.position);
    if (!outcome) return null;
    if (outcome.kind !== "arrived") state.onComplete?.(outcome.kind === "blocked");
    return outcome.kind === "arrived" ? outcome.id : null;
  }
  if (state.manual) {
    state.model.manual(state.player.group, delta, state.input);
    return null;
  }
  return state.model.step(state.player.group, delta, state.paused);
}
