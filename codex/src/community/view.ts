import type { SpatialWorld } from "../spatial/types";
import { CHECKS, STAMPS } from "./journal";
import { type CommunityPost, KINDS, STATES, TOPICS } from "./schema";

export const esc = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
export const day = (value: string): string =>
  new Date(value).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
const options = (values: Readonly<Record<string, string>>) =>
  Object.entries(values)
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join("");
export function postCard(post: CommunityPost): string {
  return `<article class="c-post"><p class="c-caption">${KINDS[post.kind]} · ${TOPICS[post.topic]} · ${STATES[post.status]}</p><h3>${esc(post.place)}</h3><p class="c-byline">${esc(post.nickname)} · ${post.relationship === "resident" ? "주민" : "방문자"}(본인 표기)<br>${day(post.observedOn)} 관찰 · ${day(post.createdAt)} 접수</p><p class="c-content">${esc(post.body)}</p>${post.photo ? `<img src="/api/community/photos/${post.id}" alt="${esc(post.place)} 제보 사진" width="640" height="480" loading="lazy">` : ""}${post.response ? `<p class="c-response">운영자 · ${esc(post.response)}</p>` : ""}<button data-report="${post.id}">문제 신고</button></article>`;
}
export function panelShell(world: SpatialWorld): string {
  return `<header><div><p class="v-eyebrow">${esc(world.name)}</p><h2 id="c-title">함께 만드는 동네</h2></div><button data-close aria-label="동네 수첩 닫기">×</button></header>
<nav class="c-tabs" aria-label="동네 수첩 메뉴"><button data-tab="journal" aria-pressed="true">임장 수첩</button><button data-tab="stories" aria-pressed="false">주민 이야기</button><button data-tab="contribute" aria-pressed="false">사진·제보</button></nav>
<div class="c-body"><section data-section="journal"><h3>작은 섬 탐험</h3><p>세 가지를 해보면 탐험 도장이 채워져요. 가상 산책 기록이며 실제 방문 인증은 아니에요.</p><div class="c-stamps">${Object.entries(
    STAMPS,
  )
    .map(([id, text]) => `<span data-stamp="${id}">${text}</span>`)
    .join(
      "",
    )}</div><h3>현장에서 확인할 것</h3><p>체크와 메모는 이 브라우저에만 저장돼요.</p><form id="c-journal">${CHECKS.map((label) => `<label class="c-check"><input type="checkbox" name="check" value="${label}">${label}</label>`).join("")}<label class="c-field">내 현장 메모<textarea name="note" maxlength="2000" rows="4" placeholder="확인한 시간, 위치와 상황을 적어보세요."></textarea></label><button type="submit" class="v-primary">수첩 저장</button><p id="c-save-status" role="status"></p></form><h3>지도에서 먼저 찾아볼 곳</h3><p>기존 지도 자료의 장소 목록이에요. 운영 여부·실제 동선·장단점은 현장과 주민 의견으로 확인해 주세요.</p><ul class="c-places">${
    world.pois
      .slice(0, 8)
      .map(
        (p) =>
          `<li><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">${esc(p.name)} ↗</a></li>`,
      )
      .join("") || "<li>등록된 주변 장소가 없어요. 사진·제보에서 추가를 요청해 주세요.</li>"
  }</ul><p class="c-byline">자료 확인 ${day(world.sources[0]?.checked ?? "2026-10-11")} · © OpenStreetMap contributors</p><a href="/world.html?complex=${world.id}">생활권 지도·기존 임장 수첩 열기 →</a></section>
<section data-section="stories" hidden><h3>좋았던 점도, 아쉬웠던 점도</h3><p>검토 후 공개한 관찰 의견이에요. 주민 여부는 본인 표기이며, 공개됐다는 뜻이 사실 인증을 뜻하지는 않아요.</p><button data-retry-feed>새로 불러오기</button><div id="c-feed" aria-live="polite"></div><button id="c-more" hidden>이전 이야기 더 보기</button><button data-tab="contribute" class="v-primary">경험 나누기</button><h3>이 브라우저에서 보낸 제보</h3><p class="c-byline">접수증이 저장된 브라우저에서만 상태 확인·철회가 가능해요.</p><div id="c-receipts"></div><button id="c-receipts-more" hidden>이전 접수증 더 보기</button><details><summary>보관한 접수증 복원</summary><label class="c-field">내 비공개 접수증<textarea id="c-receipt-restore" rows="3" placeholder="저장해 둔 접수증 JSON을 붙여 넣으세요."></textarea></label><button id="c-restore">접수증 복원</button><p id="c-restore-status" role="status"></p></details></section>
<section data-section="contribute" hidden><h3>사진 한 장으로 더 정확하게</h3><p>출입구, 경사, 보행로, 건물 외관 사진을 기다려요. 보완할 위치와 방향을 적으면 지도 개선에 도움이 돼요.</p><form id="c-submit"><div class="c-pair"><label class="c-field">제보 유형<select name="kind">${options(KINDS)}</select></label><label class="c-field">주제<select name="topic">${options(TOPICS)}</select></label></div><div class="c-pair"><label class="c-field">닉네임<input name="nickname" required minlength="2" maxlength="24" autocomplete="nickname"></label><label class="c-field">이 동네와의 관계<select name="relationship"><option value="visitor">방문자</option><option value="resident">주민 (본인 표기)</option></select></label></div><label class="c-field">어디인가요?<input name="place" required minlength="2" maxlength="80" placeholder="예: 정문에서 101동으로 가는 길"></label><label class="c-field">확인한 날짜<input type="date" name="observedOn" required></label><label class="c-field">관찰 내용 · 요청 내용<textarea name="body" required minlength="10" maxlength="2000" rows="5" placeholder="언제, 어디에서, 무엇을 보았나요? 장점·불편한 점·고칠 부분을 구체적으로 적어 주세요."></textarea></label><label class="c-field">사진 첨부 · 선택<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"><span class="c-byline">JPG·PNG·WebP, 6MB·2천만 화소 이하. 위치정보는 제거하고 작은 사진으로 보관해요.</span></label><img id="c-preview" alt="첨부할 사진 미리보기" width="640" height="480" hidden><label class="c-check"><input type="checkbox" name="consent" value="yes" required>직접 작성·촬영한 자료이며, 검토 후 공개와 지도 개선에 사용하는 데 동의해요. 얼굴·차량번호·호수·연락처는 지워 주세요.</label><button type="submit" class="v-primary">검토 요청 보내기</button><p id="c-submit-status" role="status" tabindex="-1"></p></form></section></div>`;
}
