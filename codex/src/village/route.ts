import {
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  SphereGeometry,
} from "three";
import { disposeIsland } from "../island/dispose";
import type { IslandNavigation } from "../island/site";
import type { XY } from "../spatial/types";

export class VillageRoute {
  readonly group = new Group();
  constructor(private readonly navigation: IslandNavigation) {
    this.group.name = "village-route";
  }
  show(points: readonly XY[]): void {
    disposeIsland(this.group);
    const last = points.at(-1);
    if (!last || points.length < 2) return;
    const dots: XY[] = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if (!a || !b) continue;
      const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3);
      for (let j = 0; j < count && dots.length < 256; j++)
        dots.push([a[0] + ((b[0] - a[0]) * j) / count, a[1] + ((b[1] - a[1]) * j) / count]);
    }
    const material = new MeshBasicMaterial({
      color: "#d87857",
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new InstancedMesh(new SphereGeometry(0.55, 6, 4), material, dots.length);
    const transform = new Object3D();
    dots.forEach((p, i) => {
      transform.position.set(p[0], this.navigation.heightAt(p) + 0.65, p[1]);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    const goal = new Mesh(new RingGeometry(1.7, 2.3, 32), material);
    goal.rotation.x = -Math.PI / 2;
    goal.position.set(last[0], this.navigation.heightAt(last) + 0.7, last[1]);
    mesh.renderOrder = 10;
    goal.renderOrder = 11;
    this.group.add(mesh, goal);
  }
  dispose(): void {
    disposeIsland(this.group);
  }
}
