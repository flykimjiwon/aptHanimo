import type { StyleOption } from "./types";

export const BUILDING_STYLES: readonly StyleOption[] = [
  {
    id: "soft-isometric",
    title: "포근한 파스텔 마을",
    subtitle: "크림 벽 · 색 발코니 · 부드러운 입체",
    description: "큰 아파트도 따뜻한 생활동처럼 읽히는 기본 2.5D 스타일이에요.",
    cost: "가벼움",
  },
  {
    id: "pixel-blocks",
    title: "16비트 도트 타워",
    subtitle: "타일 창문 · 계단식 명암 · 또렷한 픽셀",
    description: "지도를 작은 동네 게임 화면처럼 바꾸는 정돈된 픽셀 문법이에요.",
    cost: "가벼움",
  },
  {
    id: "paper-cut",
    title: "겹겹이 종이 동네",
    subtitle: "오린 단면 · 종이 그림자 · 창문 구멍",
    description: "색종이를 포개 만든 수제 지도처럼 층과 깊이가 선명해요.",
    cost: "가벼움",
  },
  {
    id: "clay-toy",
    title: "말랑 점토 모형",
    subtitle: "둥근 모서리 · 콩알 창문 · 장난감 지붕",
    description: "아파트 덩어리를 손으로 빚은 미니어처처럼 부드럽게 보여줘요.",
    cost: "보통",
  },
  {
    id: "ink-plan",
    title: "잉크 건축 산책",
    subtitle: "이중 선 · 사선 해칭 · 설계 스케치",
    description: "실제 배치를 건축가의 현장 수첩처럼 차분하게 강조해요.",
    cost: "보통",
  },
  {
    id: "woodblock",
    title: "따뜻한 목판 마을",
    subtitle: "나뭇결 · 먹색 창 · 새긴 윤곽",
    description: "거친 결이 남는 판화 방식으로 언덕 동네의 손맛을 살려요.",
    cost: "보통",
  },
  {
    id: "flat-roof",
    title: "납작 지붕 지도",
    subtitle: "실제 윤곽 · 지붕 구획 · 출입구 길",
    description: "높이를 낮춰 단지 배치와 동 사이 보행 공간을 가장 잘 보여줘요.",
    cost: "가벼움",
  },
  {
    id: "watercolor",
    title: "수채화 오후",
    subtitle: "번진 벽 · 색 지붕 · 창문 물감점",
    description: "겹친 반투명 붓자국으로 서울 골목을 포근한 그림책처럼 만들어요.",
    cost: "보통",
  },
  {
    id: "manga-cel",
    title: "만화 셀 아파트",
    subtitle: "굵은 먹선 · 단색 명암 · 강한 발코니",
    description: "멀리서도 큰 동과 입구가 즉시 구분되는 활기찬 셀 스타일이에요.",
    cost: "가벼움",
  },
  {
    id: "white-model",
    title: "하얀 건축 모형",
    subtitle: "백색 매스 · 코랄 포인트 · 미니어처 조명",
    description: "분양 모형의 정갈함에 따뜻한 창과 생활감을 더한 스타일이에요.",
    cost: "가벼움",
  },
] as const;
