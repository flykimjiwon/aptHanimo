import { type Object3D, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { Mode } from "../data";
import { allowed, EDGES, node } from "../graph";
import type { GroundPoint, XY } from "../spatial/types";
import { toast } from "../ui";
import type { CameraRig } from "./camera";
import {
  CameraGesture,
  type CameraGestureEffect,
  type PointerPoint,
  wheelZoomFactor,
} from "./camera-gesture";
import { bindMovementInput, isTextEntry } from "./movement-input";
import type { World } from "./world";

export type WorldInputContext = {
  readonly rig: CameraRig;
  readonly ground: () => Object3D;
  readonly heightAt: (point: XY) => number;
  readonly onGround: (point: GroundPoint) => void;
  readonly onMove: (input: XY) => void;
};

function hasBuildingAncestor(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (typeof current.userData.buildingId === "string") return true;
    current = current.parent;
  }
  return false;
}

function groundTap(
  canvas: HTMLCanvasElement,
  context: WorldInputContext,
  point: PointerPoint,
): void {
  const rect = canvas.getBoundingClientRect();
  const pointer = new Vector2(
    ((point.x - rect.left) / rect.width) * 2 - 1,
    (-(point.y - rect.top) / rect.height) * 2 + 1,
  );
  const ray = new Raycaster();
  ray.setFromCamera(pointer, context.rig.camera);
  const hit = ray
    .intersectObject(context.ground(), true)
    .find((intersection) => !hasBuildingAncestor(intersection.object));
  const worldPoint = hit?.point.clone() ?? new Vector3();
  if (!hit && !ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), worldPoint)) return;
  const height = context.heightAt([worldPoint.x, worldPoint.z]);
  context.onGround([worldPoint.x, height, worldPoint.z]);
}

function applyGesture(
  canvas: HTMLCanvasElement,
  context: WorldInputContext,
  effect: CameraGestureEffect,
): void {
  switch (effect.kind) {
    case "none":
      return;
    case "rotate":
      context.rig.rotate(effect.deltaX * 0.006);
      return;
    case "zoom":
      context.rig.scaleBy(effect.factor);
      return;
    case "tap":
      groundTap(canvas, context, effect.point);
      return;
    case "release":
      releaseCapture(canvas, effect.pointerId);
      return;
    default: {
      const unreachable: never = effect;
      throw new TypeError(`Unknown camera gesture effect: ${String(unreachable)}`);
    }
  }
}

function releaseCapture(canvas: HTMLCanvasElement, pointerId: number): void {
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}

export function bindWorldInput(canvas: HTMLCanvasElement, context: WorldInputContext): () => void {
  const abort = new AbortController();
  const signal = abort.signal;
  const gesture = new CameraGesture();
  const capturedPointers = new Set<number>();
  const previousTouchAction = canvas.style.touchAction;
  const joystick = document.querySelector<HTMLElement>("#joystick");
  const dialog = document.querySelector("dialog");
  let joystickActive = false;
  canvas.style.touchAction = "none";
  const releaseMovement = bindMovementInput(context.onMove);
  const resetGesture = (): void => {
    for (const pointerId of gesture.reset()) {
      capturedPointers.delete(pointerId);
      releaseCapture(canvas, pointerId);
    }
  };
  const dialogObserver = new MutationObserver(() => {
    if (dialog?.open) resetGesture();
  });
  if (dialog) dialogObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });

  window.addEventListener("blur", resetGesture, { signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) resetGesture();
    },
    { signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      if (event.target instanceof Element && event.target.closest("[data-layer], [data-complex]")) {
        resetGesture();
      }
    },
    { capture: true, signal },
  );
  joystick?.addEventListener(
    "pointerdown",
    () => {
      joystickActive = true;
      resetGesture();
    },
    { signal },
  );
  const releaseJoystick = (): void => {
    joystickActive = false;
  };
  joystick?.addEventListener("pointerup", releaseJoystick, { signal });
  joystick?.addEventListener("pointercancel", releaseJoystick, { signal });
  joystick?.addEventListener("lostpointercapture", releaseJoystick, { signal });

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || joystickActive) return;
      const accepted = gesture.start(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!accepted) return;
      event.preventDefault();
      capturedPointers.add(event.pointerId);
      canvas.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      const effect = gesture.move(event.pointerId, { x: event.clientX, y: event.clientY });
      applyGesture(canvas, context, effect);
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (event) => {
      const effect = gesture.end(event.pointerId, { x: event.clientX, y: event.clientY }, true);
      capturedPointers.delete(event.pointerId);
      applyGesture(canvas, context, effect);
      releaseCapture(canvas, event.pointerId);
    },
    { signal },
  );
  canvas.addEventListener(
    "pointercancel",
    (event) => {
      const effect = gesture.end(event.pointerId, { x: event.clientX, y: event.clientY }, false);
      capturedPointers.delete(event.pointerId);
      applyGesture(canvas, context, effect);
      releaseCapture(canvas, event.pointerId);
    },
    { signal },
  );
  canvas.addEventListener(
    "lostpointercapture",
    (event) => {
      const effect = gesture.end(event.pointerId, { x: event.clientX, y: event.clientY }, false);
      capturedPointers.delete(event.pointerId);
      applyGesture(canvas, context, effect);
    },
    { signal },
  );
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      context.rig.scaleBy(wheelZoomFactor(event.deltaY, event.deltaMode, canvas.clientHeight));
    },
    { passive: false, signal },
  );

  return () => {
    dialogObserver.disconnect();
    resetGesture();
    capturedPointers.clear();
    canvas.style.touchAction = previousTouchAction;
    releaseMovement();
    abort.abort();
  };
}

export function bindMovementKeys(direction: (dir: string) => void): () => void {
  const abort = new AbortController();
  document.addEventListener(
    "keydown",
    (event) => {
      if (document.querySelector("dialog[open]") || isTextEntry(event.target)) return;
      const directions: Readonly<Record<string, string>> = {
        ArrowUp: "up",
        w: "up",
        ArrowDown: "down",
        s: "down",
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
      };
      const dir = directions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (dir) {
        event.preventDefault();
        direction(dir);
      }
    },
    { signal: abort.signal },
  );
  return () => abort.abort();
}

export function moveDirection(
  state: { readonly world: World | null; readonly mode: Mode },
  dir: string,
  moveTo: (id: string) => void,
): void {
  const { world, mode } = state;
  if (!world || world.moving) return;
  const origin = node(world.currentNode);
  const from = world.rig.project(new Vector3(...origin.position));
  const vector =
    dir === "up" ? [0, -1] : dir === "down" ? [0, 1] : dir === "left" ? [-1, 0] : [1, 0];
  const adjacent = EDGES.filter(
    (edge) => allowed(edge, mode) && (edge.a === origin.id || edge.b === origin.id),
  ).map((edge) => (edge.a === origin.id ? edge.b : edge.a));
  const best = adjacent
    .map((id) => {
      const point = world.rig.project(new Vector3(...node(id).position));
      const x = point.x - from.x;
      const y = point.y - from.y;
      return { id, score: (x * (vector[0] ?? 0) + y * (vector[1] ?? 0)) / Math.hypot(x, y) };
    })
    .sort((a, b) => b.score - a.score)[0];
  if (best && best.score > 0.15) moveTo(best.id);
  else toast("그 방향으로 이어진 길이 없어요.");
}
