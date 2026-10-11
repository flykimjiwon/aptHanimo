import { expect, test } from "bun:test";
import { parseSpatial } from "../spatial/load";
import { ModelDriver } from "./model-driver";
import type { PlayerAvatar } from "./player-avatar";
import { SpatialDriver } from "./spatial-driver";
import { stepPlayer } from "./world-step";

const world = parseSpatial(await Bun.file("public/worlds/xi.json").json());

function runGroundRoute(driver: SpatialDriver): readonly string[] {
  const player = { sync() {} } as unknown as PlayerAvatar;
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
