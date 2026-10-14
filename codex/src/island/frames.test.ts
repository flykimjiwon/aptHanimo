import { expect, test } from "bun:test";
import { type IslandFrameClock, IslandFrames } from "./frames";

class FrameClock implements IslandFrameClock {
  readonly pending = new Map<number, FrameRequestCallback>();
  private sequence = 0;
  request(callback: FrameRequestCallback): number {
    const id = this.sequence++;
    this.pending.set(id, callback);
    return id;
  }
  cancel(id: number): void {
    this.pending.delete(id);
  }
  flush(time: number): void {
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    for (const callback of callbacks) callback(time);
  }
}

function setup(animated = false) {
  const clock = new FrameClock();
  const state = { animated, draws: 0 };
  const deltas: number[] = [];
  const scheduler = new IslandFrames(
    {
      animated: () => state.animated,
      update: (delta) => deltas.push(delta),
      draw: () => state.draws++,
    },
    clock,
  );
  return { clock, state, deltas, scheduler };
}

test("clock fake cancels requests and defers newly requested work to the next frame", () => {
  // Given
  const clock = new FrameClock(),
    observed: number[] = [];
  const cancelled = clock.request(() => observed.push(-1));
  clock.cancel(cancelled);
  clock.request((time) => {
    observed.push(time);
    clock.request((next) => observed.push(next));
  });
  // When
  clock.flush(10);
  clock.flush(20);
  // Then
  expect(observed).toEqual([10, 20]);
  expect(clock.pending.size).toBe(0);
});

test("idle play does not request work", () => {
  // Given
  const { scheduler, clock, state } = setup();
  // When
  scheduler.play();
  // Then
  expect(clock.pending.size).toBe(0);
  expect(state.draws).toBe(0);
});

test("repeated on-demand renders coalesce into one draw without an idle loop", () => {
  // Given
  const { scheduler, clock, state, deltas } = setup();
  // When
  scheduler.render();
  scheduler.render();
  scheduler.play();
  clock.flush(0);
  // Then
  expect(state.draws).toBe(1);
  expect(deltas).toEqual([]);
  expect(clock.pending.size).toBe(0);
});

test("render requested by camera follow during drawing cannot create a new idle loop", () => {
  // Given
  const clock = new FrameClock();
  let draws = 0;
  const scheduler = new IslandFrames(
    {
      animated: () => false,
      update: () => {},
      draw: () => {
        draws++;
        scheduler.render();
      },
    },
    clock,
  );
  // When
  scheduler.render();
  clock.flush(0);
  // Then
  expect(draws).toBe(1);
  expect(clock.pending.size).toBe(0);
});

for (const refreshRate of [60, 120, 144]) {
  test(`animation updates and draws 60 times per second on a ${refreshRate}Hz display`, () => {
    // Given
    const { scheduler, clock, state, deltas } = setup(true);
    // When
    scheduler.play();
    for (let i = 0; i < refreshRate; i++) clock.flush((i * 1000) / refreshRate);
    // Then
    expect(deltas).toHaveLength(60);
    expect(state.draws).toBe(60);
    expect(deltas[0]).toBe(0);
    expect(deltas.reduce((sum, value) => sum + value, 0)).toBeCloseTo(59 / 60, 2);
    expect(clock.pending.size).toBe(1);
    scheduler.dispose();
  });
}

test("arrival draws the final update in the same frame and leaves no pending callback", () => {
  // Given
  const clock = new FrameClock(),
    order: string[] = [];
  let active = true;
  const scheduler = new IslandFrames(
    {
      animated: () => active,
      update: () => {
        order.push("update");
        active = false;
      },
      draw: () => {
        order.push("draw");
      },
    },
    clock,
  );
  // When
  scheduler.play();
  clock.flush(0);
  // Then
  expect(order).toEqual(["update", "draw"]);
  expect(clock.pending.size).toBe(0);
});

test("paused actors stop updating and resume with zero delta after a long gap", () => {
  // Given
  const { scheduler, clock, state, deltas } = setup(true);
  scheduler.play();
  clock.flush(0);
  clock.flush(1000 / 60);
  state.animated = false;
  clock.flush(1000 / 30);
  // When
  state.animated = true;
  scheduler.play();
  clock.flush(100000);
  // Then
  expect(deltas).toHaveLength(3);
  expect(deltas[2]).toBe(0);
  scheduler.dispose();
});

test("offscreen suspension cancels queued work and resumes without a time jump", () => {
  // Given
  const { scheduler, clock, state, deltas } = setup(true);
  scheduler.play();
  clock.flush(0);
  clock.flush(1000 / 60);
  // When
  scheduler.setIntersecting(false);
  scheduler.render();
  scheduler.play();
  clock.flush(50000);
  // Then
  expect(clock.pending.size).toBe(0);
  expect(state.draws).toBe(2);
  // When visible again
  scheduler.setIntersecting(true);
  clock.flush(100000);
  // Then
  expect(deltas).toHaveLength(3);
  expect(deltas[2]).toBe(0);
  scheduler.dispose();
});

test("tab and intersection visibility must both be restored before work resumes", () => {
  // Given
  const { scheduler, clock, state } = setup(true);
  scheduler.play();
  scheduler.setPageVisible(false);
  scheduler.setIntersecting(false);
  // When
  scheduler.setPageVisible(true);
  clock.flush(1000);
  // Then
  expect(clock.pending.size).toBe(0);
  expect(state.draws).toBe(0);
  scheduler.setIntersecting(true);
  clock.flush(2000);
  expect(state.draws).toBe(1);
  scheduler.dispose();
});

test("a cancelled callback cannot consume the newer frame after visibility resumes", () => {
  // Given
  const { scheduler, clock, state } = setup(true);
  scheduler.play();
  const stale = [...clock.pending.values()][0];
  scheduler.setIntersecting(false);
  scheduler.setIntersecting(true);
  // When
  stale?.(100);
  clock.flush(200);
  // Then
  expect(state.draws).toBe(1);
  expect(clock.pending.size).toBe(1);
  scheduler.dispose();
});

test("disposing rejects queued and stale work even after render or play is called", () => {
  // Given
  const { scheduler, clock, state, deltas } = setup(true);
  scheduler.play();
  const stale = [...clock.pending.values()][0];
  // When
  scheduler.dispose();
  scheduler.render();
  scheduler.play();
  scheduler.setPageVisible(true);
  stale?.(100);
  clock.flush(200);
  // Then
  expect(state.draws).toBe(0);
  expect(deltas).toEqual([]);
  expect(clock.pending.size).toBe(0);
});

test("a stalled frame limits movement to 50ms without catch-up updates", () => {
  // Given
  const { scheduler, clock, deltas } = setup(true);
  scheduler.play();
  clock.flush(0);
  // When
  clock.flush(10000);
  // Then
  expect(deltas).toEqual([0, 0.05]);
  scheduler.dispose();
});

test("disabling pose animation renders its still state once and then stops", () => {
  // Given
  const { scheduler, clock, state, deltas } = setup(true);
  scheduler.play();
  clock.flush(0);
  // When
  state.animated = false;
  scheduler.render();
  scheduler.play();
  clock.flush(1000 / 60);
  // Then
  expect(state.draws).toBe(2);
  expect(deltas).toEqual([0]);
  expect(clock.pending.size).toBe(0);
});
