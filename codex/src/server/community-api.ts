import { z } from "zod";
import { complexSchema, submissionSchema } from "../community/schema";
import { normalizePhoto, PhotoInputError } from "./community-photo";
import { CommunityCapacityError, type CommunityStore } from "./community-store";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
const fail = (message: string, status: number) => json({ message }, status);
export class CommunityApi {
  private activeUploads = 0;
  constructor(
    private readonly store: CommunityStore,
    private readonly publicOrigin: string | null = null,
  ) {}
  async handle(request: Request, address: string): Promise<Response> {
    const url = new URL(request.url),
      path = url.pathname;
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      if (
        origin !== (this.publicOrigin ?? url.origin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        return fail("한바퀴 화면에서 다시 보내 주세요.", 403);
      if (!this.store.allow(address))
        return fail("요청이 많아요. 잠시 뒤 다시 시도해 주세요.", 429);
    }
    if (path === "/api/community/posts" && request.method === "GET") {
      const complex = complexSchema.safeParse(url.searchParams.get("complex"));
      const before = z.coerce
        .number()
        .int()
        .positive()
        .safeParse(url.searchParams.get("before") ?? Number.MAX_SAFE_INTEGER);
      if (!complex.success || !before.success) return fail("단지를 다시 골라 주세요.", 400);
      return json(this.store.feed(complex.data, before.data));
    }
    if (path === "/api/community/posts" && request.method === "POST") return this.submit(request);
    const match = /^\/api\/community\/(posts|photos|receipts)\/([a-f0-9-]+)(\/report)?$/.exec(path);
    const id = z.uuid().safeParse(match?.[2]);
    if (!match || !id.success) return fail("찾을 수 없어요.", 404);
    if (match[1] === "photos" && request.method === "GET") {
      const image = this.store.photo(id.data);
      return image
        ? new Response(new Uint8Array(image).buffer, {
            headers: { ...headers, "Content-Type": "image/webp" },
          })
        : fail("사진을 찾을 수 없어요.", 404);
    }
    if (match[1] === "receipts") {
      const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
      if (!/^[a-f0-9]{64}$/.test(token)) return fail("이 브라우저의 접수증이 필요해요.", 404);
      if (request.method === "GET") {
        const post = this.store.mine(id.data, token);
        return post ? json(post) : fail("접수증을 찾을 수 없어요.", 404);
      }
      if (request.method === "DELETE")
        return this.store.withdraw(id.data, token)
          ? json({ withdrawn: true })
          : fail("접수증을 찾을 수 없어요.", 404);
    }
    if (match[1] === "posts" && match[3] && request.method === "POST") {
      const reason = z
        .string()
        .trim()
        .min(5)
        .max(600)
        .safeParse(await request.text());
      if (!reason.success) return fail("신고 이유를 5~600자로 적어 주세요.", 400);
      return this.store.report(id.data, address, reason.data)
        ? json({ received: true })
        : fail("게시글을 찾을 수 없어요.", 404);
    }
    return fail("지원하지 않는 요청이에요.", 405);
  }
  private async submit(request: Request): Promise<Response> {
    if (this.activeUploads >= 2)
      return fail("사진을 처리 중이에요. 잠시 뒤 다시 보내 주세요.", 503);
    this.activeUploads++;
    try {
      const form = await request.formData();
      const result = submissionSchema.safeParse(Object.fromEntries(form));
      if (!result.success)
        return fail("필수 항목과 글자 수를 확인해 주세요. 내용은 10~2,000자예요.", 400);
      if (
        result.data.observedOn > new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
      )
        return fail("확인한 날짜는 오늘 이전으로 골라 주세요.", 400);
      const photo = form.get("photo");
      const image = photo instanceof File && photo.size ? await normalizePhoto(photo) : null;
      if (result.data.kind === "photo" && !image)
        return fail("사진 자료에는 사진을 첨부해 주세요.", 400);
      return json(this.store.create(result.data, image), 201);
    } catch (error) {
      if (error instanceof PhotoInputError) return fail(error.message, 400);
      if (error instanceof CommunityCapacityError) return fail(error.message, 503);
      if (error instanceof TypeError) return fail("전송 형식을 확인해 주세요.", 400);
      throw error;
    } finally {
      this.activeUploads--;
    }
  }
}
