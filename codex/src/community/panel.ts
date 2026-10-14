import "./community.css";
import type { ComplexId } from "../complexes";
import type { SpatialWorld } from "../spatial/types";
import { element } from "../village/shell";
import { bindSubmission } from "./form";
import { CHECKS, readJournal, saveJournal } from "./journal";
import { Stories } from "./stories";
import { panelShell } from "./view";

type Tab = "journal" | "stories" | "contribute";
let current: {
  readonly complex: ComplexId;
  readonly dialog: HTMLDialogElement;
  readonly events: AbortController;
  readonly open: (tab: Tab) => void;
} | null = null;
export function openCommunity(world: SpatialWorld, complex: ComplexId, tab: Tab): void {
  if (current?.complex === complex) {
    current.open(tab);
    return;
  }
  if (current) {
    if (
      current.dialog.querySelector('[data-dirty="true"]') &&
      !window.confirm("이전 단지에 저장하지 않은 내용이 있어요. 새 단지로 바꿀까요?")
    )
      return;
    current.events.abort();
    current.dialog.remove();
  }
  const dialog = document.createElement("dialog");
  dialog.id = "c-panel";
  dialog.setAttribute("aria-labelledby", "c-title");
  dialog.innerHTML = panelShell(world);
  element("#app", HTMLDivElement).append(dialog);
  const events = new AbortController(),
    { signal } = events;
  const stories = new Stories(complex, signal);
  const open = (next: Tab): void => {
    dialog.querySelectorAll<HTMLElement>("[data-section]").forEach((section) => {
      section.hidden = section.dataset.section !== next;
    });
    dialog.querySelectorAll<HTMLButtonElement>(".c-tabs [data-tab]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.tab === next));
    });
    element(".c-body", HTMLElement).scrollTop = 0;
    if (!dialog.open) dialog.showModal();
    if (next === "stories") void stories.load();
    if (next === "journal") syncJournal();
  };
  dialog.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button"),
        next = button?.dataset.tab;
      if (next === "journal" || next === "stories" || next === "contribute") open(next);
      if (button?.hasAttribute("data-close")) dialog.close();
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dialog.close();
      }
    },
    { signal },
  );
  const journal = element("#c-journal", HTMLFormElement);
  function syncJournal(): void {
    const { value, error } = readJournal(complex);
    if (journal.dataset.dirty !== "true") {
      element('#c-journal [name="note"]', HTMLTextAreaElement).value = value.note;
      journal.querySelectorAll<HTMLInputElement>('[name="check"]').forEach((input) => {
        input.checked = value.checks.some((c) => c === input.value);
      });
    }
    dialog.querySelectorAll<HTMLElement>("[data-stamp]").forEach((stamp) => {
      const checked = value.stamps.some((s) => s === stamp.dataset.stamp);
      stamp.dataset.done = String(checked);
      stamp.setAttribute("aria-label", `${stamp.textContent} · ${checked ? "완료" : "아직"}`);
    });
    element("#c-save-status", HTMLElement).textContent = error;
  }
  journal.addEventListener(
    "input",
    () => {
      journal.dataset.dirty = "true";
    },
    { signal },
  );
  journal.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const { value, error } = readJournal(complex),
        form = new FormData(journal);
      const saved =
        !error &&
        saveJournal(complex, {
          ...value,
          checks: CHECKS.filter((c) => form.getAll("check").includes(c)),
          note: element('#c-journal [name="note"]', HTMLTextAreaElement).value,
        });
      element("#c-save-status", HTMLElement).textContent = saved
        ? "이 브라우저에 저장했어요. 주민에게 공개되지는 않아요."
        : "저장하지 못했어요. 메모를 따로 복사해 주세요.";
      if (saved) journal.dataset.dirty = "false";
    },
    { signal },
  );
  window.addEventListener(
    "beforeunload",
    (event) => {
      if (dialog.querySelector('[data-dirty="true"]')) event.preventDefault();
    },
    { signal },
  );
  bindSubmission(complex, signal);
  current = { complex, dialog, events, open };
  open(tab);
}
