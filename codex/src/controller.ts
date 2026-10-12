import { refreshApplication } from "./application-ui";
import { COMPLEXES, type Complex, placesFor } from "./complexes";
import type { Layer, Mode, Party, Place } from "./data";
import { updateGameHUD } from "./game-ui";
import { START } from "./graph";
import { type ConnectionStatus, Presence } from "./presence";
import type { Peer } from "./protocol";
import type { World } from "./scene/world";
import { loadSpatial } from "./spatial/load";
import type { GroundPoint, SpatialWorld } from "./spatial/types";
import { teleportToKnownPlace } from "./teleport-ui";
import { controls, getElement, journey, presenceIndicator, toast, worldUnavailable } from "./ui";
export class Controller {
  complex: Complex;
  places: readonly Place[];
  selected = "home";
  mode: Mode = "walk";
  party: Party = "solo";
  layer: Layer = "ground";
  filter = "all";
  world: World | null = null;
  peers: readonly Peer[] = [];
  connection: ConnectionStatus = "connecting";
  onGround: (point: GroundPoint) => boolean = () => false;
  private spatial: SpatialWorld | null = null;
  private presence: Presence | null = null;
  private request = 0;
  private hudTimer: ReturnType<typeof setInterval> | undefined;
  constructor() {
    const complex =
      COMPLEXES.find((c) => c.id === new URLSearchParams(location.search).get("complex")) ??
      COMPLEXES[0];
    if (!complex) throw new RangeError("No complex configured");
    this.complex = complex;
    this.places = placesFor(complex);
  }
  readonly place = (): Place => {
    const result = this.places.find((p) => p.id === this.selected);
    if (!result) throw new RangeError("Unknown place");
    return result;
  };
  readonly status = (text: string): void => {
    getElement("#trip-status", HTMLElement).textContent = text;
  };
  readonly refresh = (): void => refreshApplication(this, this.spatial);
  selectPlace(id: string): void {
    if (!this.places.some((p) => p.id === id)) return;
    this.world?.stop();
    this.selected = id;
    this.refresh();
    this.status(`${this.place().short} · 자유롭게 걷거나 길안내를 따라가요`);
  }
  readonly teleportToPlace = (id: string): void => teleportToKnownPlace(this, id);
  readonly moveTo = (id: string): void => {
    const path = this.world?.planTo(id);
    if (!path) {
      toast("연결된 길을 찾지 못했어요. 직접 걸어보거나 다른 이동 방식을 골라주세요.");
      return;
    }
    this.world?.move(path);
    this.world?.setRoute(path);
    journey(this.place(), path, true, false);
    this.status("길안내 중 · 방향키나 조이스틱으로 바로 자유 이동");
  };
  readonly switchLayer = (layer: Layer): void => {
    this.layer = layer;
    this.filter = "all";
    if (layer === "community" && (this.mode === "car" || this.mode === "bike")) this.mode = "walk";
    const start = layer === "parking" && this.mode === "car" ? "stall" : START[layer];
    this.selected = start;
    this.world?.setLayer(layer, this.complex.variant);
    this.world?.setPlayer(this.mode, this.party);
    this.world?.teleport(start);
    this.world?.setPeers(this.peers);
    this.refresh();
    this.status(
      layer === "ground"
        ? "다시 동네를 자유롭게 걸어요"
        : "실내 공간은 실제 도면이 없는 구조 예시예요",
    );
  };
  setMode(mode: Mode): void {
    this.world?.stop();
    const wasCar = this.mode === "car";
    this.mode = mode;
    if (this.layer === "community" && (mode === "car" || mode === "bike"))
      this.switchLayer("ground");
    this.world?.setPlayer(mode, this.party);
    if (this.layer === "parking" && mode === "car" && !wasCar) {
      this.world?.teleport("stall");
      this.selected = "stall";
      this.status("차량 구역에서 출발해요 · 엘리베이터는 도보로 이동해 주세요");
    }
    this.refresh();
  }
  setParty(party: Party): void {
    this.party = party;
    this.world?.setPlayer(this.mode, party);
    controls(this.mode, party, this.layer);
  }
  async switchComplex(complex: Complex): Promise<void> {
    const request = ++this.request;
    const loading = getElement("#canvas-loading", HTMLElement);
    loading.hidden = false;
    try {
      const spatial = await loadSpatial(complex.id);
      if (request !== this.request) return;
      this.complex = complex;
      this.applySpatial(spatial);
      this.mode = "walk";
      this.layer = "ground";
      this.selected = "home";
      this.filter = "all";
      this.world?.setSpatial(spatial);
      this.world?.setPlayer(this.mode, this.party);
      this.world?.teleport("home");
      this.peers = [];
      this.world?.setPeers([]);
      this.presence?.setComplex(complex.id);
      const url = new URL(location.href);
      url.searchParams.set("complex", complex.id);
      history.replaceState(null, "", url);
      this.refresh();
      getElement("#dialog", HTMLDialogElement).close();
      this.status(`${complex.short}의 실제 지도 위에서 산책을 시작해요`);
    } catch (error) {
      if (request !== this.request) return;
      if (error instanceof Error) toast("공간 자료를 읽지 못했어요. 잠시 후 다시 선택해 주세요.");
      else throw error;
    } finally {
      if (request === this.request) loading.hidden = true;
    }
  }
  private applySpatial(data: SpatialWorld): void {
    this.spatial = data;
    this.places = placesFor(this.complex).filter(
      (p) => p.layer !== "ground" || p.id === "home" || data.pois.some((poi) => poi.id === p.id),
    );
    if (!this.places.some((p) => p.id === this.selected)) this.selected = "home";
  }
  readonly resetHome = (): void => {
    this.world?.teleport(
      this.layer === "parking" && this.mode === "car" ? "stall" : START[this.layer],
    );
    this.refresh();
    this.status("산책 출발점으로 돌아왔어요");
  };
  readonly state = () => ({
    world: this.world,
    complex: this.complex,
    selected: this.selected,
    connection: this.connection,
    peers: this.peers,
  });
  async initialize(): Promise<void> {
    const request = ++this.request;
    this.refresh();
    try {
      const [{ World }, spatial] = await Promise.all([
        import("./scene/world"),
        loadSpatial(this.complex.id),
      ]);
      if (request !== this.request) return;
      this.applySpatial(spatial);
      this.world = new World(
        getElement("#world-stage", HTMLElement),
        getElement("#world-labels", HTMLElement),
        {
          onSelect: (id) => this.selectPlace(id),
          onGround: (point) => this.onGround(point),
          onComplete: (blocked) => {
            this.refresh();
            this.status(
              blocked
                ? "길이 막혀 안내를 멈췄어요 · 다른 길을 골라주세요"
                : "선택한 길 끝에 도착했어요 · 출입구는 현장에서 확인해 주세요",
            );
            getElement("#world-stage", HTMLElement).dataset.currentNode = "free";
          },
          onArrive: (id) => {
            this.refresh();
            const arrived = this.places.find((place) => place.id === this.world?.nearPlace);
            this.status(`${arrived?.short ?? "선택한 길"}에 도착했어요`);
            getElement("#world-stage", HTMLElement).dataset.currentNode = id;
          },
          onPosition: (x, z, y) =>
            this.presence?.send({
              x,
              z,
              y,
              mode: this.mode,
              party: this.party,
              layer: this.layer,
              heading: this.world?.position.heading ?? 0,
            }),
          onManual: (moving) => {
            if (moving) this.status("자유 산책 중 · 원하는 길로 걸어보세요");
            else this.refresh();
          },
        },
      );
      this.world.setSpatial(spatial);
      this.world.setPlayer(this.mode, this.party);
      this.world.teleport("home");
      this.refresh();
      getElement("#canvas-loading", HTMLElement).hidden = true;
      this.presence = new Presence(
        this.complex.id,
        (peers) => {
          this.peers = peers;
          this.world?.setPeers(peers);
          presenceIndicator(this.connection, peers.length);
        },
        (state) => {
          this.connection = state;
          presenceIndicator(state, this.peers.length);
        },
      );
      this.hudTimer = setInterval(() => {
        if (this.world) {
          updateGameHUD({
            position: this.world.position,
            following: this.world.rig.following,
            screen: this.world.screenPosition,
            ground: this.layer === "ground",
            night: this.world.presentation.night,
            economy: this.world.presentation.economy,
            zoomPercent: this.world.rig.zoomPercent,
            requestedZoom: this.world.rig.requestedZoom,
            fps: this.world.presentation.fps,
            drawCalls: this.world.presentation.drawCalls,
            triangles: this.world.presentation.triangles,
            pixelRatio: this.world.presentation.pixelRatio,
          });
        }
      }, 250);
    } catch (error) {
      if (request !== this.request) return;
      if (error instanceof Error) worldUnavailable(error);
      else throw error;
    }
  }
  reconnect(): void {
    this.presence?.setComplex(this.complex.id);
  }
  suspendPresence(): void {
    this.request += 1;
    this.presence?.dispose();
    if (this.world) getElement("#canvas-loading", HTMLElement).hidden = true;
  }
  dispose(): void {
    this.request += 1;
    clearInterval(this.hudTimer);
    this.presence?.dispose();
    this.world?.dispose();
  }
}
