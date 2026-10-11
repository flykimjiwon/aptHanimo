import { Group, type Scene } from "three";
import type { Route } from "../routes";
import { disposeGroup } from "./materials";
import { routeVisual } from "./route-visual";

export class WorldSurface {
  private map = new Group();
  private routeGroup = new Group();

  constructor(private readonly scene: Scene) {
    scene.add(this.map, this.routeGroup);
  }

  get ground(): Group {
    return this.map;
  }

  replaceMap(map: Group): void {
    this.scene.remove(this.map);
    disposeGroup(this.map);
    this.map = map;
    this.scene.add(map);
  }

  setRoute(route: Route | null): void {
    this.scene.remove(this.routeGroup);
    disposeGroup(this.routeGroup);
    this.routeGroup = routeVisual(route);
    this.scene.add(this.routeGroup);
  }

  dispose(): void {
    disposeGroup(this.map);
    disposeGroup(this.routeGroup);
  }
}
