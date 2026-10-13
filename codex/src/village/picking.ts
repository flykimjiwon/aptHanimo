import { Raycaster, Vector2 } from "three";
import type { IslandView } from "../island/view";
import type { XY } from "../spatial/types";

export type Pick =
  | { readonly kind: "building"; readonly id: string }
  | { readonly kind: "ground"; readonly point: XY };
export function bindPicking(
  view: IslandView,
  picked: (pick: Pick) => void,
  signal: AbortSignal,
): void {
  const canvas = view.renderer.domElement,
    pointers = new Set<number>();
  let tap: { readonly x: number; readonly y: number; readonly time: number } | null = null,
    consumed = false;
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      pointers.add(e.pointerId);
      if (pointers.size === 1) {
        tap = { x: e.clientX, y: e.clientY, time: e.timeStamp };
        consumed = false;
      } else consumed = true;
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 6) consumed = true;
    },
    { signal },
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      pointers.clear();
      tap = null;
      consumed = true;
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (e) => {
      pointers.delete(e.pointerId);
      if (!tap || consumed || pointers.size || e.timeStamp - tap.time > 500) return;
      tap = null;
      const box = canvas.getBoundingClientRect(),
        ray = new Raycaster();
      ray.setFromCamera(
        new Vector2(
          ((e.clientX - box.left) / box.width) * 2 - 1,
          1 - ((e.clientY - box.top) / box.height) * 2,
        ),
        view.camera,
      );
      for (const hit of ray.intersectObject(view.scenery, true)) {
        let object = hit.object;
        while (object.parent && !object.userData.buildingId && object.name !== "island-ground")
          object = object.parent;
        if (typeof object.userData.buildingId === "string") {
          picked({ kind: "building", id: object.userData.buildingId });
          return;
        }
        if (hit.object.name === "island-ground") {
          picked({ kind: "ground", point: [hit.point.x, hit.point.z] });
          return;
        }
      }
    },
    { signal },
  );
}
