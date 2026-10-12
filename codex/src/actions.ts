import type { Complex } from "./complexes";
import type { Layer, Place } from "./data";
import { adDialog, chooseComplex, helpDialog, placeDialog, sourceDialog } from "./dialogs";
import { notebookDialog, noteDialog } from "./notebook-view";
import type { ConnectionStatus } from "./presence";
import type { Peer } from "./protocol";
import type { World } from "./scene/world";
import { downloadNotes, readNotes } from "./storage";
import { showTeleportDialog } from "./teleport-ui";
import { getElement, icon, icons, showDialog, toast } from "./ui";
export type ActionContext = {
  readonly places: readonly Place[];
  readonly state: () => {
    readonly world: World | null;
    readonly complex: Complex;
    readonly selected: string;
    readonly connection: ConnectionStatus;
    readonly peers: readonly Peer[];
  };
  readonly place: () => Place;
  readonly moveTo: (id: string) => void;
  readonly refresh: () => void;
  readonly status: (text: string) => void;
  readonly switchLayer: (layer: Layer) => void;
  readonly resetHome: () => void;
  readonly teleportToPlace: (id: string) => void;
};
function invite(context: ActionContext): void {
  const { complex, connection, peers } = context.state();
  const url = new URL(location.href);
  url.searchParams.set("complex", complex.id);
  showDialog(
    "같은 동네에서 만나요",
    `<p class="dialog-lead">같은 주소로 접속하면 초록색 캐릭터로 서로를 볼 수 있어요.</p><span class="evidence-tag">${connection === "connected" ? `현재 나 포함 ${peers.length + 1}명 연결됨` : "현재 연결되지 않음 · 혼자 탐색 가능"}</span><p class="invite-url" id="invite-url"></p><button class="primary-button" data-action="copy-invite">${icon("copy")}주소 복사</button><p class="fine-print">같은 Wi-Fi에서 휴대폰으로 접속하려면 localhost 대신 컴퓨터의 LAN IP 주소를 사용하세요. 로컬 서버가 켜져 있어야 합니다. 공개 배포는 아직 하지 않았습니다. 둘이서·가족과 버튼의 동행 캐릭터는 접속자 수에 포함하지 않습니다.</p>`,
  );
  getElement("#invite-url", HTMLElement).textContent = url.href;
}
export async function action(id: string, context: ActionContext): Promise<void> {
  const { world, complex, selected } = context.state();
  const { moveTo, place, refresh, status, switchLayer } = context;
  switch (id) {
    case "start":
      moveTo(place().node);
      break;
    case "pause": {
      const paused = world?.pause() ?? false;
      document.querySelectorAll<HTMLButtonElement>('[data-action="pause"]').forEach((button) => {
        button.innerHTML = `${icon(paused ? "play" : "pause")}<span>${paused ? "계속 걷기" : "잠시 멈추기"}</span>`;
      });
      icons();
      status(
        paused
          ? "잠시 쉬는 중 · 계속 걷기로 이어가요"
          : "길안내 중 · 직접 조작하면 자유 이동으로 전환",
      );
      break;
    }
    case "cancel-trip":
      world?.stop();
      refresh();
      status("현재 위치에서 길안내를 멈췄어요.");
      break;
    case "home":
      context.resetHome();
      break;
    case "teleport-selected":
      context.teleportToPlace(place().id);
      break;
    case "teleport-picker":
      showTeleportDialog(context.places, selected, context.teleportToPlace);
      break;
    case "zoom-in":
      world?.rig.scale(0.2);
      break;
    case "zoom-out":
      world?.rig.scale(-0.2);
      break;
    case "rotate":
      world?.rig.rotate(Math.PI / 2);
      break;
    case "reset-camera":
      world?.rig.reset();
      break;
    case "enter":
      switchLayer(selected === "parking-door" ? "parking" : "community");
      break;
    case "complexes":
      chooseComplex(complex);
      break;
    case "sources":
      sourceDialog(complex);
      break;
    case "help":
      helpDialog();
      break;
    case "ad":
      adDialog();
      break;
    case "dismiss-ad":
      getElement("#sponsor", HTMLElement).hidden = true;
      break;
    case "place-detail":
      placeDialog(place(), complex);
      break;
    case "save-note":
      noteDialog(place(), complex);
      break;
    case "notebook":
      notebookDialog();
      break;
    case "export-notes":
      downloadNotes(readNotes());
      toast("수첩 파일을 내려받았습니다.");
      break;
    case "close-dialog":
      getElement("#dialog", HTMLDialogElement).close();
      break;
    case "invite":
      invite(context);
      break;
    case "copy-invite":
      try {
        await navigator.clipboard.writeText(
          getElement("#invite-url", HTMLElement).textContent ?? "",
        );
        toast("주소를 복사했어요.");
      } catch (error) {
        if (error instanceof Error) toast("주소를 길게 눌러 직접 복사해 주세요.");
        else throw error;
      }
      break;
    case "catalog": {
      const { openCatalog } = await import("./catalog");
      await openCatalog();
      break;
    }
  }
}
