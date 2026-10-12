import { expect, test } from "bun:test";
import { clearsRing, staysOnRoads } from "./segment-clearance";

test("rejects a road gap smaller than the old quarter-metre sweep interval", () => {
  const roads = [
    { start: [0, 0], end: [4, 0], width: 2.8 },
    { start: [4.5, 0], end: [8, 0], width: 2.8 },
  ] as const;
  expect(staysOnRoads([0, 0], [8, 0], roads, 1.2)).toBe(false);
  expect(staysOnRoads([0, 0], [8, 0], roads, 1)).toBe(true);
});

test("keeps a bend inside the union of connected road capsules", () => {
  const roads = [
    { start: [0, 0], end: [4, 0], width: 4 },
    { start: [4, 0], end: [4, 4], width: 4 },
  ] as const;
  expect(staysOnRoads([0, 0], [4, 0], roads, 1.2)).toBe(true);
  expect(staysOnRoads([0, 0], [4, 4], roads, 1.2)).toBe(false);
});

test("rejects crossing or grazing an inflated footprint", () => {
  const ring = [
    [2, 0],
    [3, 0],
    [3, 2],
    [2, 2],
  ] as const;
  expect(clearsRing([0, 1], [5, 1], ring, 1.2)).toBe(false);
  expect(clearsRing([0, -1], [5, -1], ring, 1.2)).toBe(false);
  expect(clearsRing([0, -1.3], [5, -1.3], ring, 1.2)).toBe(true);
});
