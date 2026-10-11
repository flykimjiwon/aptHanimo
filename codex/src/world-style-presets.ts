import type { WorldStyle, WorldView } from "./world-style";

type StyleCopy = Readonly<{ title: string; description: string }>;
type WorldStylePresetId = (typeof WORLD_STYLE_PRESET_IDS)[number];

export const WORLD_STYLE_PRESET_IDS = [
  "cozy",
  "clay",
  "voxel",
  "paper",
  "ink",
  "watercolor",
  "realistic",
] as const;
export const viewLabels: Readonly<Record<WorldView, StyleCopy>> = {
  flat: {
    title: "평면 · 북쪽 고정",
    description: "위에서 내려다보며 길과 배치를 또렷하게 봐요.",
  },
  isometric: {
    title: "등각 · 익숙한 2.5D",
    description: "입체감과 동네 맥락을 함께 보는 편안한 시점이에요.",
  },
  perspective: {
    title: "원근 · 실감 3D",
    description: "원근과 높이감이 살아나는 3D 시점이에요.",
  },
};
export const extraStyleCopy = {
  building: {
    realistic: {
      title: "현장풍 3D 건물",
      description: "단지별 사진 근거를 반영한 재료와 입면 리듬이에요.",
    },
  },
  map: {
    "realistic-neighborhood": {
      title: "실제 동네 지도",
      description: "단지 주변의 실제 공간 선과 고도를 살린 바탕이에요.",
    },
  },
} as const;
export const presetLabels: Readonly<Record<WorldStylePresetId, string>> = {
  cozy: "포근한 2.5D",
  clay: "말랑 점토 3D",
  voxel: "복셀 3D",
  paper: "종이 2.5D",
  ink: "잉크 2D",
  watercolor: "수채화 2.5D",
  realistic: "현장풍 3D",
};
export const presets: Readonly<Record<WorldStylePresetId, WorldStyle>> = {
  cozy: {
    character: "round-buddy",
    building: "soft-isometric",
    map: "soft-village",
    view: "isometric",
  },
  clay: {
    character: "plush-crew",
    building: "clay-toy",
    map: "toy-island",
    view: "perspective",
  },
  voxel: {
    character: "voxel-walker",
    building: "pixel-blocks",
    map: "pixel-grid",
    view: "perspective",
  },
  paper: {
    character: "paper-scout",
    building: "paper-cut",
    map: "paper-layers",
    view: "isometric",
  },
  ink: {
    character: "ink-friend",
    building: "ink-plan",
    map: "ink-notebook",
    view: "flat",
  },
  watercolor: {
    character: "leaf-guide",
    building: "watercolor",
    map: "watercolor-park",
    view: "isometric",
  },
  realistic: {
    character: "round-buddy",
    building: "realistic",
    map: "realistic-neighborhood",
    view: "perspective",
  },
};
