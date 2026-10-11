# V5 목표·문맥·공간 충실도 독립 검토

검토일: 2026-10-12
범위: 본편 10/11/11 스타일과 3시점, 순간이동, 사진·OSM·DEM 근거, 실제 외곽선 보존, 공개 저장소 인계 상태. 제품 소스는 읽기 위주로 검토했고, 검토 중 확인한 OSM 면 가시성만 실제 원본 다각형을 사용해 보완했다. Ego TaskSpace 53과 다른 브라우저는 조작하지 않았다.

## 판정

**구현 목표에는 조건부 PASS, 완료·공개 주장에는 BLOCKED.**

본편 소스에는 캐릭터 10종, 건물 11종, 지도 11종, 독립된 카메라 3종, 알려진 장소와 사용자가 고른 통행 가능 지점으로의 순간이동이 실제 실행 경로로 연결돼 있다. 스타일은 단순 라벨 교체가 아니며, 원본 월드 좌표·DEM·외곽선·경로·충돌 데이터도 그대로다. 검토 중 발견한 익명 지점 경로의 잘못된 도착 이벤트와 작은 라체르보 OSM 면 3개의 비가시성은 회귀 검사와 함께 수정됐다.

별도 공개 저장소 `<GIT_CHECKOUT>`의 `main`과 원격 `origin/main`은 모두 `055d06c98eb4b4fce92cc5832bf4855c80106b3d`로 확인됐다. 그러나 이 커밋은 기존 `prototype/`·기획 문서의 첫 게시이며, 예정된 `codex/` subtree와 이 V5 TypeScript 앱은 아직 포함하지 않는다. 또한 디자인 계약이 명시한 실제 렌더·모바일·제스처 검증은 Browser53의 사용자 제어 권한 창 때문에 아직 수행할 수 없다. 이 두 항목을 끝내기 전에는 V5 전체 완료나 공개 배포를 주장하면 안 된다.

## 검토 중 확인·해결된 사항

### 해결 — 익명 지점 경로 완료가 이전 장소 도착으로 보고되던 문제

`SpatialDriver.step()`은 이름 있는 목적지의 `arrived`와 지도 빈 땅 경로 또는 복구 포기의 `complete`를 구분한다. 이전 `world-step.ts`는 `complete`를 기존 `current` ID로 바꿔 `World.onArrive()`를 호출했다. 따라서 빈 땅까지 정상적으로 걸은 뒤에도 이전 장소에 도착했다는 상태와 `data-current-node`가 기록될 수 있었다.

현재 `stepPlayer()`는 `arrived`만 ID로 반환하고 `complete`는 `null`로 끝낸다. `src/scene/world-step.test.ts`가 실제 왕십리자이 데이터에서 익명 지점은 도착 ID를 내지 않고, 이름 있는 역 경로는 `station`만 내는 것을 검증한다.

### 해결 — 작은 OSM 공원·놀이터가 65×65 색상 격자 사이에서 사라지던 문제

초기 렌더는 공원 색을 4,225개 지형 정점에서만 판정했다. 하이베르 9/9, 왕십리자이 8/8 면은 적어도 한 정점에 걸렸지만, 라체르보의 `행당한신 공원`, `한신아파트놀이터`, `행당한신 정자`는 포함 정점이 0개여서 데이터에는 있어도 화면 색에 나타나지 않았다.

`mappedLandAreas(data, colors)`는 보존된 OSM ring을 그대로 삼각분할하고 각 꼭짓점을 `groundHeight + 0.035m`로 DEM에 붙인다. park/playground 종류별 배치여서 월드당 드로콜 증가는 최대 2회다. 경로는 `+0.1m`에 있어 그 위로 보이고, 이 면은 navigation/collision 입력에 들어가지 않는다.

| 월드 | 실제 OSM 면 | 생성 삼각형 | 최소 면별 삼각형 | 배치 메시 |
|---|---:|---:|---:|---:|
| 하이베르 | 9 | 89 | 1 | 1 |
| 왕십리자이 | 8 | 100 | 2 | 1 |
| 라체르보 | 6 | 56 | 2 | 2 |

