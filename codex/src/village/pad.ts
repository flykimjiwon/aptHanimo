import type { VillageSession } from "./session";
import { element } from "./shell";

export function bindPad(getSession: () => VillageSession | null, signal: AbortSignal): void {
  const pad = element("#v-pad", HTMLElement);
  const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
  for (const button of pad.querySelectorAll<HTMLButtonElement>("[data-direction]")) {
    const id = button.dataset.direction;
    if (id !== "up" && id !== "down" && id !== "left" && id !== "right") continue;
    const start = (): void => {
      getSession()?.input(directions[id]);
    };
    const stop = (): void => {
      getSession()?.input([0, 0]);
    };
    button.addEventListener(
      "pointerdown",
      (event) => {
        button.setPointerCapture(event.pointerId);
        start();
      },
      { signal },
    );
    for (const name of ["pointerup", "pointercancel", "lostpointercapture", "blur"] as const)
      button.addEventListener(name, stop, { signal });
    button.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        if (!event.repeat) start();
      },
      { signal },
    );
    button.addEventListener(
      "keyup",
      (event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          stop();
        }
      },
      { signal },
    );
  }
}
