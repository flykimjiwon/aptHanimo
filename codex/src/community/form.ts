import type { ComplexId } from "../complexes";
import { element } from "../village/shell";
import { errorMessage, submit } from "./api";
import { saveReceipt } from "./journal";

export function bindSubmission(complex: ComplexId, signal: AbortSignal): void {
  const form = element("#c-submit", HTMLFormElement),
    feedback = element("#c-submit-status", HTMLElement);
  const preview = element("#c-preview", HTMLImageElement),
    button = element('#c-submit button[type="submit"]', HTMLButtonElement);
  let previewUrl = "";
  const release = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  };
  signal.addEventListener("abort", release, { once: true });
  const date = element('#c-submit [name="observedOn"]', HTMLInputElement);
  date.value = date.max = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  form.addEventListener(
    "input",
    () => {
      form.dataset.dirty = "true";
    },
    { signal },
  );
  form.addEventListener(
    "change",
    (event) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== "file") return;
      release();
      const file = event.target.files?.[0];
      preview.hidden = true;
      feedback.textContent = "";
      if (!file) return;
      if (
        file.size > 6 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      ) {
        feedback.textContent =
          "6MB 이하의 JPG·PNG·WebP를 골라 주세요. HEIC 사진은 JPG로 내보내 주세요.";
        event.target.value = "";
        return;
      }
      previewUrl = URL.createObjectURL(file);
      preview.src = previewUrl;
      preview.hidden = false;
    },
    { signal },
  );
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      if (button.disabled) return;
      const data = new FormData(form);
      data.set("complex", complex);
      button.disabled = true;
      button.textContent = "보내는 중…";
      feedback.textContent = "사진과 내용을 안전하게 보관하고 있어요.";
      void (async () => {
        try {
          const receipt = await submit(data);
          const saved = saveReceipt(receipt);
          form.reset();
          date.value = date.max;
          form.dataset.dirty = "false";
          release();
          preview.hidden = true;
          feedback.textContent = saved
            ? "접수했어요. 검토 후 공개되며, 주민 이야기의 내 제보에서 상태를 확인하거나 철회할 수 있어요."
            : "서버에 접수했지만 브라우저에 접수증을 저장하지 못했어요. 아래 접수증을 복사해 보관해 주세요.";
          if (!saved) {
            const copy = document.createElement("textarea");
            copy.readOnly = true;
            copy.setAttribute("aria-label", "비공개 접수증 — 다른 사람에게 공유하지 마세요");
            copy.value = JSON.stringify(receipt);
            feedback.append(copy);
          }
        } catch (error) {
          feedback.textContent = await errorMessage(error);
        } finally {
          button.disabled = false;
          button.textContent = "검토 요청 보내기";
          feedback.focus();
        }
      })();
    },
    { signal },
  );
}
