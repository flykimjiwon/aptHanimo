import { expect, test } from "bun:test";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Texture } from "three";
import type { XY } from "../spatial/types";
import { facadeEdges } from "./facade-geometry";
import { disposeGroup } from "./materials";

test("facade normals face outward for both polygon windings", () => {
  const square: readonly XY[] = [
    [-10, -10],
    [10, -10],
    [10, 10],
    [-10, 10],
  ];
  for (const ring of [square, [...square].reverse()]) {
    const edges = facadeEdges(ring);
    expect(edges).toHaveLength(4);
    for (const edge of edges) {
      expect(edge.center[0] * edge.normal[0] + edge.center[1] * edge.normal[1]).toBeCloseTo(10);
      expect(Math.hypot(...edge.normal)).toBeCloseTo(1);
    }
  }
});

test("replacing a scene disposes shared facade textures exactly once", () => {
  const group = new Group();
  const texture = new Texture();
  let disposals = 0;
  texture.addEventListener("dispose", () => {
    disposals += 1;
  });
  group.add(
    new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ map: texture })),
    new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ map: texture })),
  );
  disposeGroup(group);
  expect(disposals).toBe(1);
  expect(group.children).toHaveLength(0);
});
