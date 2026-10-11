# V5 주변 공간 컨텍스트 수집 기록

확인일 2026-10-12. 기존 월드 JSON과 충돌·경로·DEM은 수정하지 않고, 공원·녹지·놀이터·지상 철도·옹벽만 별도 `public/context/*.json`으로 분리했다.

## 결과

| 월드 | area | park | playground | wood | grass | rail | retaining-wall |
|---|---:|---:|---:|---:|---:|---:|---:|
| 하이베르 | 9 | 9 | 0 | 0 | 0 | 0 | 0 |
| 왕십리자이 | 8 | 8 | 0 | 0 | 0 | 0 | 0 |
| 라체르보 | 6 | 4 | 2 | 0 | 0 | 30 | 0 |

하이베르와 왕십리자이의 북동쪽에는 `무학봉근린공원`, `대현산 배수지공원`, `미소어린이공원` 등 실제 OSM 공원 경계가 포함된다. 라체르보 동쪽에는 경원선과 왕십리 철도 시설의 실제 개별 선로가 포함된다. 이름 있는 `wood`·`grass`와 `barrier=retaining_wall` 도형은 이번 1.3km 월드 범위의 조회 결과에 없어 빈 배열로 남겼다. 위성 사진만 보고 숲 경계나 옹벽 선을 새로 그리지 않았다.

지하철과 `tunnel=yes` 철도는 지상 경관으로 오해될 수 있어 출력에서 제외했다. 이름 없는 선로는 OSM의 정식 지명이 아니라는 점이 드러나도록 `OSM rail <way id>`라는 기술 식별자를 사용한다. 렌더러가 선로 폭·침목·옹벽 높이를 표현하더라도 그 치수는 시각화 값이어야 한다.

## 출력 계약

```ts
type ContextWorld = {
  id: "haiver" | "xi" | "cherbo";
  areas: readonly {
    id: string;
    name: string;
    kind: "park" | "wood" | "playground" | "grass";
    ring: readonly (readonly [number, number])[];
    source: string;
  }[];
  lines: readonly {
    id: string;
    name: string;
    kind: "rail" | "retaining-wall";
    points: readonly (readonly [number, number])[];
    source: string;
  }[];
  checked: string;
  source: string;
};
```

좌표는 각 기존 월드 origin을 기준으로 동쪽 `+X`, 남쪽 `+Z`인 metre 단위다. 변환식은 `scripts/collect-spatial.mjs`와 동일하게 위도 1도 111,320m 및 origin 위도의 cosine을 사용한다. 모든 출력은 기존 `[-650, 650] × [-650, 650]` 범위로 잘린다. area는 OSM에서 닫혀 있던 way만 받고, clipping 후에도 첫 점과 마지막 점이 같은 유효 다각형만 쓴다. clipping 교차점은 범위 경계에서 계산한 점이며 조사되지 않은 새 시설 경계가 아니다.

## 원자료와 재현

- 기존 우선 자료: `research/spatial/raw/sindang-combined-overpass.json`. 이름 있는 공원과 놀이터를 제공한다.
- 보완 원자료: `research/spatial/raw/sindang-context-osm.json`. 공식 OpenStreetMap Map API 응답에서 관련 way와 실제 노드 좌표만 추린 원장이다.
- 공식 응답 URL: `https://api.openstreetmap.org/api/0.6/map?bbox=127.015,37.551,127.045,37.568`
- 공식 전체 응답 SHA-256: `a5bb13c287364a10b40bbbd973986faf3f76669134472fbc286907c52b59e67d`
- 라이선스/귀속: OpenStreetMap contributors, ODbL 1.0, `https://www.openstreetmap.org/copyright`

최초의 작은 Overpass 보완 쿼리는 `/tmp/hanbakwi-context-query.txt`에 기록했다. `overpass.kumi.systems`와 `overpass.private.coffee`는 HTTP 500, `overpass-api.de`는 HTTP 406을 반환했다. 반복 우회하지 않고 공식 OSM Map API를 35초 제한으로 한 번 조회해 성공한 응답을 사용했다. Ego TaskSpace 53과 다른 브라우저는 조작하지 않았다.

기본 재생성은 이미 보존한 원장을 사용한다.

```sh
node scripts/collect-context.mjs
```

공식 API를 명시적으로 새로 확인하려면 다음을 사용한다. 네트워크 오류가 나면 기존 원장과 출력은 덮어쓰지 않는다.

```sh
node scripts/collect-context.mjs --refresh
```

다운로드한 OSM XML을 별도로 보존한 환경에서는 원본 응답을 다시 요청하지 않고 가져올 수 있다.

```sh
node scripts/collect-context.mjs --import=/path/to/context-map.osm
```

## 보존과 검증

재생성 전후 `public/context/*.json` SHA-256이 동일해 출력이 결정적임을 확인했다. 각 area는 4점 이상이며 닫혀 있고, 모든 좌표는 유한하며 ±650m 안에 있다. 각 line은 2점 이상이고 같은 범위 안에 있다.

기존 월드는 바이트 단위로 그대로다.

| 파일 | SHA-256 |
|---|---|
| `public/worlds/haiver.json` | `9d85b6f27439be1503ca04611b5e6192dd35eed03a70802451b020443b145cc9` |
| `public/worlds/xi.json` | `c6320953639d5874cfe3ba0dfa4b89f77073261138f626cad999da0c339fe83a` |
| `public/worlds/cherbo.json` | `fb2f4e10629c3842dbb3bc4599691d4bcaa5adbac0e8fd9911fae75d61606a55` |

실제 area/line의 존재와 좌표는 OSM 근거다. 데이터에 없는 수목 밀도, 철도 폭, 선로 상태, 옹벽 높이와 출입 가능성은 이 원장이 보증하지 않는다.
