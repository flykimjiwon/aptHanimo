import { readJournal } from "../community/journal";
import { complexSchema } from "../community/schema";
import type { VillageSession } from "./session";
import { element } from "./shell";

export function bindNeighborhood(
  getSession: () => VillageSession | null,
  signal: AbortSignal,
): () => void {
  const entry = document.createElement("section");
  entry.className = "v-neighborhood";
  entry.setAttribute("aria-label", "함께 만드는 동네");
  entry.innerHTML =
    '<div><p class="v-eyebrow">산책에서 발견한 이야기</p><p>내 수첩에 담고, 이웃과 더 정확한 지도를 만들어요.</p></div><div><button data-neighborhood="journal">동네 수첩 <span id="v-stamp-count">0/3</span></button><button data-neighborhood="stories">주민 이야기</button><button data-neighborhood="contribute">사진·수정 제보</button></div><p id="v-community-status" role="status"></p>';
  element(".v-sources", HTMLElement).before(entry);
  const refresh = (): void => {
    const session = getSession();
    entry.inert = !session;
    element('.v-header [data-neighborhood="journal"]', HTMLButtonElement).disabled = !session;
    if (session)
      element("#v-stamp-count", HTMLElement).textContent =
        `${readJournal(complexSchema.parse(session.world.id)).value.stamps.length}/3`;
  };
  let opening = false;
  element("#app", HTMLDivElement).addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element) || opening) return;
      const tab = event.target.closest("button")?.dataset.neighborhood,
        session = getSession();
      if (!session || (tab !== "journal" && tab !== "stories" && tab !== "contribute")) return;
      session.pause();
      opening = true;
      const feedback = element("#v-community-status", HTMLElement);
      feedback.textContent = "수첩을 열고 있어요.";
      void import("../community/panel")
        .then(({ openCommunity }) => {
          if (signal.aborted || session !== getSession()) return;
          openCommunity(session.world, complexSchema.parse(session.world.id), tab);
          feedback.textContent = "";
        })
        .catch((error: unknown) => {
          if (!(error instanceof Error)) throw error;
          feedback.textContent = "수첩을 열지 못했어요. 연결을 확인하고 다시 눌러 주세요.";
        })
        .finally(() => {
          opening = false;
        });
    },
    { signal },
  );
  window.addEventListener("village:journal", refresh, { signal });
  return refresh;
}
