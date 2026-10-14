import { z } from "zod";

export const KINDS = {
  positive: "좋았던 점",
  caution: "아쉬운 점",
  correction: "지도·성능 개선",
  photo: "사진 자료",
  request: "사진 요청",
} as const;
export const TOPICS = {
  walk: "보행·경사",
  transit: "교통·출퇴근",
  amenity: "생활·편의",
  noise: "소음·환경",
  map: "지도·건물",
  performance: "속도·조작",
} as const;
export const STATES = {
  pending: "검토 대기",
  published: "공개됨",
  resolved: "반영 완료",
  rejected: "비공개",
} as const;
export const complexSchema = z.enum(["xi", "haiver", "cherbo"]);
export const submissionSchema = z.object({
  complex: complexSchema,
  kind: z.enum(["positive", "caution", "correction", "photo", "request"]),
  topic: z.enum(["walk", "transit", "amenity", "noise", "map", "performance"]),
  nickname: z.string().trim().min(2).max(24),
  relationship: z.enum(["resident", "visitor"]),
  place: z.string().trim().min(2).max(80),
  observedOn: z.iso.date(),
  body: z.string().trim().min(10).max(2000),
  consent: z.literal("yes"),
});
export const postSchema = submissionSchema.omit({ consent: true }).extend({
  id: z.uuid(),
  status: z.enum(["pending", "published", "resolved", "rejected"]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  response: z.string().max(1000),
  photo: z.boolean(),
});
export const feedSchema = z.object({
  posts: z.array(postSchema).max(20),
  next: z.number().int().positive().nullable(),
});
export const receiptSchema = z.object({ id: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) });
export type Submission = z.infer<typeof submissionSchema>;
export type CommunityPost = z.infer<typeof postSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
