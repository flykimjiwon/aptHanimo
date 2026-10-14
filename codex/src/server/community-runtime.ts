import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { CommunityStore } from "./community-store";

export function openCommunityStore(): CommunityStore {
  const directory = resolve(
    process.env.HANBAKWI_DATA_DIR ?? resolve(import.meta.dir, "../../.community"),
  );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return new CommunityStore(resolve(directory, "community.sqlite"));
}
export function communityOrigin(): string | null {
  const raw = process.env.HANBAKWI_PUBLIC_ORIGIN;
  if (!raw) return null;
  return new URL(z.url({ protocol: /^https?$/ }).parse(raw)).origin;
}
