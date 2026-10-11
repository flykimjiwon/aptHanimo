import { Color, type Group, Scene, type WebGLRenderer } from "three";
import type { Layer, Mode, Party, Place } from "../data";
import type { Route } from "../routes";
import type { GroundPoint, SpatialWorld, XY } from "../spatial/types";
import { DEFAULT_WORLD_STYLE, type WorldStyle } from "../world-style";
import { readWorldStyle } from "../world-style-storage";
import { BuildingOcclusion } from "./building-occlusion";
import { CameraRig } from "./camera";
import { bindWorldInput } from "./input";
import { interior } from "./interior";
import { WorldLabels } from "./labels";
import { addLighting } from "./lighting";
import { worldMapTheme } from "./map-style";
import { ModelDriver } from "./model-driver";
import type { MotorPosition } from "./motor";
import { PeerAvatars, type PeerState } from "./peer-avatars";
import { PlayerAvatar } from "./player-avatar";
import { WorldPresentation } from "./presentation";
import { createSceneRenderer, observeWorldSize } from "./scene-renderer";
import { SpatialDriver } from "./spatial-driver";
import { terrain } from "./terrain";
import type { WorldEvents } from "./world-events";
import { worldFrame } from "./world-frame";
import { stepPlayer } from "./world-step";
import { WorldSurface } from "./world-surface";

export class World {
  readonly rig = new CameraRig();
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;
  readonly presentation: WorldPresentation;
  style: WorldStyle = DEFAULT_WORLD_STYLE;
  private readonly surface = new WorldSurface(this.scene);
  private readonly player = new PlayerAvatar(this.scene);
  private readonly peers = new PeerAvatars();
  private readonly occlusion = new BuildingOcclusion();
  private layer: Layer = "ground";
  private mode: Mode = "walk";
  private current = "home";
  private spatial: SpatialWorld | null = null;
  private driver: SpatialDriver | null = null;
  private readonly modelDriver = new ModelDriver("walk");
  private manualInput: XY = [0, 0];
  private manualActive = false;
  private paused = false;
  private readonly labels: WorldLabels;
  private readonly observer: ResizeObserver;
  private readonly releaseInput: () => void;

  constructor(
    host: HTMLElement,
    labelHost: HTMLElement,
    private readonly events: WorldEvents,
  ) {
    this.labels = new WorldLabels(labelHost, events.onSelect);
    this.renderer = createSceneRenderer(host);
    addLighting(this.scene);
    this.scene.add(this.peers.group);
    this.presentation = new WorldPresentation(this.scene, this.renderer);
    this.setStyle(readWorldStyle());
    this.observer = observeWorldSize(host, {
      presentation: this.presentation,
      renderer: this.renderer,
      rig: this.rig,
    });
    this.releaseInput = bindWorldInput(this.renderer.domElement, {
      rig: this.rig,
      ground: () => this.surface.ground,
      heightAt: (point) => this.driver?.heightAt(point) ?? 0,
      onGround: (point) => this.moveToGround(point),
      onMove: (input) => this.setManualInput(input),
    });
    this.renderer.setAnimationLoop(
      worldFrame({
        rig: this.rig,
        presentation: this.presentation,
        player: this.player,
        peers: this.peers,
        occlusion: this.occlusion,
        labels: this.labels,
        step: (delta) => this.step(delta),
        emitPosition: () => this.emitPosition(),
      }),
    );
  }

  get currentNode(): string {
    return this.current;
  }

  get moving(): boolean {
    return this.layer === "ground" ? (this.driver?.moving ?? false) : this.modelDriver.moving;
  }

  get position(): MotorPosition {
    return (this.layer === "ground" ? this.driver?.position : null) ?? this.player.position;
  }

  get nearPlace(): string | null {
    return this.layer === "ground"
      ? (this.driver?.nearPlace ?? null)
      : this.modelDriver.nearPlace(this.player.group, this.layer);
  }

  get screenPosition(): { readonly x: number; readonly y: number; readonly visible: boolean } {
    return this.player.screenPosition(this.rig);
  }

  setSpatial(data: SpatialWorld): void {
    this.layer = "ground";
    this.rig.interior = false;
    this.spatial = data;
    this.driver = new SpatialDriver(data, this.mode);
    this.rig.setSpatial(data);
    this.replaceMap(terrain(data, this.style));
    this.teleport("home");
  }

