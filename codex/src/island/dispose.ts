import { type Group, InstancedMesh } from "three";
import { disposeGroup } from "../scene/materials";

export function disposeIsland(group: Group): void {
  group.traverse((object) => {
    if (object instanceof InstancedMesh) object.dispose();
  });
  disposeGroup(group);
}
