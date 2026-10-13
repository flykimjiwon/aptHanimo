import { expect, test } from "bun:test";
import { Box3, Mesh, Vector3 } from "three";
import { insideRing, ringClearance } from "../island/site";
import { parseSpatial } from "../spatial/load";
import type { XY } from "../spatial/types";
import { Buddy } from "./buddy";
import { type Preferences, readPreferences } from "./options";
import { siteFor } from "./sites";
import { VillageWalker } from "./walker";

const prefs: Preferences = { complex: "xi", theme: "garden", buddy: "round", species: "cat" };
const worlds = await Promise.all(
  ["xi", "haiver", "cherbo"].map(async (id) =>
    parseSpatial(await Bun.file(`public/worlds/${id}.json`).json()),
  ),
);
const world = worlds[0];
if (!world) throw new RangeError("Missing fixture");
function walker(): VillageWalker {
  const fixture = worlds[0];
  if (!fixture) throw new RangeError("Missing fixture");
  return new VillageWalker(fixture, siteFor(fixture), prefs);
}
function destination(actor: VillageWalker): XY {
  const p = actor.position,
    point = actor.navigation.nearestPassable([p.x - 10, p.z - 10], "walk", 20);
  if (!point) throw new RangeError("Missing destination");
  return point;
}

test("each source boundary encloses its original core footprints and supports bounded walking", () => {
  for (const world of worlds) {
    const original = JSON.stringify(world),
      site = siteFor(world),
      actor = new VillageWalker(world, site, prefs);
    for (const b of world.buildings.filter((b) => b.kind === "core"))
      expect(
        b.ring.every((p) => insideRing(p, site.ring) || ringClearance(p, site.ring) < 0.1),
      ).toBe(true);
    actor.start();
    let distance = 0;
    for (let i = 0; i < 900; i++) {
      distance += actor.update(1 / 60, [0, 0], true);
      expect(actor.navigation.passable([actor.position.x, actor.position.z], "walk")).toBe(true);
    }
    expect(distance).toBeGreaterThan(60);
    expect(JSON.stringify(world)).toBe(original);
    actor.dispose();
  }
});
test("a chosen destination finishes once and remains there instead of starting another stroll", () => {
  const actor = walker(),
    target = destination(actor);
  expect(actor.goTo(target)).toBe(true);
  for (let i = 0; i < 2000 && actor.state !== "arrived"; i++) actor.update(1 / 60, [0, 0], false);
  expect(actor.state).toBe("arrived");
  expect(Math.hypot(actor.position.x - target[0], actor.position.z - target[1])).toBeLessThan(0.03);
  const arrived = actor.position;
  for (let i = 0; i < 240; i++) actor.update(1 / 60, [0, 0], false);
  expect(actor.position).toEqual(arrived);
  expect(actor.active).toBe(false);
  expect(actor.route).toHaveLength(0);
  expect(actor.needsAnimation(false)).toBe(false);
  actor.dispose();
});
test("pausing and resuming retains the selected destination", () => {
  const actor = walker(),
    target = destination(actor);
  actor.goTo(target);
  actor.update(0.1, [0, 0], false);
  actor.pause();
  const paused = actor.position;
  actor.update(1, [0, 0], false);
  expect(actor.position).toEqual(paused);
  actor.start();
  for (let i = 0; i < 2000 && actor.state !== "arrived"; i++) actor.update(1 / 60, [0, 0], false);
  expect(actor.state).toBe("arrived");
  expect(Math.hypot(actor.position.x - target[0], actor.position.z - target[1])).toBeLessThan(0.03);
  actor.dispose();
});
test("invalid targets leave the previous safe route intact", () => {
  const actor = walker();
  actor.goTo(destination(actor));
  const route = actor.route;
  expect(actor.goTo([500, 500])).toBe(false);
  expect(actor.route).toEqual(route);
  expect(actor.active).toBe(true);
  actor.dispose();
});
test("a pose cancels movement and manual input returns to automatic expression", () => {
  const actor = walker();
  actor.goTo(destination(actor));
  actor.setPose("wave");
  const p = actor.position;
  actor.update(0.5, [0, 0], false);
  expect(actor.position).toEqual(p);
  expect(actor.route).toHaveLength(0);
  expect(actor.needsAnimation(true)).toBe(false);
  expect(actor.needsAnimation(false)).toBe(true);
  actor.manual();
  actor.update(0.1, [1, 0], false);
  expect(actor.pose).toBe("auto");
  expect(actor.position).not.toEqual(p);
  actor.dispose();
});
test("character replacement preserves position and releases only the old character resources", () => {
  const actor = walker(),
    other = walker(),
    p = actor.position;
  let oldDisposed = 0,
    otherDisposed = 0;
  actor.group.traverse((o) => {
    if (o instanceof Mesh)
      o.geometry.addEventListener("dispose", () => {
        oldDisposed++;
      });
  });
  other.group.traverse((o) => {
    if (o instanceof Mesh)
      o.geometry.addEventListener("dispose", () => {
        otherDisposed++;
      });
  });
  actor.setBuddy({ ...prefs, buddy: "facet", species: "bunny" });
  expect(actor.position).toEqual(p);
  expect(oldDisposed).toBeGreaterThan(10);
  expect(otherDisposed).toBe(0);
  actor.dispose();
  other.dispose();
});
test("reduced motion produces a stable pose while every character fits the clearance", () => {
  for (const style of ["round", "clay", "facet"] as const)
    for (const species of ["cat", "bunny", "bear", "dog"] as const) {
      const buddy = new Buddy(style, species);
      buddy.animate({ pose: "happy", time: 1, distance: 2, moving: false, reduced: true });
      const first = new Box3().setFromObject(buddy.group);
      buddy.animate({ pose: "happy", time: 7, distance: 8, moving: false, reduced: true });
      const second = new Box3().setFromObject(buddy.group);
      expect(second.equals(first)).toBe(true);
      const size = first.getSize(new Vector3());
      expect(size.x).toBeLessThan(3.6);
      expect(size.z).toBeLessThan(3.6);
      expect(size.y).toBeGreaterThan(3);
      buddy.dispose();
    }
});
test("invalid or legacy URL style values cannot enter unified preferences", () => {
  expect(
    readPreferences(
      new URL("https://local.test/?complex=haiver&theme=dusk&buddy=facet&species=dog"),
    ),
  ).toEqual({ complex: "haiver", theme: "dusk", buddy: "facet", species: "dog" });
  expect(
    readPreferences(new URL("https://local.test/?complex=other&theme=bad&buddy=bad&species=bad")),
  ).toEqual(prefs);
});