  setLayer(layer: Layer, _variant = 0): void {
    this.stop();
    this.layer = layer;
    this.replaceMap(
      layer === "ground"
        ? this.spatial
          ? terrain(this.spatial, this.style)
          : this.surface.ground
        : interior(layer),
    );
    this.rig.interior = layer !== "ground";
    this.rig.reset();
  }

  private replaceMap(map: Group): void {
    this.surface.replaceMap(map);
    this.occlusion.scan(map);
    this.presentation.reapplyScene();
  }

  setStyle(style: WorldStyle): void {
    const rebuild = style.building !== this.style.building || style.map !== this.style.map;
    this.style = style;
    this.rig.setView(style.view);
    this.player.setStyle(style.character);
    this.peers.setStyle(style.character);
    this.scene.background = new Color(worldMapTheme(style.map).background);
    if (rebuild && this.spatial && this.layer === "ground")
      this.replaceMap(terrain(this.spatial, style));
    this.presentation.reapplyScene();
  }

  setPlayer(mode: Mode, party: Party): void {
    this.mode = mode;
    this.driver?.setMode(mode);
    this.modelDriver.setMode(mode);
    this.player.set(mode, party);
    this.presentation.reapplyScene();
  }

  teleport(id: string): void {
    this.stop();
    this.current = id;
    if (this.layer === "ground" && this.driver) {
      this.driver.teleport(id);
      this.player.teleport(this.driver.position);
    } else {
      this.player.teleportModel(id);
    }
    this.rig.snapTo(this.position);
    this.emitPosition();
  }

  teleportGround(point: XY): boolean {
    if (this.layer !== "ground" || !this.driver?.teleportGround(point)) return false;
    this.stop();
    this.player.teleport(this.driver.position);
    this.rig.snapTo(this.position);
    this.emitPosition();
    return true;
  }

  setPlaces(places: readonly Place[], selected: string): void {
    const state = this.spatial
      ? { layer: this.layer, selected, spatial: this.spatial }
      : { layer: this.layer, selected };
    this.labels.set(places, state);
  }

  planTo(placeId: string): Route | null {
    return this.layer === "ground"
      ? (this.driver?.planTo(placeId) ?? null)
      : this.modelDriver.plan(this.player.group, this.layer, placeId);
  }

  setRoute(route: Route | null): void {
    this.surface.setRoute(route);
  }

  move(route: Route): void {
    this.paused = false;
    if (this.layer === "ground" && this.driver?.move(route)) return;
    this.modelDriver.move(route, this.player.group);
    if (!this.modelDriver.moving) this.events.onArrive(this.current);
  }

  pause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  stop(): void {
    this.driver?.cancel();
    this.modelDriver.cancel();
    this.paused = false;
    this.setRoute(null);
  }

  setPeers(peers: readonly PeerState[]): void {
    if (this.peers.set(peers, this.layer)) this.presentation.reapplyScene();
  }

  private moveToGround(point: GroundPoint): void {
    if (this.events.onGround(point) || this.layer !== "ground") return;
    const route = this.driver?.planPoint([point[0], point[2]]) ?? null;
    if (!route) return;
    this.setRoute(route);
    this.move(route);
  }

  private setManualInput(input: XY): void {
    this.manualInput = input;
    const active = Math.hypot(input[0], input[1]) > 0.05;
    if (active && !this.manualActive) {
      this.paused = false;
      this.driver?.cancel();
      this.modelDriver.cancel();
      this.setRoute(null);
    }
    if (active !== this.manualActive) this.events.onManual?.(active);
    this.manualActive = active;
  }

  private step(delta: number): void {
    const arrived = stepPlayer(
      {
        layer: this.layer,
        driver: this.driver,
        model: this.modelDriver,
        player: this.player,
        manual: this.manualActive,
        input: this.manualActive ? this.rig.toWorldInput(this.manualInput) : [0, 0],
        paused: this.paused,
      },
      delta,
    );
    if (!arrived) return;
    this.current = arrived;
    this.events.onArrive(arrived);
  }

  private emitPosition(): void {
    const position = this.position;
    this.events.onPosition(position.x, position.z, position.y, position.heading);
  }

  dispose(): void {
    this.releaseInput();
    this.observer.disconnect();
    this.renderer.setAnimationLoop(null);
    this.presentation.dispose();
    this.player.dispose();
    this.surface.dispose();
    this.peers.dispose();
    this.renderer.dispose();
  }
}
