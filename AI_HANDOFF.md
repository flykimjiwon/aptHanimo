# aptHanimo · AI 인계 (두 레인 합본) — 2026-10-12

> 최신 Codex: [귀여운 3D 컨셉 선택](codex/docs/3D_CONCEPTS_2026-10-12.md). 본편에 그림 카드7·회전/걸음 미리보기·입체 표정/손/봉제 귀·신규 원근3D 기본값을 적용했다. 현재99테스트/3,421 assertions/20파일, 스타일 모달 화면6조건·axe0위반·자원 해제 검증. 병행 Claude V11 `635bc7c`의 `prototype/stylelab3d/`는 별도 실험실이며 아래 V9/V10 요약보다 최신이다. 수첩과 단지 데이터보다 사용성·귀여운3D·여러 풍이 사용자의 이번 최우선이다.

> 최신 Codex 추가: [수첩 이어가기](codex/docs/NOTEBOOK_2026-10-12.md) — 검색·단지 필터·기록 수정·저장 장소 지도 선택·저장 보호. Codex 현재95테스트/3,362 assertions/19파일, 화면6조건. 아래81테스트·이동 QA는 이전 수정 시점 기준이다. 통합 백로그의 수첩 재방문은 완료, 단지 비교·동기화는 남음. 병행 Claude 세션은 V10 `47401dd`(정정 요청 링크·노트 이미지·가림 이진탐색)까지 진행했으며 아래 V9 요약보다 최신이다.

