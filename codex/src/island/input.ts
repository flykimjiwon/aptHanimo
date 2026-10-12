import type { XY } from "../spatial/types";

export class IslandInput {
  private readonly keys = new Set<string>();
  private touch: XY = [0, 0];
  private readonly events = new AbortController();
  constructor(walking: () => boolean) {
    const signal = this.events.signal;
    window.addEventListener(
      "keydown",
      (e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLSelectElement ||
          e.target instanceof HTMLButtonElement
        )
          return;
        if (
          walking() &&
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)
        ) {
          e.preventDefault();
          this.keys.add(e.key);
        }
      },
      { signal },
    );
    window.addEventListener(
      "keyup",
      (e) => {
        this.keys.delete(e.key);
      },
      { signal },
    );
    window.addEventListener("blur", () => this.reset(), { signal });
  }
  reset(): void {
    this.keys.clear();
    this.touch = [0, 0];
  }
  setTouch(x: number, z: number): void {
    this.touch = [x, z];
  }
  direction(angle: number): XY {
    const x =
      this.touch[0] +
      Number(this.keys.has("d") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("a") || this.keys.has("ArrowLeft"));
    const z =
      this.touch[1] +
      Number(this.keys.has("s") || this.keys.has("ArrowDown")) -
      Number(this.keys.has("w") || this.keys.has("ArrowUp"));
    const length = Math.max(1, Math.hypot(x, z));
    return [
      (x * Math.cos(angle) + z * Math.sin(angle)) / length,
      (-x * Math.sin(angle) + z * Math.cos(angle)) / length,
    ];
  }
  dispose(): void {
    this.events.abort();
    this.reset();
  }
}
