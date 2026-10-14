import "./feed.css";
import { element } from "../village/shell";
import { feed } from "./api";
import { filterLabel, PRESETS } from "./feed-view";
import { DEFAULT_FILTERS, type FeedFilters, filterSchema } from "./schema";
import { postCard } from "./view";

export class StoryFeed {
  private filters: FeedFilters = DEFAULT_FILTERS;
  private next: number | null = null;
  private request: AbortController | null = null;
  private readonly host = element("#c-feed", HTMLElement);
  private readonly more = element("#c-more", HTMLButtonElement);
  private readonly moreStatus = element("#c-more-status", HTMLElement);
  private readonly form = element("#c-filters", HTMLFormElement);
  private readonly status = element("#c-feed-status", HTMLElement);
  private readonly reset = element("#c-filter-reset", HTMLButtonElement);
  constructor(
    private readonly complex: string,
    private readonly signal: AbortSignal,
  ) {
    this.more.addEventListener("click", () => void this.load(true), { signal });
    this.form.addEventListener("submit", (event) => event.preventDefault(), { signal });
    this.form.addEventListener(
      "change",
      () => {
        this.choose(filterSchema.parse(Object.fromEntries(new FormData(this.form))));
      },
      { signal },
    );
    this.reset.addEventListener("click", () => this.choose(DEFAULT_FILTERS), { signal });
    for (const [key, preset] of Object.entries(PRESETS)) {
      element(`[data-feed-preset="${key}"]`, HTMLButtonElement).addEventListener(
        "click",
        () => this.choose(preset.filters),
        { signal },
      );
    }
    signal.addEventListener("abort", () => this.request?.abort(), { once: true });
  }
  private choose(filters: FeedFilters): void {
    this.filters = filters;
    for (const key of ["kind", "topic", "status"] as const)
      element(`#c-filters [name="${key}"]`, HTMLSelectElement).value = filters[key];
    this.reset.disabled =
      filters.kind === "all" && filters.topic === "all" && filters.status === "all";
    for (const [key, preset] of Object.entries(PRESETS))
      element(`[data-feed-preset="${key}"]`, HTMLButtonElement).setAttribute(
        "aria-pressed",
        String(
          filters.kind === preset.filters.kind &&
            filters.topic === preset.filters.topic &&
            filters.status === preset.filters.status,
        ),
      );
    void this.load();
  }
  async load(append = false): Promise<void> {
    if (this.signal.aborted || (append && (this.request || this.next === null))) return;
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this.more.disabled = true;
    this.host.setAttribute("aria-busy", "true");
    this.moreStatus.hidden = !append;
    this.moreStatus.textContent = append ? "이전 이야기를 불러오고 있어요." : "";
    if (!append) {
      this.status.textContent = `${filterLabel(this.filters)} · 불러오는 중`;
      this.next = null;
      this.more.hidden = true;
      this.host.replaceChildren();
    }
    try {
      const result = await feed(
        {
          ...this.filters,
          complex: this.complex,
          ...(append && this.next ? { before: this.next } : {}),
        },
        request.signal,
      );
      if (request.signal.aborted) return;
      const previousLast = this.host.lastElementChild;
      this.host.insertAdjacentHTML("beforeend", result.posts.map(postCard).join(""));
      if (!this.host.children.length) {
        this.host.innerHTML = this.reset.disabled
          ? '<p class="c-empty">아직 공개된 이야기가 없어요. 첫 관찰이나 사진을 나눠 주세요. 검토 대기 글은 내 접수증에서 확인할 수 있어요.</p>'
          : '<p class="c-empty">이 조건에 맞는 공개 글이 없어요. 조건을 바꾸거나 초기화해 보세요.</p>';
      }
      for (const key of ["requests", "corrections", "resolved"] as const)
        element(`[data-feed-count="${key}"]`, HTMLElement).textContent =
          `${result.progress[key]}건`;
      this.status.textContent = `${filterLabel(this.filters)}\n총 ${result.total}건 · ${this.host.querySelectorAll(".c-post").length}건 표시`;
      this.next = result.next;
      this.more.hidden = this.next === null;
      this.moreStatus.hidden = true;
      this.moreStatus.textContent = "";
      if (append) previousLast?.nextElementSibling?.querySelector("h3")?.focus();
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (request.signal.aborted) return;
      if (append)
        this.moreStatus.textContent =
          "이전 이야기를 불러오지 못했어요. 더 보기를 다시 눌러 주세요.";
      else
        this.status.textContent =
          "이야기를 불러오지 못했어요. 서버 연결을 확인하고 새로 불러오기를 눌러 주세요.";
      if (!append)
        for (const key of ["requests", "corrections", "resolved"] as const)
          element(`[data-feed-count="${key}"]`, HTMLElement).textContent = "—";
    } finally {
      if (this.request === request) {
        this.request = null;
        this.more.disabled = false;
        this.host.setAttribute("aria-busy", "false");
      }
    }
  }
}
