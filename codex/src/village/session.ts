import { Vector3 } from "three";
import { markExplored } from "../community/journal";
import { complexSchema } from "../community/schema";
import { PALETTES } from "../island/palettes";
import { buildingCenter } from "../island/site";
import { IslandView } from "../island/view";
import { BuildingOcclusion } from "../scene/building-occlusion";
import type { SpatialWorld, XY } from "../spatial/types";
import type { Pose, Preferences } from "./options";
import { bindPicking } from "./picking";
import { VillageRoute } from "./route";
import { element } from "./shell";
import { siteFor } from "./sites";
import { VillageWalker } from "./walker";

export class VillageSession {
  readonly view: IslandView;
  readonly actor: VillageWalker;
  private readonly events = new AbortController();
  private readonly route: VillageRoute;
  private readonly occlusion = new BuildingOcclusion();
  private routeVersion = -1;
  private state = "";
  private following = false;
  private readonly marker = element("#v-friend", HTMLButtonElement);
  private readonly status = element("#v-status", HTMLElement);
  constructor(
    readonly world: SpatialWorld,
    preferences: Preferences,
  ) {
    const site = siteFor(world);
    this.actor = new VillageWalker(world, site, preferences);
    try {
      this.view = new IslandView(element("#v-canvas", HTMLElement), world, {
        labelHost: element("#v-labels", HTMLElement),
        site,
        walker: this.actor,
      });
    } catch (error) {
      this.actor.dispose();
      throw error;
    }
    this.route = new VillageRoute(this.actor.navigation);
    this.view.scene.add(this.route.group);
    this.view.beforeRender = () => this.frame();
    this.setPalette(preferences);
    const buildings = element("#v-building", HTMLSelectElement);
    buildings.replaceChildren(new Option("동 번호로 찾기", ""));
    for (const building of world.buildings.filter((b) => b.kind === "core"))
      buildings.add(new Option(building.name, building.id));
    this.view.renderer.domElement.tabIndex = 0;
    this.view.controls.maxZoom = 28;
    bindPicking(
      this.view,
      (pick) => {
        switch (pick.kind) {
          case "building":
            this.selectBuilding(pick.id);
            break;
          case "ground":
            this.walkTo(pick.point);
            break;
        }
      },
      this.events.signal,
    );
    this.view.renderer.domElement.addEventListener(
      "keydown",
      (e) => {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)
        ) {
          this.actor.manual();
          this.view.play();
        }
      },
      { signal: this.events.signal },
    );
    this.view.controls.addEventListener("change", () => {
      element("#v-north", HTMLElement).style.transform =
        `rotate(${this.view.controls.getAzimuthalAngle()}rad)`;
    });
    this.view.render();
  }
  setPalette(preferences: Preferences): void {
    this.view.setPalette(PALETTES[preferences.theme]);
    for (const child of this.view.scenery.children)
      if (child.userData.buildingId) child.userData.fadeWithCamera = true;
    this.occlusion.scan(this.view.scenery);
  }
  setBuddy(preferences: Preferences): void {
    this.actor.setBuddy(preferences);
    this.refresh();
  }
  setPose(pose: Pose): void {
    this.actor.setPose(pose);
    this.refresh();
  }
  refresh(): void {
    this.actor.update(0, [0, 0], matchMedia("(prefers-reduced-motion: reduce)").matches);
    this.view.render();
    this.view.play();
  }
  pause(): void {
    this.actor.pause();
    this.view.input(0, 0);
    this.refresh();
  }
  toggleWalk(): void {
    if (this.actor.active) this.pause();
    else {
      this.actor.start();
      this.refresh();
    }
  }
  follow(): void {
    this.view.following = true;
    const p = this.actor.position;
    this.view.rig.focus(new Vector3(p.x, p.y, p.z), 20);
    this.view.render();
    this.marker.textContent = "친구";
    this.status.textContent = "친구를 따라가요. 바닥을 눌러 목적지를 정하거나 직접 걸어보세요.";
  }
  overview(top = false): void {
    this.view.following = false;
    if (top) this.view.rig.top();
    else this.view.rig.overview();
    this.status.textContent = "건물 번호를 눌러 살펴보고, 빈 공간을 누르면 친구가 걸어가요.";
  }
  selectBuilding(id: string): void {
    if (!id) {
      element("#v-approach", HTMLButtonElement).hidden = true;
      for (const button of this.view.labels.values()) button.setAttribute("aria-pressed", "false");
      this.overview();
      return;
    }
    if (!this.world.buildings.some((b) => b.id === id && b.kind === "core")) return;
    this.pause();
    this.view.following = false;
    this.view.focus(id);
    element("#v-building", HTMLSelectElement).value = id;
    element("#v-approach", HTMLButtonElement).hidden = false;
    for (const [key, button] of this.view.labels)
      button.setAttribute("aria-pressed", String(key === id));
    const name = this.world.buildings.find((b) => b.id === id)?.name;
    markExplored(complexSchema.parse(this.world.id), "building");
    this.status.textContent = `${name} 위치를 보고 있어요. 주변 빈 공간으로 걸어갈 수도 있어요.`;
  }
  approach(): void {
    const id = element("#v-building", HTMLSelectElement).value,
      building = this.world.buildings.find((b) => b.id === id);
    if (!building) return;
    const center = buildingCenter(building),
      candidates = [center, ...building.ring];
    for (const point of candidates) {
      const p = this.actor.navigation.nearestPassable(point, "walk", 30);
      if (p && this.actor.goTo(p)) {
        this.follow();
        this.refresh();
        return;
      }
    }
    this.status.textContent =
      "이 동 근처로 이어지는 모형 경로를 찾지 못했어요. 다른 빈 공간을 골라 주세요.";
  }
  walkTo(point: XY): void {
    if (!this.actor.goTo(point)) {
      this.status.textContent = "여기는 갈 수 없어요. 단지 안의 다른 빈 공간을 골라 주세요.";
      return;
    }
    this.refresh();
  }
  input(direction: XY): void {
    if (Math.hypot(...direction) > 0) this.actor.manual();
    this.view.input(...direction);
    this.view.play();
  }
  private frame(): void {
    this.view.labelsVisible = this.view.host.clientWidth >= 700 || this.view.camera.zoom >= 2;
    const p = this.actor.position,
      center = new Vector3(p.x, p.y + 2, p.z);
    this.occlusion.update(
      this.view.camera.position,
      this.view.following ? center : this.view.camera.position,
      1,
    );
    if (this.routeVersion !== this.actor.routeVersion) {
      this.routeVersion = this.actor.routeVersion;
      this.route.show(this.actor.route.length ? [[p.x, p.z], ...this.actor.route] : []);
    }
    if (this.view.following) {
      const screen = center
          .clone()
          .add(new Vector3(0, 5, 0))
          .project(this.view.camera),
        size = this.view.viewport;
      this.marker.hidden = Math.abs(screen.x) > 0.9 || Math.abs(screen.y) > 0.9 || screen.z > 1;
      this.marker.style.left = `${((screen.x + 1) / 2) * size.x}px`;
      this.marker.style.top = `${((1 - screen.y) / 2) * size.y}px`;
    } else if (!this.marker.hidden) this.marker.hidden = true;
    const state = `${this.actor.state}:${this.actor.pose}`;
    if (state !== this.state) {
      this.state = state;
      if (this.actor.state === "arrived")
        markExplored(complexSchema.parse(this.world.id), "arrival");
      const messages = {
        idle: "바닥을 누르면 그곳으로 걸어가요.",
        moving: "산책 중이에요. 언제든 멈추거나 다른 곳을 골라도 좋아요.",
        paused: "잠시 멈췄어요. 산책을 다시 누르면 이어서 걸어요.",
        arrived: "도착했어요! 다음으로 가고 싶은 곳을 골라 주세요.",
        blocked: "이어지는 경로를 찾지 못했어요. 가까운 빈 공간을 골라 주세요.",
      };
      this.status.textContent = messages[this.actor.state];
      document.querySelectorAll<HTMLButtonElement>("[data-pose]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.pose === this.actor.pose));
      });
      const walk = element('[data-action="walk"]', HTMLButtonElement);
      walk.setAttribute("aria-pressed", String(this.actor.active));
      walk.textContent = this.actor.active ? "잠시 멈추기" : "산책 시작";
      element(".v-stage", HTMLElement).dataset.state = this.actor.state;
    }
    if (this.following !== this.view.following) {
      this.following = this.view.following;
      element('.v-dock [data-action="follow"]', HTMLButtonElement).setAttribute(
        "aria-pressed",
        String(this.following),
      );
    }
  }
  dispose(): void {
    this.events.abort();
    this.route.dispose();
    this.view.dispose();
    this.marker.hidden = true;
  }
}
