export type Mode = "walk" | "stroller" | "bike" | "car";
export type Party = "solo" | "couple" | "family";
export type Layer = "ground" | "community" | "parking";
export type Point = readonly [number, number, number];
export const MODES: Readonly<
  Record<Mode, { label: string; icon: string; speed: number; hint: string }>
> = {
  walk: { label: "도보", icon: "footprints", speed: 72, hint: "골목과 계단까지, 가볍게" },
  stroller: { label: "유모차", icon: "baby", speed: 50, hint: "계단을 피해 완만한 길로" },
  bike: { label: "자전거", icon: "bike", speed: 170, hint: "계단 없이 연결된 길로" },
  car: { label: "자동차", icon: "car-front", speed: 260, hint: "주차장 출발 · 차량 도로만" },
};
export const PARTIES = { solo: "혼자서", couple: "둘이서", family: "가족과" } as const;
export const LAYERS = {
  ground: "동네 산책",
  community: "커뮤니티",
  parking: "지하 주차장",
} as const;
export type Place = {
  readonly id: string;
  readonly name: string;
  readonly short: string;
  readonly icon: string;
  readonly node: string;
  readonly layer: Layer;
  readonly category: string;
  readonly distance: string;
  readonly description: string;
  readonly checks: readonly string[];
  readonly source: "official" | "hogang" | "model";
};
export const PLACES: readonly Place[] = [
  {
    id: "home",
    name: "래미안신당하이베르",
    short: "하이베르",
    icon: "building-2",
    node: "home",
    layer: "ground",
    category: "우리의 출발점",
    distance: "784세대 · 2011.10",
    description:
      "중구 퇴계로90길 74. 오늘의 산책은 단지 안 작은 광장에서 시작해요. 실제 동 배치와 출입구 위치는 단순화한 모형입니다.",
    checks: ["동별 출입구와 보행 동선", "유모차로 현관까지 이어지는 길", "방문 가능한 구역 확인"],
    source: "official",
  },
  {
    id: "station",
    name: "신당역",
    short: "신당역",
    icon: "train-front",
    node: "station",
    layer: "ground",
    category: "지하철 · 2·6호선",
    distance: "출처 표기 543m · 2호선",
    description:
      "호갱노노의 2호선 기준 543m·도보 8분. 네이버는 3번 출구 기준 760m로 안내해요. 출입구와 출발점에 따라 거리가 달라집니다.",
    checks: ["실제 출근 시간에 걸어보기", "엘리베이터 출구 위치", "횡단보도 신호 대기"],
    source: "hogang",
  },
  {
    id: "school",
    name: "서울신당초등학교",
    short: "신당초",
    icon: "graduation-cap",
    node: "school",
    layer: "ground",
    category: "교육 · 초등학교",
    distance: "출처 표기 428m",
    description:
      "호갱노노에는 428m·9분으로 표시돼요. 지도상의 가까움과 실제 통학 동선은 다를 수 있어요. 배정은 교육청에 별도 확인이 필요합니다.",
    checks: ["차도와 보도가 분리되어 있는지", "등하교 시간 차량 흐름", "실제 통학구역 확인"],
    source: "hogang",
  },
  {
    id: "park",
    name: "미소공원",
    short: "미소공원",
    icon: "trees",
    node: "park",
    layer: "ground",
    category: "초록 쉼터",
    distance: "출처 표기 177m",
    description:
      "가까운 공원을 산책 목적지로 골라보세요. 이 모형의 언덕과 계단은 이동 방식 차이를 체험하기 위한 예시이며, 실제 경사 측정값은 아닙니다.",
    checks: ["유모차 진입 가능한 입구", "산책길의 실제 경사", "벤치와 그늘"],
    source: "hogang",
  },
  {
    id: "mart",
    name: "롯데마트 행당역점",
    short: "행당역 마트",
    icon: "shopping-basket",
    node: "mart",
    layer: "ground",
    category: "생활 · 장보기",
    distance: "출처 표기 775m",
    description:
      "호갱노노 주변 상권에 표시된 장보기 목적지예요. 이동 전 영업 여부와 운영시간은 원본 지도에서 확인해 주세요.",
    checks: ["장바구니를 들고 돌아오는 길", "영업 여부와 운영시간", "주차장 진입·출차"],
    source: "hogang",
  },
  {
    id: "sang",
    name: "상왕십리역",
    short: "상왕십리역",
    icon: "train-front",
    node: "sang",
    layer: "ground",
    category: "지하철 · 2호선",
    distance: "출처 표기 694m",
    description:
      "호갱노노에는 694m·도보 10분으로 표시돼요. 신당역과 함께 실제 출퇴근 방향에 맞춰 걸어볼 후보입니다.",
    checks: ["이용 출구까지의 보행 동선", "보도 폭과 신호 대기"],
    source: "hogang",
  },
  {
    id: "middle",
    name: "금호중학교",
    short: "금호중",
    icon: "book-open",
    node: "middle",
    layer: "ground",
    category: "교육 · 중학교",
    distance: "출처 표기 411m",
    description:
      "호갱노노 주변 중학교 목록에 표시된 공립 학교입니다. 가까운 학교라는 사실이 배정을 보장하지는 않아요.",
    checks: ["배정 가능 학교군 확인", "등하교 실제 동선"],
    source: "hogang",
  },
  {
    id: "high",
    name: "성동고등학교",
    short: "성동고",
    icon: "book-open",
    node: "high",
    layer: "ground",
    category: "교육 · 고등학교",
    distance: "출처 표기 308m",
    description:
      "호갱노노 주변 고등학교 목록에서 확인했어요. 실제 진학·배정 조건은 별도로 확인해야 합니다.",
    checks: ["진학·배정 조건", "보행로와 주변 교통"],
    source: "hogang",
  },
  {
    id: "community-door",
    name: "커뮤니티 입구",
    short: "커뮤니티",
    icon: "coffee",
    node: "community",
    layer: "ground",
    category: "단지 안 · 실내 체험",
    distance: "실내 구조 예시",
    description:
      "서울시 단지 포털에서 커뮤니티센터와 주민운동시설 공고를 확인했어요. 내부는 실제 도면을 재현하지 않은 체험 공간입니다.",
    checks: ["방문 가능 시간과 이용 조건", "운영 중인 시설 목록"],
    source: "official",
  },
  {
    id: "parking-door",
    name: "지하 주차장 입구",
    short: "주차장",
    icon: "square-parking",
    node: "parking",
    layer: "ground",
    category: "단지 안 · 주차 체험",
    distance: "출처 표기 지하 968대",
    description:
      "주차 대수는 호갱노노 표기 기준입니다. 지하 모형은 주차 후 엘리베이터로 이어지는 동선을 체험하는 구조 예시예요.",
    checks: ["실제 방문차량 등록 방법", "주차 위치에서 동 출입구까지", "차량 높이 제한"],
    source: "hogang",
  },
  {
    id: "lobby",
    name: "커뮤니티 로비",
    short: "로비",
    icon: "door-open",
    node: "lobby",
    layer: "community",
    category: "실내 체험",
    distance: "실제 평면 아님",
    description:
      "실내 공간을 이동하며 확인할 항목을 수첩에 남겨보세요. 배치와 가구, 시설 구성은 모두 체험용 예시입니다.",
    checks: ["입주민 이용 조건", "실제 운영시간"],
    source: "model",
  },
  {
    id: "gym",
    name: "운동 공간",
    short: "운동 공간",
    icon: "dumbbell",
    node: "gym",
    layer: "community",
    category: "커뮤니티 구조 예시",
    distance: "시설·장비 미확인",
    description:
      "주민운동시설 존재는 공식 공고로 확인했지만, 이곳의 운동기구와 규모는 예시예요. 실제 구성은 현장에서 확인해 주세요.",
    checks: ["실제 운동기구 구성", "혼잡 시간과 이용료"],
    source: "model",
  },
  {
    id: "lounge",
    name: "휴식 공간",
    short: "라운지",
    icon: "armchair",
    node: "lounge",
    layer: "community",
    category: "커뮤니티 구조 예시",
    distance: "실제 시설 미확인",
    description:
      "책을 읽거나 잠시 쉬는 공간을 상상한 프로토타입입니다. 실제 단지에 이 시설이 있다는 의미는 아닙니다.",
    checks: ["휴식 공간 유무", "예약·이용 규칙"],
    source: "model",
  },
  {
    id: "lift",
    name: "엘리베이터 앞",
    short: "엘리베이터",
    icon: "arrow-up-down",
    node: "lift",
    layer: "parking",
    category: "주차 동선 구조 예시",
    distance: "실제 연결 여부 미확인",
    description:
      "주차 후 유모차와 함께 엘리베이터까지 가는 동선을 떠올려보세요. 단차와 동별 연결은 실제 확인이 필요합니다.",
    checks: ["동별 엘리베이터 직결 여부", "경사·단차·문턱"],
    source: "model",
  },
  {
    id: "stall",
    name: "주차 구역",
    short: "주차 구역",
    icon: "car-front",
    node: "stall",
    layer: "parking",
    category: "주차 동선 구조 예시",
    distance: "실제 규격 아님",
    description:
      "차에서 내려 짐을 옮기는 상황을 체험하는 공간입니다. 주차칸 폭이나 실제 여유 대수를 나타내지는 않아요.",
    checks: ["퇴근 시간대 주차 여유", "문을 열고 짐을 내릴 공간"],
    source: "model",
  },
];
export const SOURCES = {
  official: {
    label: "서울시 공동주택 통합정보마당",
    url: "https://openapt.seoul.go.kr/openApt/index.do?aptCode=A10078901",
  },
  hogang: { label: "호갱노노 · 래미안신당하이베르", url: "https://hogangnono.com/apt/31af" },
  naver: { label: "네이버 지도 · 사용자 제공 링크", url: "https://naver.me/G1wiQEAi" },
} as const;
