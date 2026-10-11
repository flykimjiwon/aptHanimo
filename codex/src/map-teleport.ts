import type { Controller } from "./controller";
import type { GroundPoint } from "./spatial/types";
import { getElement, toast } from "./ui";

export function createMapTeleport(app: Controller) {
  let armed = false;
  const button = document.createElement("button");
  button.className = "teleport-prompt";
  button.hidden = true;
  button.type = "button";
  button.textContent = "시작할 땅을 눌러 주세요 · 취소";
  button.setAttribute("aria-label", "지도에서 시작 위치 선택 취소");
  getElement(".world", HTMLElement).append(button);
  const cancel = (): void => {
    armed = false;
    button.hidden = true;
  };
  button.addEventListener("click", cancel);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cancel();
  });
  return {
    cancel,
    arm(): void {
      if (!app.world) return;
      if (app.layer !== "ground") app.switchLayer("ground");
      app.world.stop();
      getElement("#dialog", HTMLDialogElement).close();
      armed = true;
      button.hidden = false;
      toast("지도를 움직이거나 확대해서 시작할 땅을 눌러 주세요.");
    },
    onGround(point: GroundPoint): boolean {
      if (!armed) return false;
      if (app.world?.teleportGround([point[0], point[2]])) {
        cancel();
        app.refresh();
        app.status("선택한 위치에서 산책을 시작해요");
        getElement("#world-stage", HTMLElement).dataset.currentNode = "free";
      } else toast("이동할 수 없는 곳이에요. 주변 길이나 빈 땅을 골라 주세요.");
      return true;
    },
  };
}
