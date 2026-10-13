import { z } from "zod";

export const BUDDIES = { round: "동글 친구", clay: "점토 친구", facet: "종이접기 친구" } as const;
export const SPECIES = { cat: "고양이", bunny: "토끼", bear: "곰", dog: "강아지" } as const;
export const POSES = {
  auto: "자연스럽게",
  wave: "인사",
  talk: "이야기",
  happy: "기쁨",
  think: "생각",
  sit: "쉬기",
} as const;
export type BuddyStyle = keyof typeof BUDDIES;
export type Species = keyof typeof SPECIES;
export type Pose = keyof typeof POSES;
export const poseSchema = z.enum(["auto", "wave", "talk", "happy", "think", "sit"]);
export const preferenceSchema = z.object({
  complex: z.enum(["xi", "haiver", "cherbo"]).catch("xi"),
  theme: z.enum(["garden", "clay", "dusk"]).catch("garden"),
  buddy: z.enum(["round", "clay", "facet"]).catch("round"),
  species: z.enum(["cat", "bunny", "bear", "dog"]).catch("cat"),
});
export type Preferences = z.infer<typeof preferenceSchema>;
export function readPreferences(url: URL): Preferences {
  return preferenceSchema.parse(Object.fromEntries(url.searchParams));
}
export function preferenceUrl(url: URL, preferences: Preferences): URL {
  const result = new URL(url);
  for (const [key, value] of Object.entries(preferences)) result.searchParams.set(key, value);
  return result;
}
