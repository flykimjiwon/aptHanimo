import { element } from "../village/shell";
import { errorMessage, feed, mine, report, withdraw } from "./api";
import { readReceipts, saveReceipt } from "./journal";
import { receiptSchema, STATES } from "./schema";
import { day, esc, postCard } from "./view";

export class Stories {
  private next: number | null = null;
  private busy = false;
  private revision = 0;
  private receiptOffset = 0;
  private readonly host = element("#c-feed", HTMLElement);
  private readonly more = element("#c-more", HTMLButtonElement);
  constructor(
    private readonly complex: string,
    signal: AbortSignal,
  ) {
    this.more.addEventListener("click", () => void this.load(true), { signal });
    element("#c-panel", HTMLDialogElement).addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest("button");
        if (button?.dataset.report) void this.reportPost(button, button.dataset.report);
        if (button?.dataset.withdraw) void this.withdrawPost(button, button.dataset.withdraw);
        if (button?.hasAttribute("data-retry-feed")) void this.load();
        if (button?.id === "c-receipts-more") void this.receipts(true);
        if (button?.id === "c-restore") {
          const field = element("#c-receipt-restore", HTMLTextAreaElement);
          let restored = false;
          try {
            const result = receiptSchema.safeParse(JSON.parse(field.value));
            restored = result.success && saveReceipt(result.data);
          } catch (error) {
            if (!(error instanceof Error)) throw error;
          }
          element("#c-restore-status", HTMLElement).textContent = restored
            ? "접수증을 복원했어요."
            : "접수증 형식과 브라우저 저장 공간을 확인해 주세요.";
          if (restored) {
            field.value = "";
            void this.receipts();
          }
        }
      },
      { signal },
    );
    signal.addEventListener(
      "abort",
      () => {
        this.revision++;
      },
      { once: true },
    );
  }
  async load(append = false): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.more.disabled = true;
    const revision = this.revision;
    if (!append) this.host.textContent = "이웃의 이야기를 불러오고 있어요.";
    try {
      const result = await feed(this.complex, append ? (this.next ?? undefined) : undefined);
      if (revision !== this.revision) return;
      if (!append) this.host.replaceChildren();
      this.host.insertAdjacentHTML("beforeend", result.posts.map(postCard).join(""));
      if (!this.host.children.length)
        this.host.innerHTML =
          '<p class="c-empty">아직 공개된 이야기가 없어요. 첫 관찰이나 사진을 나눠 주세요. 검토 대기 중인 내용은 공개 목록에 나오지 않아요.</p>';
      this.next = result.next;
      this.more.hidden = this.next === null;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (revision !== this.revision) return;
      const message =
        '<p role="status">이야기를 불러오지 못했어요. 서버 연결을 확인해 주세요.</p><button data-retry-feed>다시 불러오기</button>';
      if (append) this.host.insertAdjacentHTML("beforeend", message);
      else this.host.innerHTML = message;
    } finally {
      this.busy = false;
      this.more.disabled = false;
    }
    if (!append) await this.receipts();
  }
  private async receipts(append = false): Promise<void> {
    const host = element("#c-receipts", HTMLElement),
      revision = this.revision;
    const more = element("#c-receipts-more", HTMLButtonElement);
    if (more.disabled) return;
    more.disabled = true;
    if (!append) {
      this.receiptOffset = 0;
      host.textContent = "최근 접수증을 확인하고 있어요.";
    }
    const receipts = [...readReceipts()].reverse();
    const results = await Promise.allSettled(
      receipts.slice(this.receiptOffset, this.receiptOffset + 20).map((r) => mine(r)),
    );
    if (revision !== this.revision) return;
    this.receiptOffset += 20;
    more.disabled = false;
    more.hidden = this.receiptOffset >= receipts.length;
    const posts = results.flatMap((r) =>
      r.status === "fulfilled" && r.value.complex === this.complex ? [r.value] : [],
    );
    if (!append) host.replaceChildren();
    host.insertAdjacentHTML(
      "beforeend",
      posts
        .map(
          (p) =>
            `<article class="c-receipt"><p><strong>${STATES[p.status]}</strong> · ${day(p.createdAt)}</p><h4>${esc(p.place)}</h4><p>${esc(p.body.slice(0, 100))}</p>${p.response ? `<p>운영자 · ${esc(p.response)}</p>` : ""}<button data-withdraw="${p.id}">제보 철회</button></article>`,
        )
        .join(""),
    );
    if (!host.children.length)
      host.innerHTML = "<p>이 단지에서 확인할 수 있는 접수증이 없어요.</p>";
    if (results.some((r) => r.status === "rejected"))
      host.insertAdjacentHTML("beforeend", "<p>일부 접수증은 철회되었거나 연결할 수 없어요.</p>");
  }
  private async reportPost(button: HTMLButtonElement, id: string): Promise<void> {
    const reason = window.prompt(
      "어떤 문제가 있나요? 개인정보·부정확한 정보 등 이유를 5자 이상 적어 주세요.",
    );
    if (!reason) return;
    button.disabled = true;
    try {
      await report(id, reason);
      button.textContent = "신고 접수됨";
    } catch (error) {
      button.textContent = await errorMessage(error);
      button.disabled = false;
    }
  }
  private async withdrawPost(button: HTMLButtonElement, id: string): Promise<void> {
    const receipt = readReceipts().find((r) => r.id === id);
    if (
      !receipt ||
      !window.confirm("이 제보와 사진을 서버에서 삭제할까요? 공개 목록에서도 사라져요.")
    )
      return;
    button.disabled = true;
    try {
      await withdraw(receipt);
      await this.load();
    } catch (error) {
      button.textContent = await errorMessage(error);
      button.disabled = false;
    }
  }
}
