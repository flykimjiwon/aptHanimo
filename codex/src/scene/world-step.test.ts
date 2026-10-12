import { expect, test } from "bun:test";
import { Group } from "three";
import { parseSpatial } from "../spatial/load";
import { ModelDriver } from "./model-driver";
import type { PlayerAvatar } from "./player-avatar";
import { SpatialDriver } from "./spatial-driver";
import { stepPlayer } from "./world-step";

const world = parseSpatial(await Bun.file("public/worlds/xi.json").json());

function runGroundRoute(driver: SpatialDriver, onComplete = () => {}): readonly string[] {
  const player: Pick<PlayerAvatar, "sync" | "group"> = { sync() {}, group: new Group() };
  const arrivals: string[] = [];
  for (let frame = 0; frame < 30_000 && driver.moving; frame += 1) {
    const arrived = stepPlayer(
      {
        layer: "ground",
        driver,
        model: new ModelDriver("walk"),
        player,
        manual: false,
        input: [0, 0],
        paused: false,
        onComplete,
      },
      1 / 60,
    );
    if (arrived) arrivals.push(arrived);
  }
  return arrivals;
}

test("point-route completion does not emit the stale named place", () => {
  const station = world.pois.find((poi) => poi.id === "station");
  if (!station) throw new RangeError("XI station point missing");
  const driver = new SpatialDriver(world, "walk");
  const route = driver.planPoint(station.position);
  if (!route) throw new RangeError("XI station point route missing");
  expect(driver.move(route)).toBe(true);

  expect(runGroundRoute(driver)).toEqual([]);
  expect(driver.moving).toBe(false);
});

test("named-route completion still emits its actual destination", () => {
  const driver = new SpatialDriver(world, "walk");
  const route = driver.planTo("station");
  if (!route) throw new RangeError("XI named station route missing");
  expect(driver.move(route)).toBe(true);

  expect(runGroundRoute(driver)).toEqual(["station"]);
});

test("an approach route notifies the UI when it ends without a named arrival", async () => {
  const haiver = parseSpatial(await Bun.file("public/worlds/haiver.json").json());
  const driver = new SpatialDriver(haiver, "walk");
  const route = driver.planTo("high");
  if (!route) throw new RangeError("Haiver high school approach missing");
  expect(route.endpointDistance).toBeGreaterThan(6);
  driver.move(route);
  let completions = 0;
  expect(
    runGroundRoute(driver, () => {
      completions += 1;
    }),
  ).toEqual([]);
  expect(driver.moving).toBe(false);
  expect(completions).toBe(1);
});
