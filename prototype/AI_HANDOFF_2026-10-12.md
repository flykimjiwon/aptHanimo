# 임장월드 프로토타입(Claude 레인) · AI 인계 — 2026-10-12

> 대상: `prototype/`와 루트 기획서·카탈로그를 이어받을 AI. 저장소 전체 입구는 [`../AI_HANDOFF.md`](../AI_HANDOFF.md), Codex 레인(`codex/`)은 별도 구현이라 섞지 않는다.
> 기준: `5c67025`(v9), 이후 생성물·검증기 보강은 [검증 가이드](tests/README.md). 이력 정본은 [`PROTOTYPE_NOTES.md`](PROTOTYPE_NOTES.md), 구조는 [`CODEX_PROTOTYPE_GUIDE_2026-10-11.md`](CODEX_PROTOTYPE_GUIDE_2026-10-11.md)(이름과 달리 이 폴더 안내).

## 0. 30초 요약
- 세 단지(래미안신당하이베르·왕십리자이·라체르보푸르지오써밋)를 한 클러스터 셀(99×58 타일, 25m)로 굽고, 도보·유모차·자전거·차의 **실제 환산 시간(추정)**, 출처 등급 이슈 카드, 컨셉별 체크리스트, 임장 노트, 세 단지 비교, 출근 레그, 단지 내부, 모의 광고까지 **끝까지 동작**하는 단일 HTML 체험판. PC·모바일.
- **수치 기준점**: 가족·하이베르, 신당역 3번 출구→정문 **유모차 11분·496m·↑19m**, 비교표 유모차 **11/19/8분**. `node prototype/tests/run.mjs`(149건)의 골든값이 지킨다.
- 오늘(10-12) 변경: v7 검수 반영(`f7da8c1`), v8 재굽기·일방통행·테스트(`bd240cc`). 둘 다 `PROTOTYPE_NOTES.md` 머리말에 요약.

## 1. 파일 지도 (정본 vs 생성물)
| 경로 | 역할 |
|---|---|
| `src/01_head.html` | CSS·DOM. 서랍/HUD/독/대화창/모달/광고줄(`#credit` ODbL 고지) |
| `src/02_world.js` | roundRect 폴리필(P0, 지우지 말 것) → 데이터 상수(`E K R LN CR ST OW OD DIRV`) → `STYLE`(해시) → 컨셉·체크리스트·노선 → 상태 `S`(저장 키 `imjang-proto-v2`) → 8m 단 지형(연출) |
| `src/03_static.js` | 정적 레이어 1장(지형·길·건물·나무) + 불빛 레이어 |
| `src/04_route.js` | `TARGETS`, `slopeFactor`·`isStairs`·`tileAllowed`·`moveAllowed`·`stepCost`·`astar`·`routeStats`·`nearestWalkable` |
| `src/vendor/pixelcrew_sprites.js` | PixelCrew Desk 원문(MIT, 작성자 본인). 수정 0 |
| `src/05_dynamic.js` | 카메라·캐릭터·이동 재생(`startTravel`/`tickTravel`)·도착(`onArrive`, `CARD_CATS`)·체크(`evalChecklist`, `checkKey`)·대화·`esc()` |
| `src/06_ui.js` | 서랍 5탭·비교·`computeMetrics`·노트·내부·출근·모달·시작 흐름·입력(핀치/휠/키보드)·`bootSafe` |
| `assemble.py` → `template.html` → `build.py` → `index.html`(아티팩트용)·`dev.html`(로컬) | 생성물. 손으로 고치지 않는다 |
| `data/cell_data.json` | 굽기 산출(v8부터 `odir`). 정본 아님 |
| `tools/complexes.json` | 단지 사실·카드·게이트 **손입력 정본**(출처·사실분류 표기). 고치면 재굽기 |
| `tools/build_cell.py`, `tools/bake.sh`, `tools/overpass_query.ql`, `tools/elev_srtm*.json` | 굽기. `osm3.json`은 gitignore(로컬만) |
| `tests/run.mjs`, `tests/golden.json` | 검사 149건·골든값 |
| `stylelab/` | 캐릭터·건물·월드맵 각 10종 선택기(`src/`→`build_stylelab.py`) |
| `qa/` | v1~v8 캡처 |

