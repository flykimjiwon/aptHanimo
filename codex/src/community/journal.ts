import { z } from "zod";
import type { ComplexId } from "../complexes";
import { type Receipt, receiptSchema } from "./schema";

export const CHECKS = [
  "출입구와 경사 직접 확인",
  "출퇴근 시간 교통 확인",
  "창문을 열고 소음 확인",
  "생활 편의시설 확인",
  "낮·밤 주변 환경 비교",
] as const;
export const STAMPS = {
  building: "동 살펴보기",
  arrival: "목적지 도착",
  buddy: "친구 꾸미기",
} as const;
const journalSchema = z.object({
  checks: z.array(z.enum(CHECKS)).max(5),
  note: z.string().max(2000),
  stamps: z.array(z.enum(["building", "arrival", "buddy"])).max(3),
});
const empty = () => journalSchema.parse({ checks: [], note: "", stamps: [] });
const key = (complex: ComplexId) => `hanbakwi-village-field-v1:${complex}`;
export function readJournal(complex: ComplexId) {
  try {
    const raw = localStorage.getItem(key(complex));
    return { value: raw ? journalSchema.parse(JSON.parse(raw)) : empty(), error: "" };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return {
      value: empty(),
      error: "이 브라우저의 기록을 읽을 수 없어요. 기존 기록을 덮어쓰지 않았어요.",
    };
  }
}
export function saveJournal(complex: ComplexId, value: z.infer<typeof journalSchema>): boolean {
  try {
    localStorage.setItem(key(complex), JSON.stringify(journalSchema.parse(value)));
    return true;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return false;
  }
}
export function markExplored(complex: ComplexId, stamp: keyof typeof STAMPS): void {
  const { value, error } = readJournal(complex);
  if (error || value.stamps.includes(stamp)) return;
  if (saveJournal(complex, { ...value, stamps: [...value.stamps, stamp] }))
    window.dispatchEvent(new Event("village:journal"));
}
const receiptsKey = "hanbakwi-village-receipts-v1";
export function readReceipts(): readonly Receipt[] {
  try {
    return z
      .array(receiptSchema)
      .max(5000)
      .parse(JSON.parse(localStorage.getItem(receiptsKey) ?? "[]"));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return [];
  }
}
export function saveReceipt(receipt: Receipt): boolean {
  try {
    const previous = z
      .array(receiptSchema)
      .max(5000)
      .parse(JSON.parse(localStorage.getItem(receiptsKey) ?? "[]"));
    const next = [...previous.filter((r) => r.id !== receipt.id), receipt];
    if (next.length > 5000) return false;
    localStorage.setItem(receiptsKey, JSON.stringify(next));
    return true;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return false;
  }
}