회귀 검사는 라체르보 6개 면 모두 삼각형 수가 0보다 크고, 모든 정점이 DEM 높이에서 정확히 0.035m 위이며, 모든 면 법선이 위쪽을 향하는지 확인한다. 새 경계나 시설을 그리지 않았다.

### 해결 — 실제 지점 선택 순간이동과 레이어 모드

알려진 장소 목록은 기존 `Place`만 받는다. 여기에 `지도에서 직접 시작 위치 고르기`가 연결돼, 다음 지면 탭을 `World.teleportGround()`로 보낸다. 성공 시 이전 경로를 지우고 DEM 높이의 통행 가능한 점으로 이동해 카메라를 즉시 맞추며, 실패 시 이동하지 않고 안내한다. 일반 상태의 지면 탭은 계속 길찾기다.

커뮤니티로 순간이동할 때 자동차·자전거를 다시 강제로 복원하던 문제도 제거됐다. 커뮤니티의 기존 도보 전용 레이어 정책을 유지하는 회귀 검사가 통과한다. 이 흐름의 실제 포인터·Escape·모바일 조작은 브라우저 권한 반환 후 확인해야 한다.

## 10/11/11/3 구현 확인

| 축 | 소스 계약 | 실제 렌더 변화 | 검증 결과 |
|---|---|---|---|
| 캐릭터 | `CHARACTER_IDS` 10개 | 4개 방향성 아틀라스와 6개 실제 저폴리 메시. 여섯 메시가 구·박스·캡슐·구슬·잎·스티치 구성과 PixelCrew 눈·볼·스카프·세 발을 유지 | 10개 라우팅, 6개 고유 geometry, 거리 기반 동작·정지·동행·차량·peer 교체 검사 통과 |
| 건물 | `BUILDING_IDS` 11개 | 패턴, 밴드, bevel, flat shading, 윤곽, roughness/metalness, 색조와 `flat-roof` 높이 압축이 서로 다름. `realistic`은 사진 기반 3단지 profile을 유지 | 11개 렌더 서명 모두 고유, 원본 `SpatialBuilding` 불변 |
| 지도 | `MAP_IDS` 11개 | 실제 DEM 정점은 고정하고 정점색, 128px 절차 패턴, 길·등고선 색, 나무 톤, 실제 OSM 면·철도 표현을 바꿈 | 11개 색/재료 서명 모두 고유, ground position 배열 불변 |
| 시점 | `VIEW_IDS` 3개 | flat 북쪽 고정 orthographic, isometric orthographic, 실제 `PerspectiveCamera` | 3종 카메라 타입·광선·투영·줌·회전·스냅 검사 통과 |

`World.setStyle()`은 카메라와 player/peer 표현을 바꾸고, building/map이 변할 때만 지면 시각 레이어를 다시 만든다. `SpatialDriver`, 이동 모드, route group, 실제 위치와 route metres/minutes는 교체 대상이 아니다. 따라서 본편 선택은 스타일 실험실의 이름만 가져오는 방식이 아니라, 충돌 가능한 실제 월드의 재료·기하·카메라를 바꾼다.

## DEM·기초·기하 확인

