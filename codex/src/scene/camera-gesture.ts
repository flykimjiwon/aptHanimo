export type PointerPoint = {
  readonly x: number;
  readonly y: number;
};

export type CameraGestureEffect =
  | { readonly kind: "none" }
  | { readonly kind: "rotate"; readonly deltaX: number }
  | { readonly kind: "zoom"; readonly factor: number }
  | { readonly kind: "tap"; readonly point: PointerPoint }
  | { readonly kind: "release"; readonly pointerId: number };

type GestureState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "single";
      readonly pointerId: number;
      readonly start: PointerPoint;
      readonly last: PointerPoint;
      readonly dragging: boolean;
      readonly tapEligible: boolean;
    }
  | {
      readonly kind: "pinch";
      readonly firstPointerId: number;
      readonly secondPointerId: number;
      readonly previousDistance: number;
    };

const NONE: CameraGestureEffect = { kind: "none" };
const DRAG_THRESHOLD = 6;
const WHEEL_LINE_MODE = 1;
const WHEEL_PAGE_MODE = 2;

function distance(first: PointerPoint, second: PointerPoint): number {
  return Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
}

export function wheelZoomFactor(deltaY: number, deltaMode: number, viewportHeight: number): number {
  const pixels =
    deltaMode === WHEEL_LINE_MODE
      ? deltaY * 16
      : deltaMode === WHEEL_PAGE_MODE
        ? deltaY * Math.max(1, viewportHeight)
        : deltaY;
  return Math.exp(-Math.max(-180, Math.min(180, pixels)) * 0.002);
}

export class CameraGesture {
  private readonly pointers = new Map<number, PointerPoint>();
  private state: GestureState = { kind: "idle" };

  start(pointerId: number, point: PointerPoint): boolean {
    if (this.pointers.has(pointerId) || this.state.kind === "pinch") return false;
    this.pointers.set(pointerId, point);
    if (this.state.kind === "idle") {
      this.state = {
        kind: "single",
        pointerId,
        start: point,
        last: point,
        dragging: false,
        tapEligible: true,
      };
      return true;
    }
    this.state = {
      kind: "pinch",
      firstPointerId: this.state.pointerId,
      secondPointerId: pointerId,
      previousDistance: distance(this.state.last, point),
    };
    return true;
  }

  move(pointerId: number, point: PointerPoint): CameraGestureEffect {
    if (!this.pointers.has(pointerId)) return NONE;
    this.pointers.set(pointerId, point);
    if (this.state.kind === "idle") return NONE;
    if (this.state.kind === "single") {
      if (this.state.pointerId !== pointerId) return NONE;
      const dragging = this.state.dragging || distance(this.state.start, point) > DRAG_THRESHOLD;
      const deltaX = point.x - this.state.last.x;
      this.state = { ...this.state, last: point, dragging };
      return dragging && deltaX !== 0 ? { kind: "rotate", deltaX } : NONE;
    }
    const first = this.pointers.get(this.state.firstPointerId);
    const second = this.pointers.get(this.state.secondPointerId);
    if (!first || !second) return NONE;
    const nextDistance = distance(first, second);
    const factor = nextDistance / this.state.previousDistance;
    this.state = { ...this.state, previousDistance: nextDistance };
    return factor === 1 ? NONE : { kind: "zoom", factor };
  }

  end(pointerId: number, point: PointerPoint, allowTap: boolean): CameraGestureEffect {
    if (!this.pointers.has(pointerId)) return NONE;
    this.pointers.set(pointerId, point);
    this.pointers.delete(pointerId);
    if (this.state.kind === "idle") return NONE;
    if (this.state.kind === "single") {
      if (this.state.pointerId !== pointerId) return NONE;
      const tap = allowTap && this.state.tapEligible && !this.state.dragging;
      this.state = { kind: "idle" };
      return tap ? { kind: "tap", point } : NONE;
    }
    const remainingId =
      this.state.firstPointerId === pointerId
        ? this.state.secondPointerId
        : this.state.firstPointerId;
    const remaining = this.pointers.get(remainingId);
    this.reset();
    return remaining ? { kind: "release", pointerId: remainingId } : NONE;
  }

  reset(): readonly number[] {
    const pointerIds = [...this.pointers.keys()];
    this.pointers.clear();
    this.state = { kind: "idle" };
    return pointerIds;
  }
}
