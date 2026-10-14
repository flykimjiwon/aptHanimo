import { DEFAULT_FILTERS, type FeedFilters, KINDS, TOPICS } from "./schema";

export const PRESETS = {
  requests: {
    label: "사진 요청",
    filters: { ...DEFAULT_FILTERS, kind: "request", status: "published" },
  },
  corrections: {
    label: "개선 제안",
    filters: { ...DEFAULT_FILTERS, kind: "correction", status: "published" },
  },
  resolved: { label: "반영 완료", filters: { ...DEFAULT_FILTERS, status: "resolved" } },
} as const;
const options = (labels: Readonly<Record<string, string>>) =>
  Object.entries(labels)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
export function filterLabel(filters: FeedFilters): string {
  return [
    filters.kind === "all" ? "모든 종류" : KINDS[filters.kind],
    filters.topic === "all" ? "모든 주제" : TOPICS[filters.topic],
    filters.status === "all"
      ? "공개·완료"
      : filters.status === "resolved"
        ? "반영 완료"
        : "공개 중",
  ].join(" · ");
}
export function feedControls(): string {
  return `<div class="c-progress" role="group" aria-label="동네 개선 모아보기">${Object.entries(
    PRESETS,
  )
    .map(
      ([key, preset]) =>
        `<button data-feed-preset="${key}" aria-pressed="false"><span>${preset.label}</span><strong data-feed-count="${key}">—</strong></button>`,
    )
    .join("")}</div>
<p class="c-byline">요청·제안은 공개 중인 글, 완료는 운영자가 반영을 기록한 글이에요.</p>
<details class="c-filter-details"><summary>종류·주제·상태 고르기</summary><form id="c-filters" aria-label="주민 이야기 필터"><div class="c-filter-fields"><label class="c-field">종류<select name="kind"><option value="all">모든 종류</option>${options(KINDS)}</select></label><label class="c-field">주제<select name="topic"><option value="all">모든 주제</option>${options(TOPICS)}</select></label><label class="c-field">반영 상태<select name="status"><option value="all">공개·완료 모두</option><option value="published">공개 중</option><option value="resolved">반영 완료</option></select></label></div></form></details>
<div class="c-feed-actions"><button id="c-filter-reset" disabled>조건 초기화</button><button data-retry-feed>새로 불러오기</button></div>
<p id="c-feed-status" class="c-byline" role="status"></p>`;
}