- 세 월드의 ground는 각각 4,225개 정점을 유지한다. 법선 Y 범위는 하이베르 `0.8675–1.0000`, 자이 `0.8688–1.0000`, 라체르보 `0.8759–1.0000`으로 평면 상수값이 아니며, 고도색과 방향성 음영도 함께 변한다.
- 실제 코어 29동 모두 바닥 위치가 외곽선 꼭짓점에서 구한 최대 DEM 높이다. 기초 하단은 각 외곽선 점의 DEM보다 0.05m 아래로 이어졌고, DEM 접합 계산의 최대 부동소수점 오차는 `1.3e-6m` 이하였다.
- 현재 실제 core ring은 모두 같은 양의 winding이었다. 자이 101동 ring을 역순으로 만든 추가 검사에서도 기초 정점 수, DEM 오차, 높이 배율 보정이 같았고 material은 `DoubleSide`였다.
- `flat-roof`의 건물 배율 `0.07`과 기초 역배율 `14.285714...`의 곱은 1이다. 평면 스타일은 건물 시각 높이만 압축하며 DEM 지지면은 압축하지 않는다.
- `buildingLevel()`의 이름을 “footprint 내부 전체 최대값”으로 확대 해석하면 안 된다. 현재 구현은 ring 꼭짓점의 최대값이다. 1m 간격 내부 표본과 비교했을 때 실제 29동의 내부 초과 최대는 자이 101동 약 0.071m였다. 30m SRTM 원자료의 한계보다 훨씬 작지만, 측량 기초나 옹벽 근거는 아니다.

## 사진 36장과 브랜드·공간 원장

세 매니페스트의 채택 사진을 다시 해시 검사하고 로컬 접촉표로 확인했다.

| 단지 | 채택 사진 | 고유 SHA-256 | viewed/관찰 기록 | 구현에 허용한 범위 |
|---|---:|---:|---:|---|
| 래미안신당하이베르 | 14 | 14 | 14 | 아이보리·회색 벽, 석재 기단, 청록 상단 띠, 세로 코어 |
| 왕십리자이 | 11 | 11 | 11 | 회백색 베이, 주황 세로 띠, 짙은 저층부. P10의 105·106동만 대상이며 배경 110동은 이웃 단지로 제외 |
| 라체르보푸르지오써밋 | 11 | 11 | 11 | 외부·단지 공간 10장과 공용 라운지 1장. 밝은 수직 프레임, 짙은 창 베이, 금속 크라운 |

공식 마크 원장은 래미안 역사 BI, 현장 사진과 맞는 legacy Xi signature, 라체르보 공식 microsite의 SUMMIT PRUGIO를 각 단지에만 연결한다. IPARK는 향후 확장용 자산이며 현재 단지를 재브랜딩하지 않는다. 사진과 지도 캡처는 연구 폴더의 관찰 근거이고 월드 texture로 배포되지 않는다. 색상, 창 반복, 브랜드 위치는 관찰을 단순화한 authored rendering이며 측정 도료·실측 창호·실측 표지 좌표가 아니다.

## OSM 문맥과 원본 보존

별도 `public/context` 원장은 하이베르 공원 9, 자이 공원 8, 라체르보 공원 4·놀이터 2·지상 rail 30을 포함한다. 이름 있는 wood/grass와 retaining-wall은 수집 자료에 없어 0으로 남겼다. 지하철과 tunnel rail은 지상 표현에서 제외했다. rail 중심선은 OSM이지만 렌더 폭·침목 치수와 DEM drape는 시각화 값이다.

기존 월드 파일은 V5 문맥 추가 후에도 다음 SHA-256을 유지한다.

| 파일 | SHA-256 |
|---|---|
| `public/worlds/haiver.json` | `9d85b6f27439be1503ca04611b5e6192dd35eed03a70802451b020443b145cc9` |
| `public/worlds/xi.json` | `c6320953639d5874cfe3ba0dfa4b89f77073261138f626cad999da0c339fe83a` |
| `public/worlds/cherbo.json` | `fb2f4e10629c3842dbb3bc4599691d4bcaa5adbac0e8fd9911fae75d61606a55` |

이는 코어 15/7/7동 외곽선, 주변 OSM 건물·길, POI, 충돌·경로, DEM 배열을 V5 스타일 때문에 다시 쓰지 않았다는 바이트 단위 근거다.

## 사실 한계와 완료 전 차단 항목

