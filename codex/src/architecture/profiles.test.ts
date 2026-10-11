import { expect, test } from "bun:test";
import { parseSpatial } from "../spatial/load";
import { BRAND_MARKS } from "./brands";
import { buildingProfile, COMPLEX_PROFILES } from "./profiles";

test("actual core buildings inherit only their own complex brand", async () => {
  for (const profile of Object.values(COMPLEX_PROFILES)) {
    const data: unknown = await Bun.file(
      new URL(`../../public/worlds/${profile.id}.json`, import.meta.url),
    ).json();
    const world = parseSpatial(data);
    for (const building of world.buildings) {
      if (building.kind === "core") expect(buildingProfile(building)?.brand).toBe(profile.brand);
      else expect(buildingProfile(building)).toBeNull();
    }
  }
});

test("official marks exist locally and source crops stay inside original artwork", async () => {
  for (const mark of Object.values(BRAND_MARKS)) {
    expect(await Bun.file(new URL(`../../public${mark.src}`, import.meta.url)).exists()).toBe(true);
    expect(mark.crop.x).toBeGreaterThanOrEqual(0);
    expect(mark.crop.y).toBeGreaterThanOrEqual(0);
    expect(mark.crop.width).toBeGreaterThan(0);
    expect(mark.crop.height).toBeGreaterThan(0);
    expect(mark.crop.x + mark.crop.width).toBeLessThanOrEqual(mark.imageWidth);
    expect(mark.crop.y + mark.crop.height).toBeLessThanOrEqual(mark.imageHeight);
  }
});