> 이 저장소를 처음 여는 AI와 사람을 위한 **최상위 입구**다. 한 저장소에 서로 다른 AI 두 레인의 산출물이 동거한다. 레인별 상세 인계는 각 레인 문서가 정본이고, 이 문서는 둘을 한 장으로 묶어 **공통 지도·경계·상태·백로그**를 준다.
> 병행 세션 반영 기준: `5c67025`(Claude v9, 2026-10-12 KST). 이후 생성물·검증기 보강도 아래에 기록했다. 다음 세션은 `git log --oneline -8`과 `git ls-remote origin refs/heads/main`으로 실제 HEAD를 다시 확인한다. 환경별 운영·전체 증거는 개인 메타의 [통합 인계](https://github.com/flykimjiwon/kimjiwon/blob/main/docs/prompts/APTHANIMO_UNIFIED_HANDOFF_2026-10-12.md)를 따른다(접근 권한 필요).

| 레인 | 경로 | 정본 인계 문서 | 작성 AI |
|---|---|---|---|
| **Codex 레인 · 한바퀴 V5** | `codex/` | [`codex/docs/AI_HANDOFF_2026-10-12.md`](codex/docs/AI_HANDOFF_2026-10-12.md) | Codex |
| **Claude 레인 · 프로토타입 v9** | `prototype/` + 루트 기획서·카탈로그 | [`prototype/AI_HANDOFF_2026-10-12.md`](prototype/AI_HANDOFF_2026-10-12.md) | Claude Code, 검증기·생성물 후속은 Codex |

---

## 1. 한눈에: 두 레인은 무엇이 다른가

| 항목 | Codex `codex/` | Claude `prototype/` |
|---|---|---|
| 목적 | 실제 좌표 위를 **자유 산책**하는 3D 월드(세 단지 각각 1.3km 정사각) | 세 단지를 한 **클러스터 셀**(99×58 타일, 25m)로 굽고 **실제 환산 이동 시간·이슈 카드·임장 노트·비교·출근 레그**까지 끝까지 돌아가는 2.5D 체험판 |
| 스택 | TypeScript·Vite·Three.js·Bun·Zod, `bun start`(HTTP+`/presence` WebSocket) | 빌드 없는 단일 HTML, Canvas 2D, Python 표준 라이브러리 굽기, node 테스트. 외부 스크립트 0(폰트만 Google Fonts) |
| 공간 데이터 | `public/worlds/*.json`(코어 동 외곽선·OSM·DEM), DEM은 **Mapzen/Tilezen Terrarium 타일** 재표본(코드 `scripts/collect-spatial.mjs` 기준; 옛 문서의 "OpenTopoData"는 오기) | `data/cell_data.json`(OSM Overpass 2026-10-12 추출 + **OpenTopoData SRTM 30m** 저장본 + 손입력 단지 사실 `tools/complexes.json`) |
| 이동 규칙 | 2m 격자 A*·차량 탐색점 도로 투영·선분 충돌 검사. 경로 메타 `stairs`·`slope`는 아직 0, 일방통행 필드 없음 | 타일 A*·수단별 속도·경사 계수·계단(`isStairs`)·횡단·**일방통행 방향 `odir`+`moveAllowed`**(v8) |
| 검증 | Bun 81 테스트(3,282 assertions, 18파일) · 엔진 80경로 · 브라우저 차량 17목적지 · 화면 8조건 · axe | `node prototype/tests/run.mjs` 149 검사(골든값 `tests/golden.json`) · Ego 브라우저 6조합·데스크톱·모바일 세로/가로 |
| 상태 | F1~F5 수정·검증 완료(`b0082aa`·`e5c1767`·`ed3a1ca`), 공개 배포·실기 미검증 | v9(`5c67025`) + 스타일랩 동기화·검증기 회귀11개 보강. 실기 미검증 |
| 그림체 | 캐릭터 10·건물 11·지도 11·시점 3, 프리셋 7, URL/저장 | `STYLE` 해시 `#캐릭터-월드`(pixelcrew\|villager × terrace\|sketch\|watermap), 스타일 랩 10×10×10 |

두 레인의 **기능 수·테스트 수·검증 수치를 합산하지 않는다.** 코드·데이터 파이프라인도 섞지 않는다. 같은 단지 세 곳(래미안신당하이베르·왕십리자이·라체르보푸르지오써밋)을 다루지만 좌표계·데이터 계약이 다르다.

---

## 2. 저장소 지도

```
aptHanimo/
├─ AI_HANDOFF.md                      ← 이 문서(입구)
├─ README.md                          저장소 소개·실행·문서 표
├─ IMJANG_WORLD_MASTER_2026-10-11.md  통합 기획서 v1.2(결정 D-01~22·요구사항·티켓) → index.html(build_html.py)
├─ IMJANG_WORLD_PRD_2026-10-11.md, sources/   초안·외부 기획서(이력)
├─ SEOUL_25GU_COMPLEX_CATALOG_2026-10-11.md   25구 219단지 후보([검증]=K-apt 확인 전)
├─ prototype/                         Claude 레인
│  ├─ AI_HANDOFF_2026-10-12.md        레인 인계 정본
│  ├─ PROTOTYPE_NOTES.md              제작 노트(머리말 v1~v8 변경 요약, §7-1 검증 로그)
│  ├─ CODEX_PROTOTYPE_GUIDE_2026-10-11.md  구조 가이드(데이터 계약·이동 규칙·DOM 계약·가져갈 것/금지) — 이름과 달리 prototype/ 안내
│  ├─ src/ (정본 7조각) → assemble.py → template.html → build.py → index.html·dev.html
│  ├─ data/cell_data.json (굽기 산출), tools/(build_cell.py·bake.sh·overpass_query.ql·complexes.json·elev_srtm*.json)
│  ├─ tests/run.mjs·golden.json, stylelab/(2D 10×10×10), stylelab3d/(three.js 캐릭터 6×월드 5×시점 4), qa/(v1~v11 캡처)
└─ codex/                             Codex 레인
   ├─ docs/AI_HANDOFF_2026-10-12.md   레인 인계 정본
   ├─ README.md, DESIGN.md, docs/Claude_V5_전체월드스타일_구현가이드.md
   ├─ src/(controller·scene/·spatial/·world-style…), server.ts, public/(worlds·context·data·brands)
   ├─ qa/v5/(QA.md·repair-2026-10-12.md·code-review…), research/(spatial·brands·data), scripts/
```

부모(메타) 저장소 `flykimjiwon/kimjiwon`에는 두 레인의 검수·수정 보고와 증거(PNG/JSON), 그리고 세션 상세·통합 인계(`docs/prompts/APTHANIMO_*HANDOFF*`·`APTHANIMO_CLAUDE_SESSION_GUIDE_*`, 로컬 경로 포함)가 있다. 이 문서(공개 저장소)가 입구이고 그쪽이 상세다. `docs/analysis/`에: `APTHANIMO_CLAUDE_PROTO_REVIEW_2026-10-12.md`, `APTHANIMO_CODEX_REVIEW_2026-10-12/`, `APTHANIMO_CODEX_FIX_2026-10-12/`, `APTHANIMO_CODEX_AI_HANDOFF_2026-10-12.md`, 그리고 `docs/prompts/APTHANIMO_CLAUDE_SESSION_GUIDE_2026-10-12.md`(Claude 세션 상세, 로컬 경로 포함).

---

## 3. 커밋 타임라인 (main, KST)

| 커밋 | 레인 | 내용 |
|---|---|---|
| `055d06c` 10-12 00:17 | Claude | 기획서·프로토 v6·스타일 랩·25구 카탈로그 첫 커밋 |
| `64e2b49` 00:29 | Codex | 한바퀴 V5 자유 산책 월드 추가 |
| `1ff68d5` 00:30 | Codex | V5 제작 가이드·출처·검증 기록 |
| `f7da8c1` 오전 | Claude | **v7** 검수 반영: roundRect 폴리필(P0)·계단 규칙·카드 매핑·주차 타임라인·charset·ODbL 고지 등 |
| `bd240cc` 낮 | Claude | **v8** OSM 재굽기(진짜 supercover·일방통행 `odir`)·차 역주행 금지·테스트 149건·`tools/bake.sh` |
| `b0082aa` | Codex | F1·F2 차량 경로 완주·도착 상태 갱신 |
| `e5c1767` | Codex | F3·F4·F5 모바일 조작부·순간이동 취소·로딩 재시도 |
| `ed3a1ca` | Codex | 후속 테스트·브라우저 검증 기록 |
| `04b2e2e` | Codex | V5 작업 이력·AI 인계 가이드 |
| `c73d9c5` | Claude | 공개 저장소 합본·prototype 인계 |
| `5c67025` | Claude | V9 화살표·비교표 차 행·불빛 지연 생성·캐시 |
| `1ecd401` | Codex 후속 | 스타일랩 생성물 동기화·재굽기 연결·검증기 실패 처리·회귀11개 |

---

## 4. 실행·검사 명령 (레인별)

각 명령은 저장소 루트에서 실행한다. 생성물·검증기 후속은 [테스트 안내](prototype/tests/README.md)를 따른다. 기본 테스트는 골든을 쓰지 않으며 누락·손상·필수 방향 자료 오류를 실패로 처리한다. `--update`는 전체 차이를 검토한 뒤 별도로 실행하고 모든 규칙 검사가 성공해야 파일을 쓴다.

```sh
# Codex 레인
(cd codex && bun install --frozen-lockfile && bun test && bun run build && bun run lint)
(cd codex && bun start)
```

```sh
# Claude 레인
node prototype/tests/run.mjs
node --test prototype/tests/harness.test.mjs
python3 prototype/assemble.py
python3 prototype/build.py
python3 prototype/stylelab/build_stylelab.py
python3 -m http.server 8793 --bind 127.0.0.1 --directory prototype
```

서버는 각 전용 터미널에서 실행하고 자신이 띄운 프로세스만 Ctrl-C로 종료한다. Codex는 `http://localhost:5178/`, Claude는 `http://127.0.0.1:8793/dev.html`이다. `bash prototype/tools/bake.sh`는 셀→본편·스타일랩→두 검사를 실행한다. 원자료가 없으면 다운로드하며, 명시적 `--refresh`는 원자료를 갱신하므로 기본 검사와 분리한다.

---

## 5. 공통 작업 경계 (두 레인 모두)
1. 최신 사용자 지시와 병행 작업의 경로 소유권으로 수정 범위를 정한다. 저자 이름은 영구 수정 권한이 아니다. 다른 세션의 dirty는 보존한다.
2. 커밋은 경로·hunk 단위로 선별한다. `git add -A`·`git add .`·force push·hard reset·타인 dirty 제거 금지. dirty·staged·원격 차이를 확인하고 fast-forward 가능한 상태에서만 `git pull --ff-only origin main`을 실행한다.
3. 생성물(Claude: `prototype/template.html`·본편/스타일랩 HTML·셀 JSON / Codex: `dist/`)은 정본에서 재생성한다. 루트 `template.html`은 문서 뷰어 원본이므로 구분한다.
4. 좌표·DEM·도로 폭·충돌 반경·경사 규칙을 화면 효과나 테스트 통과를 위해 임의로 바꾸지 않는다. 데이터 변경은 출처·이유를 기록한다.
5. 실제 단지에 확인되지 않은 균열·해충·하자·평판을 사실로 넣지 않는다(기획서 P5·P6, D-12·D-13). 커뮤니티·지하주차장은 구조 예시다.
6. 출처 고지 유지: OSM © OpenStreetMap contributors(ODbL), DEM 출처(레인별 상이), 사진·브랜드 원장, PixelCrew 스프라이트(작성자 본인 MIT, 원문 수정 0).
7. 공개 저장소다. 절대 홈경로·회사 식별자·키·개인정보 금지. 로컬 전용 자료(`prototype/tools/osm3.json`, 사진 원본, 지도 캡처)는 gitignore 또는 미포함.
8. 결과는 레인 문서(제품) → 부모 저장소 보고·색인 순으로 기록하고 커밋 SHA를 남긴다.

---

## 6. 레인 간 차용 후보 (코드를 섞지 말고 규칙·데이터만)

| 방향 | 후보 | 근거 |
|---|---|---|
| Claude → Codex | 계단·일방통행 규칙: `prototype/src/04_route.js`의 `isStairs`·`moveAllowed`, 굽기의 `odir`(진행 방향 0..7) | Codex 경로 메타 `stairs`·`slope`가 0이고 일방통행 필드가 없음(Codex 인계 §9-2 "실제 출입구·통행 데이터") |
| Claude → Codex | 골든값 테스트 방식(`tests/golden.json`, 의도한 변화만 `--update`)과 데이터 무결성 검증기(복합키 집합·게이트 도달·정본↔산출 동기) | Codex 인계 §9-1 "브라우저 회귀 자동화·CI" |
| Claude → Codex | **3D 캐릭터·월드 풍 규격**: `prototype/stylelab3d/`(three.js)에서 고른 조합 JSON(2등신 비율·귀 4종·눈/볼·inverted-hull 윤곽·toon 3단·재질 세트 5·걷기 수치)을 `solid-person.ts`·`building-style.ts`·`map-style.ts` 파라미터로 | 사용자 1순위 "three.js 3D 귀여운 캐릭터·여러 풍". 이식법 `prototype/stylelab3d/STYLE_LAB_3D_2026-10-12.md` §6 |
| Claude → Codex | 단지 사실·이슈 카드의 **출처 등급 계약**(`tools/complexes.json`: A/A-est/B/C/X/F, 6분류 cls) | Codex 단지 비교·수첩 재방문(§9-4)에 사실 표기 기준 필요 |
| Codex → Claude | 실제 입구·접근 가능한 인근 길 완료 구분(`arrived`/`complete`/`blocked`), 차량 선분 충돌 검사 개념 | 프로토는 25m 타일이라 출입구가 타일 단위. 셀 해상도 올릴 때 참고 |
| Codex → Claude | 실제 WebSocket 접속자(`/presence`) 구조 | 프로토의 NPC는 연출뿐(기획서 §9 Colyseus 몫) |
| 양쪽 | DEM 출처 표기 통일: Codex=Terrarium 타일, Claude=OpenTopoData SRTM. 문서에 "SRTM 30m 원자료" 수준만 공통으로 말한다 | Codex 옛 가이드의 제공자 오기 |

---

## 7. 통합 백로그 (우선순위, 레인 태그)
1. [양쪽] **실기 iOS Safari·Android Chrome** 검증. 둘 다 에뮬레이션까지만.
2. [Codex] 브라우저 회귀 자동화·CI(깨끗한 checkout에서 설치·빌드·3단지 흐름·4화면 재현).
3. [Codex] 실제 출입구·통행 데이터(계단·경사·차량 방향) — Claude 규칙 차용 후보.
4. [완료] Claude v9의 불빛 지연 생성·시계→비교표·화살표·캐시, 후속 스타일랩 재생성·재굽기 연결·검증기 보강. OCC 등 남은 성능 항목은 레인 가이드 참조.
5. [Claude] 셀 추가(`complexes.json`+bbox→`bake.sh`→`--update`), 스타일 랩 나머지 id 이식.
6. [Codex] 단지 비교·수첩 재방문, 계정·동기화·초대, 데이터 갱신 재현성.
7. [양쪽·결정 필요] 양산 방향: 기획서 §11은 Phaser+React+Supabase, 사용자 스택은 Next.js(JS)·Supabase·Python. 어느 레인을 양산 기반으로 삼을지는 사용자 결정(두 인계 문서 모두 "프레임워크 교체는 별도 목표가 생겼을 때").

---

## 8. 다음 세션에 붙여넣을 인수 문구

```text
[공통] aptHanimo를 이어서 작업한다. AI_HANDOFF.md(이 문서)로 두 레인을 구분한 뒤 맡은 레인의 정본 인계만 깊이 읽어라.
git status·원격 HEAD를 새로 확인하고 상대 레인의 변경은 보존해라. 두 레인의 기능·테스트 수치를 합치지 마라.
dirty·staged·원격 차이를 확인해 fast-forward 동기화하고 경로·hunk 단위로 커밋해라. 결과·한계·증거·SHA를 레인 문서와 부모 보고에 남겨라.

[Codex 레인] codex/docs/AI_HANDOFF_2026-10-12.md 를 읽어라. F1~F5는 b0082aa/e5c1767, 검증 기록 ed3a1ca.
기준 검증 = Bun 81테스트·엔진 80경로·브라우저 차량 17목적지·레이아웃 8조건(새 변경엔 재실행).

[Claude 레인] prototype/AI_HANDOFF_2026-10-12.md 를 읽어라. v9=5c67025, 후속 검증기=1ecd401.
규칙149개와 검증기 회귀11개가 먼저. 정문 유모차 11분·496m, 비교표11/19/8분은 현재 데이터의 회귀 기준이다.
src/ 만 고치고 assemble.py→build.py 로 재생성, 브라우저 실측 후 커밋.
```
