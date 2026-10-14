import { element } from "../village/shell";
import { errorMessage, mine, report, withdraw } from "./api";
import { StoryFeed } from "./feed";
import { readReceipts, saveReceipt } from "./journal";
import { receiptSchema, STATES } from "./schema";
import { day, esc } from "./view";

export class Stories {
  private revision = 0;
  private receiptOffset = 0;
  private readonly feed: StoryFeed;
  constructor(
    private readonly complex: string,
    private readonly signal: AbortSignal,
  ) {
    this.feed = new StoryFeed(complex, signal);
    element("#c-panel", HTMLDialogElement).addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest("button");
        if (button?.dataset.report) void this.reportPost(button, button.dataset.report);
        if (button?.dataset.withdraw) void this.withdrawPost(button, button.dataset.withdraw);
        if (button?.hasAttribute("data-retry-feed")) void this.load();
        if (button?.id === "c-receipts-more") void this.receipts(true);
        if (button?.id === "c-restore") void this.restoreReceipt(button);
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
  async load(): Promise<void> {
    if (this.signal.aborted) return;
    await Promise.all([this.feed.load(), this.receipts()]);
  }
  private async receipts(append = false): Promise<void> {
    if (this.signal.aborted) return;
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
  private async restoreReceipt(button: HTMLButtonElement): Promise<void> {
    const field = element("#c-receipt-restore", HTMLTextAreaElement);
    const feedback = element("#c-restore-status", HTMLElement);
    button.disabled = true;
    try {
      const result = receiptSchema.safeParse(JSON.parse(field.value));
      if (!result.success) {
        feedback.textContent = "접수증 JSON 형식을 확인해 주세요.";
        return;
      }
      await mine(result.data);
      if (!saveReceipt(result.data)) {
        feedback.textContent = "브라우저 저장 공간을 확인해 주세요. 기존 접수증은 그대로예요.";
        return;
      }
      feedback.textContent = "서버에서 확인한 접수증을 복원했어요.";
      field.value = "";
      await this.receipts();
    } catch (error) {
      feedback.textContent =
        error instanceof SyntaxError
          ? "접수증 JSON 형식을 확인해 주세요."
          : await errorMessage(error);
    } finally {
      button.disabled = false;
    }
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
