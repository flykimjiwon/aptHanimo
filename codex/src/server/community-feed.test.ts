import { afterEach, expect, test } from "bun:test";
import { feedSchema, type Submission, submissionSchema } from "../community/schema";
import { CommunityApi } from "./community-api";
import { CommunityStore } from "./community-store";

const stores: CommunityStore[] = [];
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});
function fixture() {
  const store = new CommunityStore(":memory:");
  stores.push(store);
  const add = (fields: Partial<Submission> = {}, status = "published") => {
    const input = submissionSchema.parse({
      complex: "xi",
      kind: "request",
      topic: "map",
      nickname: "검수친구",
      relationship: "visitor",
      place: "검수용 장소",
      observedOn: "2026-10-01",
      body: "자동 테스트용 자료이며 실제 주민 의견이 아닙니다.",
      consent: "yes",
      ...fields,
    });
    const receipt = store.create(input, null);
    if (status === "published" || status === "resolved" || status === "rejected")
      store.moderate(receipt.id, status, "테스트용 처리 설명");
    return receipt;
  };
  const api = new CommunityApi(store);
  const read = (query = "") =>
    api.handle(new Request(`http://localhost/api/community/posts?complex=xi${query}`), "reader");
  return { add, read, store };
}

test("filters find older matching posts before pagination when newer posts have another kind", async () => {
  // Given older requests interspersed with other subjects and newer observations.
  const { add, read } = fixture();
  const expected: string[] = [];
  for (let index = 0; index < 25; index++) {
    expected.unshift(add().id);
    add({ topic: "walk" });
  }
  for (let index = 0; index < 24; index++) add({ kind: "positive" });
  // When a visitor pages through matching requests.
  const first = feedSchema.parse(
    await (await read("&kind=request&topic=map&status=published")).json(),
  );
  const second = feedSchema.parse(
    await (await read(`&kind=request&topic=map&status=published&before=${first.next}`)).json(),
  );
  // Then every matching item appears once, including the oldest, with a full-scope total.
  expect([...first.posts, ...second.posts].map((post) => post.id)).toEqual(expected);
  expect(first.posts).toHaveLength(20);
  expect(second.posts).toHaveLength(5);
  expect([first.total, second.total]).toEqual([25, 25]);
  expect(second.next).toBeNull();
});

test("progress counts exclude private posts and other complexes when requesting a filtered feed", async () => {
  // Given visible, private, and other-complex submissions.
  const { add, read } = fixture();
  const visible = add({ kind: "correction", topic: "performance" });
  add();
  add();
  add({}, "resolved");
  add({ kind: "photo" }, "resolved");
  const privateReceipt = add({}, "pending");
  add({}, "rejected");
  add({ complex: "cherbo" });
  add({ complex: "cherbo", kind: "correction" }, "resolved");
  // When applying all three filters together.
  const response = await read("&kind=correction&topic=performance&status=published");
  const json = await response.json();
  const result = feedSchema.parse(json);
  // Then counts describe the whole selected complex's public progress, not this page or filter.
  expect(result.posts.map((post) => post.id)).toEqual([visible.id]);
  expect(result.total).toBe(1);
  expect(result.progress).toEqual({ requests: 2, corrections: 1, resolved: 2 });
  expect(JSON.stringify(json)).not.toContain(privateReceipt.id);
  expect(JSON.stringify(json)).not.toContain(privateReceipt.token);
  expect(JSON.stringify(json)).not.toContain('"owner"');
});

test("counts reflect moderation and withdrawal when the next read occurs", async () => {
  // Given one resolved request, one rejected request and one withdrawn correction.
  const { add, read, store } = fixture();
  const resolved = add();
  store.moderate(resolved.id, "resolved", "요청한 사진과 위치를 확인해 반영했습니다.");
  store.moderate(add().id, "rejected", "개인정보가 보여 비공개로 전환했습니다.");
  const removed = add({ kind: "correction" });
  store.withdraw(removed.id, removed.token);
  // When reading the completed view.
  const result = feedSchema.parse(await (await read("&status=resolved")).json());
  // Then live totals and result content agree with moderation.
  expect(result.posts.map((post) => post.id)).toEqual([resolved.id]);
  expect(result.total).toBe(1);
  expect(result.progress).toEqual({ requests: 0, corrections: 0, resolved: 1 });
});

test("valid filters can yield an empty result without losing public progress counts", async () => {
  // Given a public map request.
  const { add, read } = fixture();
  add();
  // When selecting a different topic.
  const result = feedSchema.parse(await (await read("&topic=noise")).json());
  // Then no match is distinguishable from a server failure.
  expect(result).toEqual({
    posts: [],
    next: null,
    total: 0,
    progress: { requests: 1, corrections: 0, resolved: 0 },
  });
});

test.each([
  "&kind=unknown",
  "&topic=%27%20OR%201=1--",
  "&status=pending",
  "&status=rejected",
  "&kind=",
  "&before=0",
])("invalid or private filter is rejected: %s", async (query) => {
  // Given a valid server with a private submission.
  const { add, read } = fixture();
  add({}, "pending");
  // When a caller submits an unsupported query.
  const response = await read(query);
  // Then it cannot turn a public feed into a private-content query.
  expect(response.status).toBe(400);
});