## 2. 설계 계약 (고치기 전에)
1. **데이터 ≠ 연출**: 경로·시간은 원본 고도·타일 종류·등급·계단·일방통행으로 계산. 단 지형·나무·NPC·불빛은 연출. 수치에 영향 없음.
2. **그림체 `STYLE`**: `STYLE_DEFAULT={char:'pixelcrew', bld:'cottage', world:'sketch'}`, 해시 `#캐릭터-월드`(char pixelcrew|villager, world terrace|sketch|watermap), `hashchange`→reload, 서랍 단지 탭 선택기. 조합과 무관하게 수치 동일.
3. **계단 = `isStairs(i)` 한 곳**: steps 플래그이되 대로(등급 8+) 타일에 겹친 계단(4칸)은 예외. 유모차·자전거 불가, 도보 ×1.6.
4. **차 일방통행 = `moveAllowed(from,to,mode,dx,dy)`**: 출발·도착 타일의 `odir`(0=동·2=남·4=서·6=북, 홀수 대각) 벡터와 이동 벡터 내적 음수면 금지. 수직 이동 허용, 보행 수단 무관. **목표 타일 진입 예외는 `astar`의 호출부(`ni !== goal`)에 있고 `moveAllowed` 자체엔 없다**. 키보드 이동은 매 칸 호출(예외 없음).
5. **카드 `CARD_CATS`**: 도착 유형별 **허용 카테고리 집합**. 실제 선택은 `c.cards.find(...)`라 **단지 `cards` 배열에서 허용 집합에 들고 아직 안 본 첫 장** 순서다(하이베르 정문: slope→parking→construction, 왕십리자이: construction→parking, 라체르보: regulation→parking). 정문 허용 = parking·slope·construction·regulation, mid/high/kinder→school, conv→commerce, lib/gym→community.
6. **체크 키 `checkKey` = concept:complex:item**, 저장 `imjang-proto-v2`.
7. **데이터 문자열은 `esc()`로만 innerHTML에**. (Supabase 정정 데이터 대비)
8. **차 주차 +3분**은 `routeStats`(HUD)와 재생 타임라인(마지막 타일 3분 정지) 양쪽. 한쪽만 고치지 말 것. 비교표 차 행도 같은 `routeStats`를 쓴다.
8-1. **불빛 레이어는 지연 생성**(`buildLights`): `buildStatic`은 `S.night`가 아니면 `gl=null`로 돌고, 밤 첫 진입 때 1×1 더미 컨텍스트로 `drawBuilding`을 다시 돌려 불빛만 채운다. `drawBuilding`의 불빛 분기는 반드시 `if (gl && …)` 가드를 유지할 것.
9. **모달**: 초기 `hidden`, 첫 요소 포커스, Escape·배경 탭(시작 선택 전엔 불가), `bootSafe`가 부팅 실패 고지.
10. **ODbL 고지** 상시(광고줄·단지 탭). 공개 서비스 필수.
11. **골든값**: 현재 데이터·계산식의 회귀 기준이며 실측값이 아니다. 굽기·규칙 변경 시 전체 모드·거리·시간·방향 차이를 검토한다. 대표 유모차 값만으로 정상 판정하지 않는다. 기본 검사는 골든을 쓰지 않고 누락·손상·불완전한 기준을 실패로 처리한다. 의도한 변경만 `--update`하며 모든 규칙 검사가 성공한 뒤 파일을 쓴다.
12. **실기 미검증**: iOS Safari·Android Chrome은 에뮬레이션만. Safari 16.4 미만은 폴리필 덕에 부팅하나 실기 확인 전.

## 3. 오늘 바뀐 것 요약
- **v7(검수 반영)**: roundRect 폴리필(P0) · 계단 규칙(`isStairs`) · 차로 다른 단지 도착 시 주차 수치·체크가 도착 단지 기준 · 카드 매핑 확장(획득 불가 3장 해소) · 핀치 뒤 드래그 점프 방지, 핀치 중점·휠 커서 줌 · 굽기 산출 `data/`로 · 스타일 랩 프리셋 id · 빈 단지 가드 · 데스크톱 서랍이 액션 버튼 안 덮음 · `<meta charset>` · ODbL 고지 · 주차 3분 타임라인 · 사실 배지 색 · 카드 unknown→미확인·날짜 중복 제거 · 모달 접근성·확대 허용 · `#modal` 초기 hidden+부팅 실패 고지 · 상단 바 줄바꿈·가로 모드 · `esc()` · 저장 키 v2 · 새로고침 1회 · 자전거 휴리스틱 0.8 · 데드코드 정리. 문서: 가이드 줄번호→함수명, README·MASTER·카탈로그 정정, 로컬 경로 제거.
- **v8**: Overpass 재취득(2026-10-12T01:38Z, 5,146 요소) · 진짜 supercover(대각 도로 체인 제거, 도로 타일 3,381→3,584) · 일방통행 방향 `odir` · `moveAllowed` · `tests/run.mjs` 149건 · `tools/bake.sh`. 도보 기준구간 일부 1분 단축, 차 라체르보 출구→정문 5→6분(우회), 핵심 기준점 불변.
- **v9**: 차 모드 일방통행 화살표(`drawOnewayArrows`) · 비교표 차 행 + 시계 변경 시 `computeMetrics` 재계산 · 불빛 레이어 지연 생성(`buildLights`, 밤 첫 진입) · 하늘 그라데이션·라벨 폭 캐시. 수치 불변.
- **후속 검증 보강(`1ecd401`, Codex)**: 스타일랩 crop 동기화와 bake.sh 연결, 골든/방향 데이터 누락·손상 실패 처리, 전체 검사 성공 후에만 명시적 골든 갱신, 검증기 회귀11개. [상세](tests/README.md).
- 검수 원문(결함 25건·문서 결함·백로그)과 증거는 부모 저장소 `docs/analysis/APTHANIMO_CLAUDE_PROTO_REVIEW_2026-10-12.md`.

