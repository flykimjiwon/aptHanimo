import { CameraGesture, wheelZoomFactor } from "../scene/camera-gesture";
import type { LabPreview } from "./preview";
import type { ScreenPoint } from "./types";

const DIRECTIONS: Readonly<Record<string, ScreenPoint>> = {
  ArrowUp: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function bindLabControls(view: LabPreview): () => void {
  const abort = new AbortController();
  const signal = abort.signal;
  const canvas = view.canvas;
  const gesture = new CameraGesture();
  const keys = new Set<string>();
  const pointers = new Map<number, ScreenPoint>();
  let origin: ScreenPoint | null = null;
  let dragged = false;
  const local = (event: PointerEvent): ScreenPoint => {
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  };
  const release = (id: number): void => {
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  const reset = (): void => {
    for (const id of gesture.reset()) release(id);
    pointers.clear();
    keys.clear();
    view.setInput({ x: 0, y: 0 });
    origin = null;
  };
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      const point = local(event);
      if (!gesture.start(event.pointerId, point)) return;
      pointers.set(event.pointerId, point);
      canvas.setPointerCapture(event.pointerId);
      if (pointers.size === 1) {
        origin = point;
        dragged = false;
      } else dragged = true;
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const point = local(event);
      pointers.set(event.pointerId, point);
      const effect = gesture.move(event.pointerId, point);
      if (effect.kind === "zoom") view.zoom(effect.factor);
      else if (
        pointers.size === 1 &&
        origin &&
        Math.hypot(point.x - origin.x, point.y - origin.y) > 6
      ) {
        dragged = true;
        view.pan({ x: point.x - previous.x, y: point.y - previous.y });
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (event) => {
      const effect = gesture.end(event.pointerId, local(event), !dragged);
      pointers.delete(event.pointerId);
      if (effect.kind === "tap") view.tap(effect.point);
      else if (effect.kind === "release") {
        pointers.delete(effect.pointerId);
        release(effect.pointerId);
      }
      release(event.pointerId);
    },
    { signal },
  );
  canvas.addEventListener("pointercancel", reset, { signal });
  canvas.addEventListener(
    "lostpointercapture",
    (event) => {
      if (pointers.has(event.pointerId)) reset();
    },
    { signal },
  );
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      view.zoom(wheelZoomFactor(event.deltaY, event.deltaMode, canvas.clientHeight));
    },
    { signal, passive: false },
  );
  const send = (): void => {
    let x = 0;
    let y = 0;
    for (const key of keys) {
      const v = DIRECTIONS[key];
      if (v) {
        x += v.x;
        y += v.y;
      }
    }
    view.setInput({ x, y });
  };
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches("input,textarea,select") || event.target.isContentEditable)
      )
        return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (!DIRECTIONS[key]) return;
      event.preventDefault();
      keys.add(key);
      send();
    },
    { signal },
  );
  document.addEventListener(
    "keyup",
    (event) => {
      keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      send();
    },
    { signal },
  );
  document.querySelectorAll<HTMLButtonElement>("[data-walk]").forEach((button) => {
    let pointer: number | null = null;
    button.addEventListener(
      "pointerdown",
      (event) => {
        if (pointer !== null) return;
        reset();
        pointer = event.pointerId;
        button.setPointerCapture(pointer);
        view.setInput(DIRECTIONS[button.dataset.walk ?? ""] ?? { x: 0, y: 0 });
        event.preventDefault();
      },
      { signal },
    );
    const up = (event: PointerEvent): void => {
      if (pointer !== event.pointerId) return;
      pointer = null;
      view.setInput({ x: 0, y: 0 });
    };
    button.addEventListener("pointerup", up, { signal });
    button.addEventListener("pointercancel", up, { signal });
    button.addEventListener("lostpointercapture", up, { signal });
  });
  window.addEventListener("blur", reset, { signal });
  document.addEventListener("visibilitychange", reset, { signal });
  return () => {
    reset();
    abort.abort();
  };
}
