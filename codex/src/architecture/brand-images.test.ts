import { expect, test } from "bun:test";
import { BrandImageCache } from "./brand-images";
import type { BrandId, BrandMark } from "./brands";

function stubImage(mark: BrandMark): HTMLImageElement {
  return {
    naturalHeight: mark.imageHeight,
    naturalWidth: mark.imageWidth,
  } as HTMLImageElement;
}

test("failed brand images retry while successful images remain cached", async () => {
  const attempts = new Map<BrandId, number>();
  const cache = new BrandImageCache(async (mark) => {
    const attempt = (attempts.get(mark.id) ?? 0) + 1;
    attempts.set(mark.id, attempt);
    if (mark.id === "xi" && attempt === 1) throw new TypeError("first Xi request failed");
    return stubImage(mark);
  });

  expect(await cache.load()).toEqual(["xi"]);
  expect(cache.image("xi")).toBeUndefined();
  expect(cache.image("raemian")).toBeDefined();

  expect(await cache.load()).toEqual([]);
  expect(cache.image("xi")).toBeDefined();
  expect(attempts.get("xi")).toBe(2);
  expect(attempts.get("raemian")).toBe(1);
  expect(attempts.get("summit")).toBe(1);
  expect(attempts.get("ipark")).toBe(1);

  expect(await cache.load()).toEqual([]);
  expect(attempts.get("xi")).toBe(2);
  expect(attempts.get("raemian")).toBe(1);
});
