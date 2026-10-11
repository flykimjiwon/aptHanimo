import type { StyleOption } from "./types";

export const MAP_STYLES: readonly StyleOption[] = [
  {
    id: "soft-village",
    title: "포근한 마을 디오라마",
    subtitle: "비스듬한 길 · 둥근 숲 테두리 · 낮은 원근",
    description: "실제 길과 동 배치를 부드러운 잔디 미니어처 위에 올린 편안한 기본형이에요.",
    cost: "가벼움",
  },
  {
    id: "flat-neighborhood",
    title: "납작한 동네 그림지도",
    subtitle: "북쪽 고정 · 굵은 길 · 낮은 건물",
    description: "방향과 보행 연결을 빠르게 읽도록 높이를 누른 일러스트 지도예요.",
    cost: "가벼움",
  },
  {
    id: "paper-layers",
    title: "겹종이 언덕 마을",
    subtitle: "종이 결 · 고도선 겹침 · 오린 가장자리",
    description: "연속 고도를 종이 층처럼 표현하되 실제 지형을 계단으로 바꾸지 않아요.",
    cost: "보통",
  },
  {
    id: "pixel-grid",
    title: "16비트 좌표 마을",
    subtitle: "화면 픽셀 스냅 · 격자 무늬 · 실제 좌표",
    description: "좌표와 높이는 유지하고 화면 표현만 또렷한 픽셀 게임 문법으로 바꿔요.",
    cost: "가벼움",
  },
  {
    id: "ink-notebook",
    title: "현장 잉크 수첩",
    subtitle: "먹선 · 사선 해칭 · 여백 메모",
    description: "배치와 길을 현장에서 빠르게 스케치한 건축 수첩처럼 보여줘요.",
    cost: "가벼움",
  },
  {
    id: "topo-outdoor",
    title: "등고선 아웃도어 맵",
    subtitle: "촘촘한 등고선 · 노선 케이싱 · 북쪽 고정",
    description: "실제 DEM의 연속 높낮이와 이동선을 가장 앞에 두는 야외 지도형이에요.",
    cost: "보통",
  },
  {
    id: "toy-island",
    title: "장난감 섬 컷어웨이",
    subtitle: "타원 프레임 · 높은 시점 · 미니어처 가장자리",
    description: "현재 위치 주변만 작은 섬 모형처럼 잘라 보여주는 집중형 디오라마예요.",
    cost: "보통",
  },
  {
    id: "watercolor-park",
    title: "수채화 공원 산책",
    subtitle: "번진 바탕 · 얇은 길 · 잎사귀 테두리",
    description: "실제 공간선 위에 투명한 붓자국을 겹친 차분한 그림책 스타일이에요.",
    cost: "보통",
  },
  {
    id: "evening-market",
    title: "저녁 골목 랜턴",
    subtitle: "남색 바탕 · 따뜻한 길 · 장식 랜턴",
    description: "실제 조명 정보가 아닌 그래픽 무드로 저녁 산책의 활기를 보여줘요.",
    cost: "보통",
  },
  {
    id: "clean-architect",
    title: "클린 건축 모형",
    subtitle: "정밀 윤곽 · 얇은 그리드 · 넓은 여백",
    description: "장식을 줄이고 실제 건물 윤곽과 단지 구조를 또렷하게 비교해요.",
    cost: "가벼움",
  },
] as const;
