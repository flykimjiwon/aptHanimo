import ky, { HTTPError } from "ky";
import { z } from "zod";
import { feedSchema, postSchema, type Receipt, receiptSchema } from "./schema";

const client = ky.create({ timeout: 15000, retry: 0 });
export async function feed(complex: string, before?: number) {
  const searchParams = { complex, ...(before ? { before: String(before) } : {}) };
  return feedSchema.parse(
    await client.get("/api/community/posts", { searchParams }).json<unknown>(),
  );
}
export async function submit(form: FormData) {
  return receiptSchema.parse(
    await client.post("/api/community/posts", { body: form, timeout: 30000 }).json<unknown>(),
  );
}
export async function mine(receipt: Receipt) {
  return postSchema.parse(
    await client
      .get(`/api/community/receipts/${receipt.id}`, {
        headers: { Authorization: `Bearer ${receipt.token}` },
      })
      .json<unknown>(),
  );
}
export async function withdraw(receipt: Receipt): Promise<void> {
  await client.delete(`/api/community/receipts/${receipt.id}`, {
    headers: { Authorization: `Bearer ${receipt.token}` },
  });
}
export async function report(id: string, reason: string): Promise<void> {
  await client.post(`/api/community/posts/${id}/report`, { body: reason });
}
export async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const parsed = z.object({ message: z.string().max(500) }).safeParse(error.data);
    if (parsed.success) return parsed.data.message;
  }
  if (!(error instanceof Error)) throw error;
  return "서버에 연결하지 못했어요. 작성 내용은 그대로예요. 연결을 확인하고 다시 시도해 주세요.";
}