1. 지형은 65×65 렌더 격자지만 원천은 SRTM 30m다. 약 20.3m 재표본 간격이 더 높은 실제 해상도, LiDAR, 측량, curb/ramp/step 정밀도를 뜻하지 않는다.
2. 코어 높이는 일부 OSM height이고, 나머지는 공개 최고층×3m 추정이다. 주변 건물도 levels×3m 또는 9m 기본값을 포함한다. 스타일 높이와 `flat-roof` 압축은 표현값이다.
3. DEM 기초, 경계 단면, OSM rail/park 표면은 모두 절차 시각화다. 실측 retaining wall, 조경 밀도, 선로 상태, 출입 허가를 나타내지 않는다.
4. **브라우저 검증 차단:** Browser53이 사용자 제어 권한 창에 머물러 있어 실제 10/11/11 조합의 화면, 3시점 전환, 지도 지점 선택, 모바일 터치, occlusion, 야간, 프레임 비용을 확인하지 못했다. 소스·엔진 검사를 화면 QA로 대신하지 않는다.
5. **GitHub V5 subtree 공개 차단:** `https://github.com/flykimjiwon/aptHanimo.git`의 원격 `main`은 실제로 `055d06c98eb4b4fce92cc5832bf4855c80106b3d`를 가리키지만, 해당 트리에는 `codex/`가 없고 현재 앱의 `src/world-style.ts`, `src/scene/terrain.ts`, `public/worlds/*.json`, `qa/v5/*`도 없다. 별도 `sindang-stroll-codex` 작업 폴더 역시 `.git` 저장소가 아니다. 따라서 저장소 생성·첫 push 자체는 확인됐지만 **현재 V5 앱의 subtree push와 그 원격 SHA 확인은 남아 있다.**

## 실행 근거

- `bun test`: **74 pass, 0 fail**, 2,861 assertions, 17 files.
- `bun run check`: **PASS**.
- `bunx biome check src/scene/neighborhood-context.ts src/scene/terrain.ts src/scene/world-style.test.ts`: 오류 없음. 프로젝트가 의도적으로 쓰는 `userData["key"]` 표기에 대한 정보성 `useLiteralKeys` 제안만 남음.
- Programming no-excuse 검사: 변경한 TypeScript 3파일에서 금지된 `any`/assertion/ignore/enum/non-null/catch 위반 0.
- 임시 Bun geometry probe: 실제 29개 core의 foundation DEM 접합, flat scale 역보정, 역 winding, ground normal 범위, OSM 면별 지형 정점 교차를 검사했고 임시 파일은 삭제했다.
- 사진 manifest/hash probe: `14 + 11 + 11 = 36`, 각 단지 내 고유 hash 수 동일, 누락·hash 불일치 0. 임시 접촉표는 `/tmp`에서만 만들고 제품·연구 원장에는 추가하지 않았다.
- `shasum -a 256 public/worlds/{haiver,xi,cherbo}.json`: 위 보존 SHA와 일치.
- Git 상태 확인: `<GIT_CHECKOUT>`는 clean `main...origin/main`; local HEAD와 remote-tracking branch가 `055d06c98eb4b4fce92cc5832bf4855c80106b3d`로 일치.
- `git ls-remote origin refs/heads/main`: GitHub 원격도 같은 `055d06c98eb4b4fce92cc5832bf4855c80106b3d`를 반환. 다만 `find`와 파일 해시 대조에서 `codex/` subtree와 현 V5 핵심 파일은 모두 미포함.

현재 제품 소스의 자동 검증과 근거 경계는 통과한다. 최종 판정은 브라우저 권한 반환 뒤의 실제 화면·입력 QA와 GitHub 원격 SHA 확인을 근거로 갱신해야 한다.


## 게시 담당자의 후속 확인

위 리뷰는 게시 전 상태를 기록한다. 이후 코드64e2b49를 기존055d06c 위의 `codex/` subtree로 게시했고 새 체크아웃에서 install·74테스트·빌드를 확인했다. 기존 Claude 파일은 변경하지 않았으며 루트 README에 실행 경로만 덧붙인다. Git 확인 기록은 `publication.json`을 따른다. 브라우저 미검증 판정은 그대로다.
