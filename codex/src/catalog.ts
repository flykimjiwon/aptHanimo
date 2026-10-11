import ky from "ky";
import { z } from "zod";
import { COMPLEXES } from "./complexes";
import { getElement, icon, icons, safeText, showDialog } from "./ui";

const rowSchema = z.object({
  id: z.string(),
  name: z.string(),
  district: z.string(),
  dong: z.string(),
  address: z.string(),
  type: z.string(),
  households: z.number().nullable(),
  buildings: z.number().nullable(),
  parking: z.number().nullable(),
  approved: z.string().nullable(),
  heating: z.string(),
  builder: z.string(),
  url: z.url().startsWith("https://openapt.seoul.go.kr/"),
});
const schema = z.object({
  metadata: z.object({
    count: z.number(),
    checked: z.string(),
    scope: z.string(),
    districts: z.array(z.object({ name: z.string(), count: z.number() })),
  }),
  rows: z.array(rowSchema),
});
type Catalog = z.infer<typeof schema>;
let catalog: Catalog | null = null;
let page = 0;
let query = "";
let district = "";
function renderResults(): void {
  if (!catalog) return;
  const q = query.replaceAll(" ", "").toLocaleLowerCase();
  const filtered = catalog.rows.filter(
    (r) =>
      (!district || r.district === district) &&
      (!q || `${r.name}${r.address}`.replaceAll(" ", "").toLocaleLowerCase().includes(q)),
  );
  const max = Math.max(1, Math.ceil(filtered.length / 15));
  page = Math.min(page, max - 1);
  getElement("#catalog-results", HTMLElement).innerHTML =
    `<p class="catalog-total">${filtered.length.toLocaleString()}개 공개 레코드 · ${page + 1} / ${max}페이지</p>${
      filtered
        .slice(page * 15, page * 15 + 15)
        .map(
          (r) =>
            `<article class="catalog-result"><div><strong>${safeText(r.name)}</strong><small>${safeText(r.district)} ${safeText(r.dong)} · ${r.households || "미등록"}세대 · ${r.buildings ?? "미등록"}동</small><small>${safeText(r.address)}</small><small>승인 ${r.approved ?? "미등록"} · 주차 ${r.parking ?? "미등록"}대 · ${safeText(r.heating)}</small></div><a href="${r.url}" target="_blank" rel="noreferrer" aria-label="${safeText(r.name)} 공식 정보">원본 ${icon("arrow-up-right")}</a></article>`,
        )
        .join("") || '<p class="empty-state">조건에 맞는 단지가 없어요. 검색어를 줄여보세요.</p>'
    }<div class="pagination"><button class="quiet" id="catalog-prev" ${page === 0 ? "disabled" : ""}>${icon("arrow-left")}이전</button><span>3D 탐색은 위 세 단지만 지원</span><button class="quiet" id="catalog-next" ${page >= max - 1 ? "disabled" : ""}>다음${icon("arrow-right")}</button></div>`;
  getElement("#catalog-prev", HTMLButtonElement).onclick = () => {
    page--;
    renderResults();
  };
  getElement("#catalog-next", HTMLButtonElement).onclick = () => {
    page++;
    renderResults();
  };
  icons();
}
export async function openCatalog(): Promise<void> {
  showDialog(
    "서울 단지 도감",
    `<p class="dialog-lead">먼저 걸어볼 수 있는 세 개의 동네</p><div class="complex-grid">${COMPLEXES.map((c) => `<button class="complex-option" data-complex="${c.id}"><span class="eyebrow">${c.district}</span><strong>${c.name}</strong><span>${c.homes}세대 · ${c.built}</span><small>${c.focus}</small><span class="complex-option-cta">월드 열기 ${icon("arrow-right")}</span></button>`).join("")}</div><section id="catalog-data"><p class="fine-print">서울 25개 구 공개 단지 목록을 불러오는 중입니다.</p></section>`,
  );
  try {
    catalog ??= schema.parse(
      await ky.get("/data/seoul-complexes.json", { timeout: 12000, retry: 1 }).json(),
    );
  } catch (error) {
    if (error instanceof Error) {
      const panel = document.querySelector("#catalog-data");
      if (panel)
        panel.innerHTML =
          '<p class="notice-strip">목록을 불러오지 못했어요. 연결을 확인하고 도감을 다시 열어 주세요.</p>';
      return;
    }
    throw error;
  }
  if (!getElement("#dialog", HTMLDialogElement).open || !document.querySelector("#catalog-data"))
    return;
  getElement("#catalog-data", HTMLElement).innerHTML =
    `<h3 class="catalog-section-title">25개 구, ${catalog.metadata.count.toLocaleString()}개 공개 기록</h3><p class="fine-print">서울시 공동주택 데이터 전체 공개 레코드입니다. 임대 관리구분·주상복합 등이 포함되며, 서울의 모든 건축물 목록은 아닙니다. 세대 0은 미등록 가능성이 있어요.</p><div class="catalog-form"><label><span class="field-label">자치구</span><select id="catalog-district"><option value="">서울 전체</option>${catalog.metadata.districts.map((d) => `<option value="${d.name}">${d.name} · ${d.count}</option>`).join("")}</select></label><label><span class="field-label">단지명·주소 검색</span><input type="search" id="catalog-search" placeholder="예: 왕십리자이, 신당동" maxlength="100"></label></div><div id="catalog-results"></div><p class="fine-print">출처: <a href="https://data.seoul.go.kr/dataList/OA-15818/A/1/datasetView.do" target="_blank" rel="noreferrer">서울열린데이터광장</a> · 서울특별시 / 공공누리 1유형<br>2026.10.11 수집. 임의로 중복 병합하지 않았습니다.</p>`;
  page = 0;
  query = "";
  district = "";
  getElement("#catalog-district", HTMLSelectElement).onchange = (event) => {
    if (event.target instanceof HTMLSelectElement) {
      district = event.target.value;
      page = 0;
      renderResults();
    }
  };
  getElement("#catalog-search", HTMLInputElement).oninput = (event) => {
    if (event.target instanceof HTMLInputElement) {
      query = event.target.value;
      page = 0;
      renderResults();
    }
  };
  renderResults();
}
