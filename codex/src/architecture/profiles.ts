import type { ComplexId } from "../complexes";
import type { SpatialBuilding } from "../spatial/types";
import type { BrandId } from "./brands";

export type FacadePalette = {
  readonly wall: string;
  readonly side: string;
  readonly base: string;
  readonly roof: string;
  readonly accent: string;
  readonly glass: string;
  readonly mullion: string;
};

export type ComplexProfile = {
  readonly id: ComplexId;
  readonly brand: BrandId;
  readonly sourceAptId: string;
  readonly name: string;
  readonly facade: "teal-crown" | "terracotta-bays" | "silver-fins";
  readonly palette: FacadePalette;
  readonly baseRatio: number;
  readonly window: { readonly width: number; readonly height: number; readonly spacing: number };
  readonly evidence: string;
  readonly summary: string;
};

export const COMPLEX_PROFILES: Readonly<Record<ComplexId, ComplexProfile>> = {
  haiver: {
    id: "haiver",
    brand: "raemian",
    sourceAptId: "31af",
    name: "래미안신당하이베르",
    facade: "teal-crown",
    palette: {
      wall: "#ecece2",
      side: "#bcc6c2",
      base: "#baa99b",
      roof: "#697675",
      accent: "#6aa5a2",
      glass: "#769b9e",
      mullion: "#d6dcd3",
    },
    baseRatio: 0.15,
    window: { width: 1.75, height: 1.8, spacing: 4.2 },
    evidence: "https://kbland.kr/se/c/22105",
    summary: "석재 기단 · 청록색 상단 띠 · 짙은 세로 코어",
  },
  xi: {
    id: "xi",
    brand: "xi",
    sourceAptId: "aEc43",
    name: "왕십리자이",
    facade: "terracotta-bays",
    palette: {
      wall: "#e2e3df",
      side: "#b8bfc0",
      base: "#68716f",
      roof: "#637575",
      accent: "#b78262",
      glass: "#6a9295",
      mullion: "#e7e6dc",
    },
    baseRatio: 0.17,
    window: { width: 1.65, height: 1.85, spacing: 3.9 },
    evidence: "https://hogangnono.com/apt/aEc43",
    summary: "회백색 베이 · 주황 세로 띠 · 짙은 석재 저층부",
  },
  cherbo: {
    id: "cherbo",
    brand: "summit",
    sourceAptId: "e8Q5e",
    name: "라체르보푸르지오써밋",
    facade: "silver-fins",
    palette: {
      wall: "#d9ded8",
      side: "#7e8c88",
      base: "#56615f",
      roof: "#4f5e5a",
      accent: "#a49678",
      glass: "#4f737b",
      mullion: "#e5e7db",
    },
    baseRatio: 0.12,
    window: { width: 1.9, height: 2.05, spacing: 3.8 },
    evidence: "https://hogangnono.com/apt/e8Q5e/0/9/review/6779861",
    summary: "밝은 세로 프레임 · 짙은 창 베이 · 차분한 금속 크라운",
  },
};

export function complexProfile(id: string): ComplexProfile | null {
  return Object.values(COMPLEX_PROFILES).find((profile) => profile.id === id) ?? null;
}

export function buildingProfile(building: SpatialBuilding): ComplexProfile | null {
  if (building.kind !== "core") return null;
  return (
    Object.values(COMPLEX_PROFILES).find((profile) =>
      building.id.startsWith(`hogang:${profile.sourceAptId}:`),
    ) ?? null
  );
}
