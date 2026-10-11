import type { Layer } from "../data";
import { car } from "./buildings";
import { Builder, bench, C, tree } from "./materials";
export function interior(layer: Exclude<Layer, "ground">) {
  const b = new Builder();
  b.box([0, -0.8, 0], [38, 1.5, 26], C.base);
  b.box([0, 0, 0], [38, 0.15, 26], layer === "parking" ? C.road : C.path);
  b.box([0, 2, -12.8], [38, 4, 0.4], C.wall);
  b.box([-18.8, 2, 0], [0.4, 4, 26], C.wall2);
  b.box([18.8, 0.7, 0], [0.4, 1.4, 26], C.wall2);
  if (layer === "community") {
    for (const x of [-5, 5]) {
      b.box([x, 1.4, -7], [0.25, 2.8, 11], C.glass2);
      b.box([x, 2.85, -7], [0.4, 0.15, 11], C.roof);
    }
    b.box([0, 0.8, -9], [5, 1.6, 1.6], C.wall2);
    b.box([0, 1.65, -9], [5.3, 0.1, 1.9], C.white);
    for (const x of [-14, -10])
      for (const z of [-9, -4]) {
        b.box([x, 0.25, z], [1.8, 0.5, 3], C.ink);
        b.box([x, 0.52, z], [1.4, 0.1, 2.3], C.metal);
        for (const dx of [-0.75, 0.75]) b.box([x + dx, 1.25, z - 1], [0.1, 2, 0.1], C.metal);
        b.box([x, 2.1, z - 1], [1.6, 0.65, 0.25], C.ink);
      }
    for (const z of [-8, -1, 6]) bench(b, [11, 0, z]);
    for (const x of [8, 15]) {
      b.box([x, 0.65, 2], [2, 1.3, 2], C.coral);
      b.box([x, 1.3, 1.2], [2, 1.4, 0.5], C.coral);
    }
    b.cylinder([11.5, 0.9, 2], [1.2, 1.2, 0.15], C.white);
    for (const x of [-16, 16]) tree(b, [x, 0, 9], 0.7);
    b.box([0, 0.12, 5], [7, 0.1, 4], C.grass2);
  } else {
    for (const x of [-15, -6, 3, 12]) {
      b.box([x, 2, -11], [0.65, 4, 0.65], C.wall);
      b.box([x, 1, -10.6], [0.8, 0.8, 0.05], C.yellow);
    }
    for (let x = -6; x <= 16; x += 3.3) {
      b.box([x, 0.13, -5.5], [0.1, 0.03, 6], C.lane);
      b.box([x, 0.13, 8.7], [0.1, 0.03, 6], C.lane);
    }
    for (const x of [-4, 2, 9, 15]) car(b, [x, 0, -6], x > 5 ? C.wall : C.coral);
    for (const x of [-4, 6, 13]) car(b, [x, 0, 9], C.glass);
    b.box([-12, 1.8, -10], [4, 3.6, 0.3], C.metal);
    b.box([-12, 1.6, -9.8], [2.8, 3.2, 0.1], C.glass2);
    b.box([-12, 1.6, -9.72], [0.05, 3.2, 0.05], C.metal);
    b.box([-12, 0.12, -4], [5, 0.1, 8], C.grass2);
    for (let x = -7; x < 17; x += 4) b.box([x, 0.15, 3], [1.6, 0.03, 0.14], C.lane);
  }
  return b.finish();
}
