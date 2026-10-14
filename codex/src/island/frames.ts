export interface IslandFrameClock {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

type FrameWork = {
  readonly animated: () => boolean;
  readonly update: (delta: number) => void;
  readonly draw: () => void;
};

const browserClock: IslandFrameClock = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};
const INTERVAL = 1000 / 60;

export class IslandFrames {
  private frame: number | null = null;
  private last: number | null = null;
  private deadline: number | null = null;
  private dirty = false;
  private drawing = false;
  private disposed = false;
  private pageVisible = true;
  private intersecting = true;
  private generation = 0;
  private readonly events = new AbortController();
  private observer: IntersectionObserver | null = null;

  constructor(
    private readonly work: FrameWork,
    private readonly clock: IslandFrameClock = browserClock,
  ) {}

  observe(host: HTMLElement, resetInput: () => void): void {
    const pageChanged = (): void => {
      resetInput();
      this.setPageVisible(!document.hidden);
    };
    this.observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting !== this.intersecting) resetInput();
      this.setIntersecting(entry.isIntersecting);
    });
    this.observer.observe(host);
    document.addEventListener("visibilitychange", pageChanged, { signal: this.events.signal });
    pageChanged();
  }

  setPageVisible(visible: boolean): void {
    this.pageVisible = visible;
    this.visibilityChanged();
  }

  setIntersecting(visible: boolean): void {
    this.intersecting = visible;
    this.visibilityChanged();
  }

  private get visible(): boolean {
    return this.pageVisible && this.intersecting;
  }

  private visibilityChanged(): void {
    if (this.disposed) return;
    if (!this.visible) this.cancel();
    this.render();
  }

  render(): void {
    if (this.disposed || this.drawing) return;
    this.dirty = true;
    this.queue();
  }

  play(): void {
    if (!this.disposed && this.work.animated()) this.queue();
  }

  private queue(): void {
    if (this.disposed || !this.visible || this.frame !== null || this.drawing) return;
    const generation = this.generation;
    this.frame = this.clock.request((time) => {
      if (generation !== this.generation || this.disposed) return;
      this.frame = null;
      this.tick(time);
    });
  }

  private tick(time: number): void {
    if (!this.visible) return;
    const animated = this.work.animated();
    if (!animated) this.last = this.deadline = null;
    if (animated && this.deadline !== null && time + 0.001 < this.deadline) {
      this.queue();
      return;
    }
    if (animated) {
      const delta = this.last === null ? 0 : Math.min((time - this.last) / 1000, 0.05);
      this.last = time;
      this.deadline =
        this.deadline === null
          ? time + INTERVAL
          : this.deadline +
            Math.max(1, Math.floor((time - this.deadline) / INTERVAL) + 1) * INTERVAL;
      this.work.update(delta);
      this.dirty = true;
    }
    if (this.disposed || !this.visible) return;
    if (this.dirty) {
      this.dirty = false;
      this.drawing = true;
      try {
        this.work.draw();
      } finally {
        this.drawing = false;
      }
    }
    if (this.work.animated()) this.queue();
    else this.last = this.deadline = null;
  }

  private cancel(): void {
    if (this.frame !== null) this.clock.cancel(this.frame);
    this.frame = this.last = this.deadline = null;
    this.generation++;
  }

  dispose(): void {
    this.disposed = true;
    this.cancel();
    this.events.abort();
    this.observer?.disconnect();
  }
}
