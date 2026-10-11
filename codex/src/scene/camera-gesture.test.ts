import { describe, expect, test } from "bun:test";
import { CameraGesture, wheelZoomFactor } from "./camera-gesture";

describe("CameraGesture", () => {
  test("retains one-pointer drag rotation without a release tap", () => {
    // Given
    const gesture = new CameraGesture();
    gesture.start(1, { x: 10, y: 10 });

    // When
    const drag = gesture.move(1, { x: 20, y: 10 });
    const release = gesture.end(1, { x: 20, y: 10 }, true);

    // Then
    expect(drag).toEqual({ kind: "rotate", deltaX: 10 });
    expect(release).toEqual({ kind: "none" });
  });

  test("reports multiplicative zoom from two-pointer distance", () => {
    // Given
    const gesture = new CameraGesture();
    gesture.start(1, { x: 0, y: 0 });
    gesture.start(2, { x: 100, y: 0 });

    // When
    const effect = gesture.move(2, { x: 150, y: 0 });

    // Then
    expect(effect).toEqual({ kind: "zoom", factor: 1.5 });
  });

  test("suppresses a tap when the remaining pinch finger is released", () => {
    // Given
    const gesture = new CameraGesture();
    gesture.start(1, { x: 20, y: 30 });
    gesture.start(2, { x: 80, y: 30 });

    // When
    const firstRelease = gesture.end(2, { x: 80, y: 30 }, true);
    const effect = gesture.end(1, { x: 20, y: 30 }, true);

    // Then
    expect(firstRelease).toEqual({ kind: "release", pointerId: 1 });
    expect(effect).toEqual({ kind: "none" });
  });

  test("cancellation clears a single pointer without producing a tap", () => {
    // Given
    const gesture = new CameraGesture();
    gesture.start(7, { x: 12, y: 14 });

    // When
    const cancelled = gesture.end(7, { x: 12, y: 14 }, false);

    // Then
    expect(cancelled).toEqual({ kind: "none" });
  });

  test("accepts a fresh tap after cancellation", () => {
    // Given
    const gesture = new CameraGesture();
    gesture.start(7, { x: 12, y: 14 });
    gesture.end(7, { x: 12, y: 14 }, false);
    gesture.start(8, { x: 22, y: 24 });

    // When
    const nextTap = gesture.end(8, { x: 22, y: 24 }, true);

    // Then
    expect(nextTap).toEqual({ kind: "tap", point: { x: 22, y: 24 } });
  });

  test("reset clears every active pointer after an interrupted pinch", () => {
    // Given
    const gesture = new CameraGesture();
    gesture.start(3, { x: 10, y: 10 });
    gesture.start(4, { x: 60, y: 10 });

    // When
    const released = gesture.reset();
    const staleMove = gesture.move(3, { x: 30, y: 10 });

    // Then
    expect(released).toEqual([3, 4]);
    expect(staleMove).toEqual({ kind: "none" });
  });

  test("keeps wheel zoom smooth while capping large deltas", () => {
    // Given
    const smallDelta = 4;
    const largeDelta = 10_000;

    // When
    const trackpadFactor = wheelZoomFactor(smallDelta, 0, 800);
    const cappedFactor = wheelZoomFactor(largeDelta, 0, 800);

    // Then
    expect(trackpadFactor).toBeCloseTo(Math.exp(-0.008));
    expect(cappedFactor).toBeCloseTo(Math.exp(-0.36));
  });
});
