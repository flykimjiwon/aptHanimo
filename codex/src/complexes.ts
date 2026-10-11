import { PLACES, type Place } from "./data";
export type ComplexId = "haiver" | "xi" | "cherbo";
export type Complex = {
  readonly id: ComplexId;
  readonly name: string;
  readonly short: string;
  readonly district: string;
  readonly address: string;
  readonly homes: number;
  readonly buildings: number;
  readonly built: string;
  readonly variant: number;
  readonly source: string;
  readonly theme: string;
  readonly focus: string;
  readonly summary: string;
};
export const COMPLEXES: readonly Complex[] = [
  {
    id: "haiver",
    name: "래미안신당하이베르",
    short: "하이베르",
    district: "중구 신당동",
    address: "중구 퇴계로90길 74",
    homes: 784,
    buildings: 15,
    built: "2011.10",
    variant: 0,
    source: "https://hogangnono.com/apt/31af",
    theme: "오래 머물고 싶은, 초록 동네",
    focus: "신당역·신당초 주변 탐색",
    summary: "조경과 동별 출입 동선, 신당역까지의 길을 함께 살펴보세요.",
  },
  {
    id: "xi",
    name: "왕십리자이",
    short: "왕십리자이",
    district: "성동구 하왕십리동",
    address: "성동구 난계로 100",
    homes: 713,
    buildings: 7,
    built: "2017.07",
    variant: 1,
    source: "https://hogangnono.com/apt/aEc43",
    theme: "도시 가까이, 한 걸음 느긋하게",
    focus: "행당역·상왕십리역 주변 탐색",
    summary: "행당역·상왕십리역 접근과 무학초 통학 후보 동선을 비교해 보세요.",
  },
  {
    id: "cherbo",
    name: "라체르보푸르지오써밋",
    short: "라체르보",
    district: "성동구 행당동",
    address: "성동구 고산자로2길 71",
    homes: 958,
    buildings: 7,
    built: "2025.07",
    variant: 2,
    source: "https://hogangnono.com/apt/e8Q5e",
    theme: "새로운 일상, 왕십리에서",
    focus: "왕십리역·행당초 주변 탐색",
    summary: "왕십리역 환승 생활권과 장보기 동선, 신축 단지의 일상을 살펴보세요.",
  },
];
type Override = Partial<Omit<Place, "id" | "node" | "layer">>;
const XI: Readonly<Record<string, Override>> = {
  station: {
    name: "행당역",
    short: "행당역",
    category: "지하철 · 5호선",
    distance: "출처 표기 550m",
    description:
      "호갱노노에는 550m·도보 8분으로 표시됩니다. 실제 출입구와 신호 대기를 확인하며 걸어볼 후보예요.",
  },
  school: {
    name: "서울무학초등학교",
    short: "무학초",
    distance: "출처 표기 990m",
    description:
      "호갱노노에는 990m·17분, 서울무학초 통학구역으로 표시됩니다. 배정과 통학구역은 교육청에 별도로 확인하세요.",
  },
  park: { distance: "출처 표기 97m" },
  mart: { distance: "출처 표기 560m" },
  sang: {
    distance: "출처 표기 614m",
    description:
      "호갱노노에는 614m·도보 9분으로 표시됩니다. 행당역과 출근 방향에 맞춰 비교해 보세요.",
  },
  high: {
    name: "도선고등학교",
    short: "도선고",
    distance: "출처 표기 731m",
    description:
      "호갱노노 주변 고등학교 목록에 표시된 학교입니다. 인근이라는 사실은 진학·배정을 보장하지 않아요.",
  },
  middle: {
    name: "광희중학교",
    short: "광희중",
    distance: "출처 표기 1.3km",
    description:
      "호갱노노 주변 중학교 목록에 표시된 공립 학교입니다. 실제 통학구역과 배정은 별도 확인이 필요합니다.",
  },
  "community-door": {
    description:
      "커뮤니티 탐색 기능을 위한 입구입니다. 실제 시설 목록과 배치·이용 조건은 아직 확인하지 않았습니다.",
    source: "model",
  },
  "parking-door": {
    distance: "주차 동선 예시",
    description:
      "주차 후 동 출입구까지 이동하는 체험입니다. 주차 대수·현재 여유·실제 배치는 현장 확인이 필요해요.",
    source: "model",
  },
  gym: {
    description:
      "운동 공간을 살펴보는 기능 예시입니다. 이 단지의 실제 운동기구·규모·운영 여부는 확인하지 않았습니다.",
  },
};
const CHERBO: Readonly<Record<string, Override>> = {
  school: {
    name: "서울행당초등학교",
    short: "행당초",
    distance: "출처 표기 286m",
    description:
      "호갱노노에는 서울행당초 통학구역, 286m·4분으로 표시됩니다. 배정·통학구역은 교육청에 별도로 확인해 주세요.",
  },
  middle: {
    name: "광희중학교",
    short: "광희중",
    distance: "출처 표기 720m",
    description:
      "호갱노노 주변 중학교 목록에서 확인한 공립 학교입니다. 인근 학교라는 사실이 배정을 보장하지는 않아요.",
  },
  station: {
    name: "왕십리역",
    short: "왕십리역",
    category: "지하철 · 4개 노선",
    distance: "출처 표기 418m · 수인분당선",
    description:
      "수인분당선 기준 418m·도보 6분. 호갱노노에는 2호선 458m, 5호선 544m, 경의중앙선 558m로 각각 표시돼요.",
  },
  park: {
    name: "응삼공원",
    short: "응삼공원",
    distance: "출처 표기 327m",
    description:
      "호갱노노 주변 공원 목록과 공개 지도 좌표로 확인한 산책 목적지예요. 지형은 광역 고도 자료이며 공원 안 문턱과 경사로는 현장 확인이 필요합니다.",
  },
  mart: {
    name: "이마트 왕십리점",
    short: "왕십리 이마트",
    distance: "출처 표기 528m",
    description:
      "왕십리역 생활권의 장보기 목적지. 호갱노노에 528m로 표시돼요. 실제 영업 여부와 운영시간은 방문 전에 확인해 주세요.",
  },
  sang: {
    name: "한양대역",
    short: "한양대역",
    distance: "출처 표기 608m",
    description:
      "호갱노노에는 2호선 한양대역 608m·도보 9분으로 표시돼요. 대학가와 연결되는 보행 동선을 확인해 보세요.",
  },
  high: {
    name: "무학여자고등학교",
    short: "무학여고",
    distance: "출처 표기 312m",
    description:
      "호갱노노 주변 고등학교 목록에서 확인한 공립 학교입니다. 실제 배정·진학 조건은 따로 확인해 주세요.",
  },
  "community-door": XI["community-door"] ?? {},
  "parking-door": XI["parking-door"] ?? {},
  gym: XI["gym"] ?? {},
};
export function placesFor(complex: Complex): readonly Place[] {
  const overrides = complex.id === "xi" ? XI : complex.id === "cherbo" ? CHERBO : {};
  return PLACES.map((place) => ({
    ...place,
    ...overrides[place.id],
    ...(place.id === "home"
      ? {
          name: complex.name,
          short: complex.short,
          category: "우리의 출발점",
          distance: `${complex.homes}세대 · ${complex.built}`,
          description: `${complex.address}. ${complex.summary} 이 월드는 실제 건물·도로 좌표와 고도 자료를 바탕으로 구성했습니다. 세부 출입 조건은 현장 확인이 필요합니다.`,
          source: complex.id === "haiver" ? ("official" as const) : ("hogang" as const),
        }
      : {}),
  }));
}
