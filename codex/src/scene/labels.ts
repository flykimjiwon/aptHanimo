import { Vector3 } from "three";
import type { Layer, Place } from "../data";
import { node } from "../graph";
import { heightAt } from "../spatial/height";
import type { SpatialWorld } from "../spatial/types";
import type { CameraRig } from "./camera";
export class WorldLabels {
  private readonly entries: { element: HTMLButtonElement; position: Vector3 }[] = [];
  constructor(
    private readonly host: HTMLElement,
    private readonly select: (id: string) => void,
  ) {}
  set(
    places: readonly Place[],
    state: { readonly layer: Layer; readonly selected: string; readonly spatial?: SpatialWorld },
  ): void {
    this.host.replaceChildren();
    this.entries.length = 0;
    for (const place of places.filter((p) => p.layer === state.layer)) {
      let position: Vector3;
      if (state.layer === "ground") {
        const data = state.spatial;
        if (!data) continue;
        const xy =
          place.id === "home" ? data.spawn : data.pois.find((p) => p.id === place.id)?.position;
        if (!xy) continue;
        position = new Vector3(xy[0], heightAt(data, xy[0], xy[1]) + 4, xy[1]);
      } else {
        const p = node(place.node).position;
        position = new Vector3(p[0], p[1] + 4, p[2]);
      }
      const element = document.createElement("button");
      element.type = "button";
      element.className = `map-label ${place.id === state.selected ? "selected" : ""}`;
      element.textContent = place.short;
      element.setAttribute("aria-label", `${place.short} 경로 보기`);
      element.addEventListener("click", () => this.select(place.id));
      this.host.append(element);
      this.entries.push({ element, position });
    }
    if (state.layer === "ground" && state.spatial) {
      const xy = state.spatial.spawn;
      const element = document.createElement("button");
      element.type = "button";
      element.className = "map-label map-ad";
      element.dataset.action = "ad";
      element.textContent = "AD · 산책을 응원해요";
      element.setAttribute("aria-label", "AD · 산책을 응원해요 · 광고 데모 보기");
      this.host.append(element);
      this.entries.push({
        element,
        position: new Vector3(xy[0] + 12, heightAt(state.spatial, xy[0] + 12, xy[1]) + 5, xy[1]),
      });
    }
  }
  update(rig: CameraRig, player: Vector3): void {
    for (const { element, position } of this.entries) {
      const p = rig.project(position);
      element.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      const nearby = Math.hypot(position.x - player.x, position.z - player.z) < 12;
      element.hidden = nearby || !p.visible;
    }
  }
}
