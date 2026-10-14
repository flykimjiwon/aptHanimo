import { expect, test } from "bun:test";
import { postSchema } from "./schema";
import { esc, postCard } from "./view";

test("resident text, photo descriptions and moderator notes remain escaped text", () => {
  const attack = '<img src=x onerror="alert(1)">';
  const post = postSchema.parse({
    id: crypto.randomUUID(),
    complex: "xi",
    kind: "caution",
    topic: "walk",
    nickname: attack.slice(0, 24),
    relationship: "resident",
    place: attack,
    observedOn: "2026-10-01",
    body: attack,
    photo: true,
    status: "published",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    response: attack,
  });
  const html = postCard(post);
  expect(html).not.toContain(attack);
  expect(html).toContain(esc(attack));
  expect(html.match(/<img /g)).toHaveLength(1);
  expect(html).toContain(`/api/community/photos/${post.id}`);
});
test("resolved improvement is distinct from a verified resident identity", () => {
  const html = postCard(
    postSchema.parse({
      id: crypto.randomUUID(),
      complex: "cherbo",
      kind: "correction",
      topic: "map",
      nickname: "방문친구",
      relationship: "visitor",
      place: "정문 주변",
      observedOn: "2026-10-01",
      body: "지도에 확인을 요청한 내용입니다.",
      photo: false,
      status: "resolved",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
      response: "보행로 자료를 확인해 다음 버전에 반영했습니다.",
    }),
  );
  expect(html).toContain("반영 완료");
  expect(html).toContain("방문자(본인 표기)");
  expect(html).not.toContain("/api/community/photos/");
});
