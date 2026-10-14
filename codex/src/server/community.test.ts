import { afterEach, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { receiptSchema, submissionSchema } from "../community/schema";
import { CommunityApi } from "./community-api";
import { normalizePhoto, PhotoInputError } from "./community-photo";
import { CommunityStore } from "./community-store";

const input = submissionSchema.parse({
  complex: "xi",
  kind: "positive",
  topic: "walk",
  nickname: "산책친구",
  relationship: "visitor",
  place: "정문 앞",
  observedOn: "2026-10-01",
  body: "검증용 관찰 내용입니다. 실제 후기가 아닙니다.",
  consent: "yes",
});
const stores: CommunityStore[] = [];
const store = (path = ":memory:") => {
  const s = new CommunityStore(path);
  stores.push(s);
  return s;
};
afterEach(() => {
  for (const s of stores.splice(0)) s.close();
});
function request(fields: Record<string, string> = {}, origin = "http://localhost") {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...input, ...fields })) form.set(key, value);
  return new Request("http://localhost/api/community/posts", {
    method: "POST",
    body: form,
    headers: { Origin: origin },
  });
}
test("pending is private; moderation publishes only chosen complex and omits owner keys", () => {
  const s = store(),
    receipt = s.create(input, null);
  expect(s.feed("xi").posts).toEqual([]);
  expect(s.mine(receipt.id, "wrong")).toBeNull();
  expect(s.mine(receipt.id, receipt.token)?.status).toBe("pending");
  s.moderate(receipt.id, "published", "관찰 의견으로 공개");
  expect(s.feed("xi").posts[0]?.body).toBe(input.body);
  expect(s.feed("haiver").posts).toEqual([]);
  expect(JSON.stringify(s.feed("xi"))).not.toContain(receipt.token);
  expect(JSON.stringify(s.feed("xi"))).not.toContain('"owner"');
});
test("photos require published state; withdrawal atomically removes content and reports", () => {
  const s = store(),
    receipt = s.create(input, new Uint8Array([1, 2]));
  expect(s.photo(receipt.id)).toBeNull();
  s.moderate(receipt.id, "published", "검토 완료");
  expect(s.photo(receipt.id)).toEqual(new Uint8Array([1, 2]));
  expect(s.report(receipt.id, "test-client", "검토가 필요합니다")).toBe(true);
  expect(s.withdraw(receipt.id, "wrong")).toBe(false);
  expect(s.withdraw(receipt.id, receipt.token)).toBe(true);
  expect(s.photo(receipt.id)).toBeNull();
  expect(s.feed("xi").posts).toEqual([]);
  expect(s.db.query("SELECT * FROM reports").all()).toEqual([]);
});
test("cursor pagination has no duplicates and resolved notes remain visible", () => {
  const s = store();
  for (let i = 0; i < 24; i++) s.moderate(s.create(input, null).id, "resolved", `지도에 반영 ${i}`);
  const first = s.feed("xi");
  expect(first.posts).toHaveLength(20);
  expect(first.next).not.toBeNull();
  const second = s.feed("xi", first.next ?? 0);
  expect(second.posts).toHaveLength(4);
  expect(new Set([...first.posts, ...second.posts].map((p) => p.id)).size).toBe(24);
  expect(first.posts[0]?.response).toBe("지도에 반영 23");
});
test("restart retains submissions and receipt authorization", () => {
  const path = join(mkdtempSync(join(tmpdir(), "hanbakwi-community-")), "test.sqlite");
  const first = new CommunityStore(path),
    receipt = first.create(input, null);
  first.close();
  expect(store(path).mine(receipt.id, receipt.token)?.place).toBe(input.place);
});
test("rate limits persist and reset by hour without raw addresses", () => {
  const s = store();
  for (let i = 0; i < 30; i++) expect(s.allow("private-address", 1)).toBe(true);
  expect(s.allow("private-address", 1)).toBe(false);
  expect(JSON.stringify(s.db.query("SELECT * FROM limits").all())).not.toContain("private-address");
  expect(s.allow("private-address", 3_600_001)).toBe(true);
});
test("submission validates origin, consent, complex, date and minimum body", async () => {
  const api = new CommunityApi(store());
  expect((await api.handle(request({}, "http://evil.example"), "a")).status).toBe(403);
  for (const fields of [
    { consent: "no" },
    { complex: "invalid" },
    { observedOn: "2999-01-01" },
    { body: "short" },
  ])
    expect((await api.handle(request(fields), "a")).status).toBe(400);
  const response = await api.handle(request(), "a");
  expect(response.status).toBe(201);
  expect(receiptSchema.safeParse(await response.json()).success).toBe(true);
});
test("configured HTTPS origin works behind a reverse proxy", async () => {
  const api = new CommunityApi(store(), "https://town.example");
  expect((await api.handle(request({}, "https://town.example"), "a")).status).toBe(201);
  expect((await api.handle(request(), "a")).status).toBe(403);
});
test("photo mode requires a photo and invalid cursors fail", async () => {
  const api = new CommunityApi(store());
  expect((await api.handle(request({ kind: "photo" }), "a")).status).toBe(400);
  expect(
    (
      await api.handle(
        new Request("http://localhost/api/community/posts?complex=xi&before=-1"),
        "a",
      )
    ).status,
  ).toBe(400);
});
test("receipt endpoint protects pending content and withdrawal", async () => {
  const s = store(),
    api = new CommunityApi(s),
    receipt = s.create(input, null);
  const url = `http://localhost/api/community/receipts/${receipt.id}`;
  expect((await api.handle(new Request(url), "a")).status).toBe(404);
  const headers = { Authorization: `Bearer ${receipt.token}`, Origin: "http://localhost" };
  expect((await api.handle(new Request(url, { headers }), "a")).status).toBe(200);
  expect((await api.handle(new Request(url, { method: "DELETE", headers }), "a")).status).toBe(200);
  expect((await api.handle(new Request(url, { headers }), "a")).status).toBe(404);
});
test("normalization auto-orients, strips metadata, resizes and rejects SVG", async () => {
  const jpeg = await sharp({
    create: { width: 1800, height: 100, channels: 3, background: "green" },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: "private-test-metadata" } })
    .toBuffer();
  const photo = await normalizePhoto(new File([jpeg], "photo.jpg"));
  const metadata = await sharp(photo).metadata();
  expect(metadata.width).toBe(1600);
  expect(metadata.format).toBe("webp");
  expect(metadata.exif).toBeUndefined();
  await expect(
    normalizePhoto(
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'],
        "bad.svg",
      ),
    ),
  ).rejects.toBeInstanceOf(PhotoInputError);
  await expect(
    normalizePhoto(new File([new Uint8Array(6 * 1024 * 1024 + 1)], "huge.jpg")),
  ).rejects.toBeInstanceOf(PhotoInputError);
});
