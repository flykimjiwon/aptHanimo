import { Box3, Group, Line, type Material, Mesh, Ray, Vector3 } from "three";

type OccluderMaterial = {
  readonly material: Material;
  readonly opacity: number;
  readonly transparent: boolean;
  readonly depthWrite: boolean;
};

type Occluder = {
  readonly box: Box3;
  readonly materials: readonly OccluderMaterial[];
};

export class BuildingOcclusion {
  private entries: readonly Occluder[] = [];
  private readonly ray = new Ray();
  private readonly hit = new Vector3();

  scan(root: Group): void {
    const entries: Occluder[] = [];
    root.traverse((object) => {
      if (!(object instanceof Group) || object.userData["fadeWithCamera"] !== true) return;
      const box = new Box3().setFromObject(object);
      const materials = new Set<Material>();
      object.traverse((child) => {
        if (!(child instanceof Mesh) && !(child instanceof Line)) return;
        if (Array.isArray(child.material)) {
          for (const material of child.material) materials.add(material);
        } else materials.add(child.material);
      });
      entries.push({
        box,
        materials: [...materials].map((material) => ({
          material,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        })),
      });
    });
    this.entries = entries;
  }

  update(camera: Vector3, player: Vector3, delta: number): void {
    const amount = Math.min(1, delta * 8);
    const direction = new Vector3().subVectors(player, camera);
    const playerDistance = direction.length();
    this.ray.set(camera, direction.normalize());
    for (const entry of this.entries) {
      const intersection = this.ray.intersectBox(entry.box, this.hit);
      const blocksPlayer =
        intersection !== null && camera.distanceTo(intersection) < playerDistance - 1;
      const fade = blocksPlayer ? 0.06 : 1;
      for (const state of entry.materials) {
        const target = state.opacity * fade;
        state.material.opacity += (target - state.material.opacity) * amount;
        const restored = state.material.opacity >= state.opacity * 0.99;
        const transparent = state.transparent || !restored;
        if (state.material.transparent !== transparent) {
          state.material.transparent = transparent;
          state.material.needsUpdate = true;
        }
        state.material.depthWrite = state.depthWrite && restored;
      }
    }
  }
}