## 4. 재현 절차
각 명령은 저장소 루트에서 실행한다. 골든 갱신·네트워크 재취득은 기본 검사와 분리한다.

```sh
node prototype/tests/run.mjs
node --test prototype/tests/harness.test.mjs
python3 prototype/assemble.py
python3 prototype/build.py
python3 prototype/stylelab/build_stylelab.py
python3 -m http.server 8793 --bind 127.0.0.1 --directory prototype
```
규칙149개와 검증기 회귀11개가 기준이다. `bash prototype/tools/bake.sh`는 본편·스타일랩 빌드와 두 검사를 연결한다. 원자료가 없으면 다운로드하고 `--refresh`는 재취득한다. 문서 뷰어를 변경했을 때만 루트 `build_html.py`, `prototype/build_guide_html.py`를 실행한다.

브라우저 자동 검증은 현재 설치된 스킬의 API를 따른다. 문서 로드 전 오류 수집, 화면·터치 에뮬레이션, `window.__S`·`window.__style` 읽기를 사용할 수 있다. DOM click은 가림 진단용이며 실제 클릭/터치 통과 근거가 아니다. 저장값을 보존하고 자신이 만든 페이지·서버만 정리한다. 기준 흐름은 컨셉→단지→정문→체크→비교→노트→출근→내부→밤→차→단지 전환이다.

## 5. 함정
- `<meta charset>`은 file://에선 자동 판정이지만 python http.server 같은 헤더 없는 서버에선 없으면 전부 깨진다(v7에서 넣음).
- 해시를 바꾼 뒤 `location.reload()`까지 부르면 2회 새로고침(`hashchange`가 이미 reload).
- 25m 타일 합성: 계단이 대로에 겹치면 대로를 막게 되므로 `isStairs` 예외. 일방통행도 교차로 인접 타일에서 과한 우회 가능(라체르보 차 +1분).
- `complexes.json`을 고치고 재굽기하지 않으면 `tests` §5(정본↔산출 동기)가 실패한다.
- `build_cell.py`는 `tools/osm3.json`이 있어야 한다. 없으면 `bake.sh --refresh`.

## 6. 백로그 (이 레인)
1. 실기 iOS Safari·Android Chrome(폴리필·핀치·저메모리).
2. 일방통행 교차로 인접 타일 관대화 재검토(25m 합성으로 과한 우회). OCC 가림 목록 이진탐색(남은 프레임당 비용).
3. 비교표·점수에 차 지표를 점수(`scoreFor`)에도 반영할지 결정(지금은 표만).
6. 스타일 랩 나머지 id 본편 이식.
7. 셀 추가: `complexes.json` 사실 + `overpass_query.ql` bbox + `build_cell.py` 범위·`STATIONS` → `bake.sh` → tests `--update`. 후보는 루트 카탈로그.
8. 5m DEM·학구도·승강시설 데이터, K-apt 조인. Next.js 이식(기획서 §11)은 사용자 결정 후.

## 7. 인수 문구
```text
aptHanimo의 prototype/(Claude 레인)을 이어서 작업한다. ../AI_HANDOFF.md 로 범위를 확인하고 이 문서와 PROTOTYPE_NOTES.md 머리말 v7~v9·검증기 후속을 읽어라.
수정 범위는 최신 사용자 지시·병행 담당 경로로 정하고 다른 작업의 dirty를 보존한다. 규칙149개와 검증기 회귀11개부터 확인한다.
src/ 만 고치고 assemble.py→build.py 로 재생성한 뒤 브라우저(서버로 띄워서)에서 기준 흐름을 실측해라.
수치 기준점(정문 유모차 11분·496m, 비교표 유모차 11/19/8분)이 바뀌면 원인을 먼저 설명하고 의도한 변화만 --update 해라.
커밋은 경로 지정 add, pull --ff-only 후 push. 결과·한계·증거·SHA를 PROTOTYPE_NOTES 머리말과 부모 보고에 남겨라.
```
