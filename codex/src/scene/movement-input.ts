import type { XY } from "../spatial/types";

const MOVEMENT_KEYS: Readonly<Record<string, XY>> = {
  ArrowUp: [0, 1],
  w: [0, 1],
  ArrowDown: [0, -1],
  s: [0, -1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
};

export function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function bindMovementInput(onMove: (input: XY) => void): () => void {
  const abort = new AbortController();
  const signal = abort.signal;
  const pressed = new Set<string>();
  const joystick = document.querySelector<HTMLElement>("#joystick");
  const knob = document.querySelector<HTMLElement>("#joystick-knob");
  let joystickPointer: number | null = null;

  const reset = (): void => {
    pressed.clear();
    if (joystick && joystickPointer !== null && joystick.hasPointerCapture(joystickPointer)) {
      joystick.releasePointerCapture(joystickPointer);
    }
    joystickPointer = null;
    if (knob) knob.style.transform = "translate(0, 0)";
    joystick?.setAttribute("aria-valuenow", "0");
    onMove([0, 0]);
  };
  const emitKeys = (): void => {
    if (document.hidden || document.querySelector("dialog[open]")) {
      reset();
      return;
    }
    let x = 0;
    let z = 0;
    for (const key of pressed) {
      const direction = MOVEMENT_KEYS[key];
      if (direction) {
        x += direction[0];
        z += direction[1];
      }
    }
    const length = Math.hypot(x, z);
    onMove(length > 1 ? [x / length, z / length] : [x, z]);
  };

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") reset();
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (
        !MOVEMENT_KEYS[key] ||
        isTextEntry(event.target) ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      pressed.add(key);
      emitKeys();
    },
    { signal },
  );
  document.addEventListener(
    "keyup",
    (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (!MOVEMENT_KEYS[key]) return;
      pressed.delete(key);
      emitKeys();
    },
    { signal },
  );
  window.addEventListener("blur", reset, { signal });
  document.addEventListener("visibilitychange", reset, { signal });
  const dialog = document.querySelector("dialog");
  const observer = new MutationObserver(() => {
    if (dialog?.open) reset();
  });
  if (dialog) observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });

  const updateJoystick = (event: PointerEvent): void => {
    if (!joystick || event.pointerId !== joystickPointer) return;
    const rect = joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    const x = (event.clientX - rect.left - rect.width / 2) / radius;
    const z = -(event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(x, z);
    const normalized: XY = length > 1 ? [x / length, z / length] : [x, z];
    onMove(normalized);
    if (knob)
      knob.style.transform = `translate(${normalized[0] * radius * 0.52}px, ${-normalized[1] * radius * 0.52}px)`;
    joystick.setAttribute("aria-valuenow", String(Math.round(Math.min(1, length) * 100)));
  };
  joystick?.addEventListener(
    "pointerdown",
    (event) => {
      if (joystickPointer !== null) return;
      event.preventDefault();
      event.stopPropagation();
      joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      updateJoystick(event);
    },
    { signal },
  );
  joystick?.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerId !== joystickPointer) return;
      event.preventDefault();
      event.stopPropagation();
      updateJoystick(event);
    },
    { signal },
  );
  const release = (event: PointerEvent): void => {
    if (event.pointerId !== joystickPointer) return;
    event.stopPropagation();
    reset();
  };
  joystick?.addEventListener("pointerup", release, { signal });
  joystick?.addEventListener("pointercancel", release, { signal });

  return () => {
    observer.disconnect();
    reset();
    abort.abort();
  };
}
