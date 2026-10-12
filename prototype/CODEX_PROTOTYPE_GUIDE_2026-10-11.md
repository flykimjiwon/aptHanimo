# 임장월드 프로토타입(미리보기) 구조 가이드 — Codex 참고용

> 작성 2026-10-11 저녁, v6 갱신 10-12 새벽 · Claude Code (Fable 5.1). 대상 = `docs/analysis/imjang_world_2026-10-11/prototype/` (**v6 = 기본 조합 픽셀크루 × 코티지 × 연필 스케치**, 아티팩트 v8 https://claude.ai/artifact/QgdaSDY7SDJc18LU3Qxwsu). 그림체는 `src/02_world.js` 맨 위 `STYLE_DEFAULT`(char: pixelcrew|villager, world: terrace|sketch|watermap)로 정하고, **주소 해시**(`#villager-watermap`처럼 캐릭터-월드 id)나 서랍 단지 탭의 그림체 선택기로 재조립 없이 바꿀 수 있다(해시가 바뀌면 자동 새로고침). 이전 완성본은 `template_v3_pixelcrew_backup.html`(v3)·`template_v4_villager_backup.html`(v4). 저장소: https://github.com/flykimjiwon/aptHanimo (공개, `imjang_world_2026-10-11/` 폴더가 루트).
> 이 문서는 **"이 미리보기가 어떻게 짜여 있는가"**를 Codex가 코드 없이 10분 안에 파악하도록 쓴 것이다. 제품 요구·결정은 `../IMJANG_WORLD_MASTER_2026-10-11.md`(정본), 제작 경위·출처·검증은 `PROTOTYPE_NOTES.md`에 있다. 셋이 충돌하면 **마스터 > 이 가이드 > 노트** 순으로 읽는다.
> 읽는 순서: §0(5가지) → §0-1(v2에서 바뀐 것) → §0-2(원 브리프 대조표) → §3·§5(계약·규칙) → §9(가져갈 것/금지) → §13(병합 제안). 나머지는 필요할 때.

## 0. Codex가 먼저 알아야 할 5가지
1. **빌드 없는 단일 HTML**이다. 정본은 `src/` 7조각(CSS+DOM 1, JS 5, vendor 1 = 픽셀크루 엔진 원문) → `python3 assemble.py` → `template.html` → `python3 build.py`(+ `data/cell_data.json` 544KB) → `index.html`(아티팩트용, doctype 없음) / `dev.html`(로컬용, doctype 있음). 외부 스크립트 0, 폰트만 Google Fonts(Jua·Noto Sans KR). 의존성 설치 없음.
2. **데이터와 연출을 분리**했다. 경로·시간은 원본 고도 `E[]`와 타일 종류로 계산하고, 그림은 8m 단 지형·나무·NPC 같은 **연출 레이어**를 따로 얹는다. Codex가 가져갈 것은 §3 데이터 계약과 §5 이동 규칙이고, 가져가면 안 되는 것은 §9에 적었다.
3. **셀 1개 = 타일 99×58(25m)**, 세 단지(래미안신당하이베르 HYBER · 왕십리자이 WJAI · 라체르보푸르지오써밋 LACERVO)가 한 월드에 있는 **클러스터 셀**이다(마스터 D-01·WLD003의 1차 사례).
4. **코덱스 빌드(저장소 `codex/`, Three.js 저폴리곤 디오라마·체험 그래프)와 겹치지 않는다.** 이쪽은 Canvas 2D + 실제 OSM/SRTM 격자 + 타일 A*. 두 결과물은 서로 참고만 하고 코드를 섞지 않는다.
5. **그림체는 `STYLE`로 고른다**(`src/02_world.js` 맨 위 `STYLE_DEFAULT` + 주소 해시 덮어쓰기, 스타일 랩 '선택 조합 복사' JSON의 id와 같다). 캐릭터 `char`: `pixelcrew`(사용자 본인 프로젝트 PixelCrew Desk의 24×22 도트 유령, `src/vendor/pixelcrew_sprites.js` 원문·MIT) 또는 `villager`(동물 귀 주민, 코드 드로잉). 월드 `world`: `terrace`(8m 단 지형, 아이소), `sketch`(연필 스케치, 아이소), `watermap`(수채 지도, **탑뷰** — 투영·입력·정적 레이어가 바뀌고 고도·절벽·건물 높이는 그리지 않음). 건물은 `cottage`(박공·처마·굴뚝·창틀, 탑뷰에선 평면 워시) 하나다. 기본 조합 = pixelcrew × cottage × sketch. 주소 끝에 `#villager-watermap`처럼 붙이거나 서랍 단지 탭의 그림체 선택기를 쓰면 새로고침과 함께 바뀐다. 어느 조합이든 경로·카드·수치는 같다(§12).
6. 2026-10-12 사용자 지시로 GitHub `flykimjiwon/aptHanimo`(공개)에 커밋·푸시했다(`imjang_world_2026-10-11/` 폴더 = 저장소 루트, 메타 repo 안의 서브 repo). 이후 커밋·푸시도 사용자가 시킬 때만. 같은 저장소의 `codex/`는 Codex 독립 구현(한바퀴 V5)이며 이 가이드가 말하는 "코덱스 빌드"가 그것이다.
7. **v7(10-12 오전, 검수 반영)**: 줄번호 대신 **파일·함수 이름**으로 가리킨다(소스가 v4~v6에서 많이 자라 줄번호가 최대 400행 틀어졌었다). 계단 판정은 `isStairs()`(04_route.js) 하나로 통일, 카드 매핑은 `CARD_CATS`(05_dynamic.js), 데이터 문자열은 `esc()`로 넣는다. 변경 목록은 `PROTOTYPE_NOTES.md` 머리말 v7.

## 0-1. v2~v6에서 바뀐 것 — 사용자 피드백 "자유분방하고 귀엽거나 동물의숲 느낌이 없다"에 대한 대응
v1(`template_v1_backup.html`)은 OSM 폴리곤 1,768개를 회색 상자로, 도로 타일 59%를 회색 면으로 그려 실측 덤프처럼 보였다. v2는 **기능·수치를 손대지 않고 연출만** 아래처럼 바꿨다(아티팩트 v4, 같은 URL).

| 바꾼 것 | 요지 | 위치 |
|---|---|---|
| 계단식 언덕 | 실제 고도를 **8m 단으로 양자화**해 절벽·경사로로 그린다. **경로 시간은 양자화 전 고도**로 계산하므로 v1과 수치 동일 | `TIERZ·CZ·surfZ`(02_world.js), §6-1 |
| 길 정리 | 골목·보도는 폭 좁은 띠로 자동 타일링, 대로만 전면 포장 → 회색 면이 대부분이던 화면에서 잔디가 드러나는 마을로 | `drawTile`(03_static.js) |
| 연필 스케치 월드(v5) | `STYLE.world='sketch'`: 종이 팔레트로 `C`를 덮어쓰고, 길은 띠 대신 잉크 두 줄(보도 한 줄, 끝점 ±0.5px 지터), 대로 포장·연석·중앙선·흰 횡단보도 없음(횡단보도는 엷은 줄무늬), 절벽 해칭 4줄, 타일 윗면 격자선, 풀 포기 없음, 나무는 번짐 블롭, 정적 캔버스 전체에 종이 결 점, 하늘은 종이색(저녁은 살짝 따뜻하게). 밤은 공통(틴트+불빛). 건물은 코티지 그대로(스타일 랩 조합 미리보기와 같음) | `SK`, `drawTile·drawTree·buildStatic`, `draw` 하늘 |
| 수채 지도 월드(v6, 탑뷰) | `STYLE.world='watermap'`: `proj`가 `[x·28, y·28]` 정사각 타일(고도 무시), `pickTile`은 나눗셈, 정적 레이어는 종이 결 → 타일마다 번진 블롭(공원·학교·땅 색, 길 타일은 종이) → 손그림 길(이웃 연결선·지터·굵기 3단, 계단 잉크 줄·횡단보도 흰 줄) → 평면 건물(단지색 또는 베이지 워시 .65 + 잉크 윤곽, 동 라벨 흰 테두리 글자) → 위에서 본 번짐 나무. 캐릭터는 측면 스프라이트를 타일 중심보다 0.3타일 아래에(RPG 관습), 가림 목록 없음, 밤은 틴트 + 아파트 중심 은은한 불빛 + 가로등 | `TOP·TT`, `proj·pickTile`, `drawTile·drawBuilding·drawTree·buildStatic` 탑뷰 분기 |
| 그림체 전환(v6) | `STYLE_DEFAULT` + 주소 해시 덮어쓰기(`#캐릭터-월드`), `hashchange`면 자동 새로고침, 서랍 단지 탭의 캐릭터·월드 선택기 + 적용 버튼 | `STYLE`(02_world.js), `renderDrawer` |
| 건물 | 창고급 폴리곤 제거, 보이는 면만, **v4 코티지**: 두꺼운 갈색 윤곽(1.4px), 4각 건물은 긴 변 방향 **박공 지붕**(박공벽·처마 1.5px·용마루), 그 외는 모임지붕, 집은 굴뚝·십자살 창·문·상점 줄무늬 차양, 아파트는 층마다 창틀 창 + 단지색 지붕(동 라벨은 용마루 위). **구축 금은 20년+ 테마에만**(마스터 D-12) | `CT·bldStyle·drawBuilding`(03_static.js) |
| 나무·꽃·캐릭터 | 나무·꽃(연출 배치; 단 지형은 둥근 2톤+풀 포기, 스케치는 번짐 블롭), 캐릭터는 `STYLE.char`: **픽셀크루 도트 유령**(v3·v5: 1인=픽셀 · 커플=픽셀+루마 · 가족=비트+닷, 유모차엔 닷 탑승) 또는 **동숲풍 주민**(v4: 나비 · 나비+토토 · 곰돌+콩알). 한 배역이 두 스타일 값을 다 가진다. 탈것(유모차·자전거·차)은 프로토가 그리고 캐릭터를 얹음, 건물 뒤로 지나갈 때 가림, 밤 창문 불빛 | `PROPS`, `ghostCanvas·drawGhost` / `SPECIES·drawVillager`, `CAST·drawActor·drawParty·drawActorOccluded`, `lightsCv` |
| 주민 NPC 10명 | 골목·보도만 걷는 **연출**(픽셀크루면 나머지 크루 9종, 주민이면 종족 10: 강아지·개구리·여우·판다·생쥐·사슴·코알라·토끼·고양이·곰). 서 있는 3명은 think/idle/happy. "실제 이용자 아님"을 단지 탭·길잡이 문구로 명시 | `NPC_CAST·spawnNpcs·tickNpcs·drawActor` |
| 길잡이 픽셀/보리 | 마스코트(픽셀크루면 픽셀, 주민이면 강아지 보리; talk→happy) 대화창이 출발·도착·카드 획득·경로 없음을 안내, 사소한 이벤트는 토스트. 첫 화면 라인업(크루 9명 / 길잡이+배역 4+주민 8) | `GUIDE·say()·dlgAnimate·faceDraw`, `#dialog`, `openConceptPicker` |
| 크림 수첩 UI | 좌상단 잎사귀 명패, 우상단 둥근 버튼+미니맵, 하단 이동수단 독, 우측 둥근 액션, 다크 토큰은 갈색 종이 | CSS(01_head.html) |

바뀌지 않은 것: 타일 25m·99×58, `cell_data.json` 스키마, A*·수단 비용·경사 규칙, 카드·체크리스트·노트·비교·출근 레그·내부·광고 슬롯·전면 광고, DOM id. 멀티플레이 실접속은 여전히 마스터 §9(Colyseus) 몫이라 이 프로토는 NPC 연출까지만이다.

## 0-2. 원 브리프 대조표 — 사용자가 적은 요구가 어디에 있나
사용자 원문 순서대로. "프로토"는 이 폴더, "코덱스"는 저장소 `codex/`, "마스터"는 통합 기획서 절·티켓.

| # | 사용자 요구 | 프로토(이 폴더) | 코덱스 빌드 | 마스터 |
|---|---|---|---|---|
| 1 | 서울 모든 구 기준 대표 단지 | 3단지 1셀만. 후보는 `../SEOUL_25GU_COMPLEX_CATALOG_2026-10-11.md`(219단지·[검증] 145) | 서울시 OA-15818 공식 레코드 2,893건 도감(구 필터·검색) | §14 후보표, T28 25셀 |
| 2 | 월드맵처럼 직접 걸어 다님 | 타일 A* 탭 이동 + 방향키/WASD + 22배속 재생(§5·§7) | 체험 그래프 노드 이동(방향 패드·라벨) | §4-1 핵심 루프, T05·T06 |
| 3 | 구축은 살짝 금 가고 귀엽게 | `theme:'old'`(20년+)만 금 1줄. 현재 3단지는 new/mid라 없음 | DESIGN.md "invented cracks 금지" | D-12 준공연도 연출만, ART002 |
| 4 | 신축은 커뮤니티·지하 | `openInterior` 3단계 배지(실제/개념/미확인), 주차 12칸 모형, 커뮤니티 닫힌 문 | 커뮤니티·지하주차장 실내 씬 2종(구조 예시 라벨) | §6-3·§6-4, INT001·002 |
| 5 | 언덕 | SRTM 고도 → 경사 계수(§5) + 8m 단 연출(§6-1), 카드 IC-HYB-01 | 평면 디오라마 + 엣지 `slope` 값 | §5-3 경사 등급, T12 |
| 6 | 초중고·마트·지하철 | OSM POI 144·출구 44·역 5, 목적지 탭 분류, 배정초는 호갱노노 통학구역 사실 | 장소 9곳(출처 표기 거리) | §5-4 POI, POI001·002 |
| 7 | 1인·커플·가족 컨셉 | `CONCEPTS` 가중치·`CHECKLISTS`·아바타 구성·출근 레그 2직장 | 혼자서/둘이서/가족과 동행 캐릭터 | §3-1·§3-2, SOC001 |
| 8 | 월드에서 사람들끼리 만남 | **미구현**(NPC는 연출) | `/presence` WebSocket으로 다른 브라우저 접속자 표시 — **코덱스가 앞섬** | §9 Colyseus, T25·T26 |
| 9 | 유모차·차·자전거·도보 실제 조건 | §5 규칙: 계단 차단, 유모차·자전거 15%+ 불가, 대로 횡단 +30초, 차 러시아워 ×0.5·신호·주차 +3분 | 속도 4종, 계단 제외, 차는 도로 엣지만 | §7-1·§7-2, MOV001~007 |
| 10 | 단지별 정보(호갱노노·커뮤니티, Aside 수동) | `complexes.json` facts·cards 등급제, 수동 열람 요약, 원문 인용 0, C 비렌더링 | `src/complexes.ts` + 출처 다이얼로그, 조사기록 문서 | §8 사실 6분류, D-17·D-19, T15·T23 |
| 11 | 최근 이슈(이문회기 2차선, 바퀴벌레 등) | 이 셀엔 해당 없음. 카드 cat `construction`(신당 8·10구역)·`regulation`(라체르보 준공 지연) | 커뮤니티 언급은 "report" 라벨 | §8-2 택소노미, D-13 벌레류 비렌더링, DAT004 |
| 12 | 광고로 유지 | DOM 배너 + 모의 전면(10분 캡·3초 스킵), 정보는 광고 뒤에 잠기지 않음 | 사이드 스폰서 카드 + 월드 AD 라벨(데모) | §10, D-21, T07·T27 |
| 13 | 단지 중심 셀 또는 구별 | 클러스터 셀 1개(3단지가 한 월드). 구 로비 없음 | 단지 3개 선택, 구별 도감 | D-01, §5-1·§5-2 |
| 14 | 웹·모바일 모두 | 반응형 2분기(900px), 터치·핀치·키보드, 390px 가로 넘침 0 | 375/768/1280 검증, axe 0건 | §11-1, MOB001 |
| 15 | 기술 스택(Next.js·Supabase·Python 익숙) | 의존성 0 단일 HTML. 이식표는 노트 §3 | Vite+TS+Three.js+Bun | §11 스택, D-05~D-08 |
| 16 | 코덱스보다 정돈·귀여움·동물의숲 | v2 §0-1 | 저폴리곤 디오라마·아이보리 UI(사용자가 더 낫다고 평가) | §13 아트 가이드 |
| 17 | 픽셀크루 캐릭터 스타일 참고 → 스타일 랩 10×10×10에서 세트 선택 | v3: `sprites.js` 원문 vendoring → v4: 동숲풍 세트(주민×코티지×단 지형) 이식 → v5: 두 번째 선택 픽셀크루×코티지×연필 스케치(기본값) → v6: 수채 지도(탑뷰)도 `STYLE.world`에 추가, 해시·서랍 선택기로 전환(§6-3) | 미반영(캡슐+구 3D 아바타) | §13 캐릭터 규격, T09 후보 |

## 1. 폴더 한눈에
```
prototype/
├─ src/                          # 정본(순서 고정). assemble.py 가 이 순서로 이어 붙인다
│  ├─ 01_head.html               # <title>·CSS 토큰·DOM(명패·독·HUD·대화창·서랍·광고·모달)·오류 수집기·IIFE 시작
│  ├─ 02_world.js                # STYLE(기본값+주소 해시, 해시 변경 시 자동 새로고침)·TOP/TT 탑뷰 투영·데이터·상수·상태·해시·8m 단 지형(TIERZ·CZ·surfZ)·투영·팔레트(스케치·수채면 덮어쓰기)·소품 계획
│  ├─ 03_static.js               # 정적 레이어: 타일·절벽·길 자동 타일링·나무·꽃·건물·불빛·구역 라벨·가림 목록 (+ 스케치·수채 탑뷰 분기)
│  ├─ 04_route.js                # 목적지 목록·A*·수단 비용·경사·routeStats + PixelCrew 크루 명부(self.PixelCrewRoster)
│  ├─ vendor/pixelcrew_sprites.js # PixelCrew Desk sprites.js 원문(MIT, 본인 저작) — 수정 금지, NOTICE.md. STYLE.char='pixelcrew'일 때 사용
│  ├─ 05_dynamic.js              # 카메라·미니맵·캐릭터 두 스타일(ghostCanvas·drawGhost / SPECIES·drawVillager, CAST·GUIDE·drawActor)·탈것·NPC·draw·표식·이동·도착·체크리스트·대화창
│  └─ 06_ui.js                   # 서랍(+그림체 선택기)·비교·기준 구간·점수·노트·내부·출근 레그·시작 플로우·입력·boot·IIFE 끝
├─ assemble.py                   # src/* → template.html
├─ template.html                 # 생성물(약 140KB). /*__DATA__*/ 자리에 JSON 주입
├─ build.py                      # template + data/cell_data.json → index.html, dev.html (스크립트 닫힘 태그 검사 포함)
├─ build_guide_html.py           # 이 가이드 md → guide.html(../template.html 재사용)
├─ index.html / dev.html         # 생성물(약 653KB). 직접 고치지 말 것
├─ template_v1_backup.html       # v1(재작업 전) 보관
├─ template_v3_pixelcrew_backup.html # v3(픽셀크루 캐릭터 단독) 보관
├─ template_v4_villager_backup.html  # v4(주민×코티지×단 지형) 보관 — STYLE 로도 재현 가능
├─ data/cell_data.json           # 구운 월드(§3). tools/build_cell.py 산출물
├─ tools/
│  ├─ build_cell.py              # OSM+SRTM+complexes.json → cell_data.json (표준 라이브러리만; 산출은 `data/cell_data.json`)
│  ├─ complexes.json             # 손입력 단지 사실·카드·출입구(§4) — 편집 대상
│  ├─ elev_srtm.json / elev_srtm_east.json   # OpenTopoData srtm30m 격자(50m 간격)
│  └─ overpass_query.ql          # Overpass 질의(bbox 37.5520–37.5710 / 127.0100–127.0420)
│     (osm3.json 3.4MB 원본은 저장소 미포함 — 질의 재실행으로 복원)
├─ stylelab/                     # 스타일 랩: src/(6조각) → build_stylelab.py → index.html·dev.html, 카탈로그 STYLE_LAB_2026-10-11.md
├─ qa/                           # v1/v2/v3 캡처 9장 + 스타일 랩 5장 + v4 캡처 7장 + v5 캡처 7장 + v6 캡처 5장
├─ PROTOTYPE_NOTES.md            # 제작 방법·출처·규칙·검증 로그
└─ CODEX_PROTOTYPE_GUIDE_2026-10-11.md   # 이 문서
```

## 2. 파이프라인(재현 절차)
| 단계 | 명령/도구 | 입력 → 출력 | 소요 |
|---|---|---|---|
| ① 단지 사실 | Ego 브라우저 수동 열람(네이버지도 단축링크·네이버부동산 `complexes/{id}?tab=complex-info`·호갱노노 `apt/{id}`) → 요약 손입력 | `tools/complexes.json` | 단지당 10~15분 |
| ② 지리 | `curl -d @tools/overpass_query.ql https://overpass.private.coffee/api/interpreter > tools/osm3.json` (공식 서버는 "too busy" 잦음) | osm3.json(5,090 요소) | 1~2분 |
| ③ 고도 | OpenTopoData `srtm30m` 100점/요청·1초 간격(open-elevation은 600점 뒤 429) | `elev_srtm*.json` | 2~3분 |
| ④ 굽기 | `python3 tools/build_cell.py` | `cell_data.json` | 수초 |
| ⑤ 조립 | `python3 assemble.py && python3 build.py` | template.html → index.html·dev.html | 즉시 |
| ⑥ 검증 | `python3 -m http.server 8793` + Ego 브라우저(라이트 테마 에뮬·`window.__errs` 수집·데스크톱 1280×760/모바일 390×844 DPR2 터치) | `qa/*.png` | 5분 |

새 셀을 만들 때는 ②③의 bbox와 `build_cell.py` 상단 `LAT0/LAT1/LON0/LON1/W/H`, `STATIONS`(역 이름→노선 손입력)만 바꾸면 된다. 타일 수가 커지면 정적 레이어 캔버스(§6-1)가 커지므로 120×80 이상은 분할을 권한다.

## 3. 데이터 계약 — `data/cell_data.json`
모든 격자 배열은 길이 `W*H`, 인덱스 `i = y*W + x`, 원점 북서쪽, x→동, y→남.

| 키 | 형 | 뜻·값 범위 |
|---|---|---|
| `meta` | `{title, built, tile_m:25, W:99, H:58, bbox{lat0,lat1,lon0,lon1}, sources[], roads_drawn}` | bbox는 타일 (0,0)=북서(lat1,lon0) |
| `elev` | float[] | 타일 중심 고도 m(0.5m 반올림, 17~102.5). **경로 계산의 유일한 고도 소스** |
| `kind` | int[] | 0 땅 · 1 도로 · 2 보도 · 3 계단 · 4 건물 · 5 공원 · 6 학교 · 7 공사구역 (8 물은 예약, 이 셀엔 없음) |
| `rcls` | int[] | 도로 등급 9 primary · 8 secondary/primary_link · 7 tertiary/secondary_link · 5 residential/living/unclassified · 4 service · 3 pedestrian · 2 footway/cycleway/path · 1 steps |
| `lanes` | int[] | OSM lanes, 없으면 등급 기본값(primary 3·secondary 2·residential 1) |
| `oneway` | int[] | 1=일방(현재 경로 비용에 미반영 — 마스터 MOV004에서 처리) |
| `cross` | int[] | 횡단보도 노드가 있는 타일 |
| `steps` | int[] | 계단 way가 지나는 타일(kind 3이 아니어도 설정될 수 있음) |
| `rname` | `{ "i": 도로명 }` | 이름 있는 도로 타일만 |
| `buildings[]` | `{id, label, levels, kind, poly[[x,y]..], cx, cy, complex, concept?}` | 1,768개. `poly`는 타일 좌표(float). `complex`는 landuse 폴리곤 내포 판정으로 귀속. 라체르보 7개는 `id:"synth-…", concept:true`(개념 배치, 등급 F) |
| `stations[]` | `{name, lines[], x, y, lat, lon}` | 역 5곳, 같은 이름 노드는 평균 좌표로 병합 |
| `exits[]` | `{station, ref, x, y, lat, lon}` | 출구 44곳. `station`은 가장 가까운 역 |
| `pois[]` | `{type, name, x, y}` | type ∈ elem·mid·high·kinder·mart·conv·med·park·play·lib·gym (144개) |
| `complexes[]` | `complexes.json` 그대로 + `x, y, poly, building_count_osm` + gates에 `x, y` | §4 |
| `areas[]` | `{kind: park|school|construction, name, poly}` | 106개, 라벨·채우기용 |

**결측 보존 규칙(마스터 DAT002)**: 모르는 값은 0으로 바꾸지 않고 `cls:"unknown"`/`grade:"unknown"`로 남긴다. 예: 왕십리자이 배정 초등은 `cls:"review"`, 라체르보 동 배치는 `cls:"concept"`.

## 4. 단지 입력 — `tools/complexes.json`
```jsonc
{
  "id": "HYBER", "name": "래미안신당하이베르", "short": "하이베르", "gu": "중구", "dong": "신당동",
  "address": "...", "lat": 37.5619, "lon": 127.0227,
  "osm_landuse_id": 379962857,          // 단지 경계 폴리곤(OSM way id). 없으면 건물 귀속 불가 경고
  "color": "#f2a7b8",                    // 지붕·발코니 띠·명패 테두리·미니맵 점
  "theme": "mid",                        // new(≤10년) | mid | old(20년+ → 금 1줄 연출, D-12)
  "synthesize_towers": {"levels":[35,35,33,30,28,25,20]},   // OSM에 동이 없을 때만(라체르보)
  "facts": [ {"k":"사용승인","v":"2011-10-28 (15년차)","src":"네이버부동산 단지정보","cls":"official","note":"…"} ],
  //   cls ∈ official | estimate | review | unknown | concept  → 서랍 배지(공식/추정/후기/미확인/개념)
  "amenities": {"known":["…"], "note":"커뮤니티 목록은 K-apt 미조회 → 개념 재현"},
  "cards": [ {"id":"IC-HYB-01","cat":"slope","grade":"A-est","title":"…","text":"…","src":"…","date":"2026-10-11","counter":"반론(선택)"} ],
  //   cat ∈ slope|school|traffic|community|parking|commerce|construction|regulation
  //   grade ∈ A | A-est | B | C | unknown(X)  — C는 월드에 절대 그리지 않음(텍스트 카드만)
  "gates": [ {"name":"정문(퇴계로90길)","lat":37.5613,"lon":127.0212,"note":"위치 추정"} ],   // gates[0]=비교·스폰 기준
  "spawn_station": "신당",               // 이 역의 가장 가까운 출구에서 시작
  "sources": ["https://naver.me/G1wiQEAi", "https://fin.land.naver.com/complexes/27820", "https://hogangnono.com/apt/31af"]
}
```
`facts`의 `k` 중 코드가 읽는 키: `주차`(세대당 N대 정규식 → 비교표·내부 체감), `사용승인`(앞 7자 → 준공), `세대수`, `동수·층수`, `구조·난방`/`난방·시공`. 나머지 키는 표시만 한다.

## 5. 이동·시간 규칙(마스터 §7 대응) — `src/04_route.js`(속도 상수 `SPEED`는 02_world.js)
- 속도 km/h: 도보 4.0 · 유모차 3.2 · 자전거 12 · 차 22. `stepCost(from,to,mode,diag)` = 거리/속도 × 경사계수 + 가산.
- 경사계수 `slopeFactor` (경사 % = Δ고도/거리): 도보 <5 ×1 · <9 ×1.1 · <15 ×1.4 · ≥15 ×1.6 / 유모차 <2 ×1 · <5 ×1.11 · <9 ×1.33 · <15 ×2.0 · ≥15 불가 / 자전거 <2 ×1 · <5 ×1.18 · <9 ×1.54 · <15 ×2.5 · ≥15 불가 / 내리막 자전거 ×0.8·유모차 ×1.1. 차 무관.
- 통행 `tileAllowed`: 건물 불가. 차는 도로 등급 4+만. 비차량은 학교·공사구역 불가, 계단은 도보만. **계단 판정 `isStairs(i)`** = steps 플래그가 있고, 대로(등급 8+) 타일에 겹친 계단(지하도·육교 계단, 4칸)이 아닌 것 — 25m 타일 해상도 한계로 대로 보행은 막지 않는다. (v6까지는 `K≠ROAD` 조건이라 굽기에서 ROAD로 분류된 계단 24칸을 유모차가 통과했다.)
- 가산: 길 없는 땅 ×1.5, 대로변 보행 ×1.1, 계단 ×1.6, 자전거 보도 ×1.3, 대로 진입 횡단 +0.5분(자전거 +0.33), 차 러시아워(시계 am/pm) 등급 7+ ×2.0, 차 신호 +0.67분, 차 주차 +3분(`routeStats`; v7부터 재생 타임라인에도 마지막 타일 3분 정지로 포함).
- `astar` 8방향·이진힙·대각선 코너컷 금지·20만 반복 상한. 결과 `routeStats` = {min, dist, up, cross, stairs, maxGrade}.
- 재생: `TIME_SCALE=22`(실제 1초=월드 22초), `tickTravel`이 누적 비용 `seg[]`로 위치 보간, 경사 9%+·계단·대로 횡단에서 토스트, 건너뛰기는 `t0=-1e12`.
- 기준 구간 `computeMetrics`(06_ui.js; 역 출구는 `spawn_station` 소속 출구 우선): 단지별 gates[0] 기준 역 출구(출구→정문, 도보·유모차)·초등·마트·병원(정문→목적지, 도보). 비교표·노트·점수의 공통 소스. 마스터 §7-4 route_metric의 클라이언트판.
- 점수 `scoreFor`(06_ui.js): 컨셉 가중치(1인 교통35·편의20·환경25·치안15·주차5 / 커플 30·10·25·20·10·5 / 가족 교통20·학군30·편의15·환경20·주차10·치안5). 치안은 데이터 없음=50 고정. 노트에 "추정" 명시.

## 6. 렌더링 — 정적 1장 + 동적
### 6-1. 정적 레이어 `buildStatic` (03_static.js)
- 월드 전체를 오프스크린 캔버스 1장에 굽는다(배율 `SS=min(1.5,DPR)`, 약 2,600×1,600 논리 px). 야간 창문·가로등은 별도 `lightsCv`(배율 1)에 굽고 밤에 `lighter`로 합성.
- 투영 `proj(x,y,z) = [(x−y)·16, (x+y)·8 − z·1.6]`. 타일 32×16px, 고도 1.6px/m, 층 2.4px.
- **단 지형**(02_world.js `TIERZ`): `E` 3×3 평활 → `TIERZ = round(E/8)·8` → 3×3 최빈값 2회 → 건물 아래 타일은 건물 중심 단으로 평탄화(`PAD`) → 모서리 높이 `CZ[i*4+k]` (NW,NE,SE,SW). 길 타일은 더 높은 길 이웃 쪽 모서리를 그 단으로 올려 **경사로**. `surfZ(fx,fy)` = 모서리 이중선형 = 캐릭터·표식이 서는 높이.
- 화가 알고리즘: `s = x+y` 오름차순으로 타일 → 그 깊이의 소품(나무·꽃) → 그 깊이에 앵커(폴리곤의 x+y 최대 꼭짓점)된 건물. 절벽은 타일의 동·남 변에서 이웃 모서리보다 0.5m 이상 높을 때 사각형으로, 월드 가장자리는 받침대(`BASEZ`)까지.
- 길: 대로(등급 8+) 전면 포장·연석·중앙 점선·횡단보도, 골목·보도·계단은 중심 원 + 8방향 이웃 반쪽 띠(`roadLinks`: 대각선은 양옆 직교 이웃이 모두 길이면 생략).
- 건물 `bldStyle`→`drawBuilding`(v4 코티지): 보이는 면만(중심→변 바깥 방향 x+y>0), 남향 면 ×0.86·동향 ×0.96, 윤곽 `CT.outline`(#5a4634, 1.4px). 지붕은 꼭짓점 4개면 긴 변 방향 박공(용마루 높이 = 짧은 변×0.45, 4~13px, 박공벽 삼각형 + 처마 1.5px 기하 확장), 그 외는 중심으로 0.45 축소해 올린 모임지붕. 아파트(단지 소속 또는 apartments/10층+)는 따뜻한 크림 벽+층마다 창틀 창(틀 두께는 층 높이에 맞춤)+단지색 지붕(`mixHex(단지색, 갈색, .25)`)+용마루 위 동 라벨, 집은 파스텔 벽+색 지붕+십자살 창 1~3+문+굴뚝, 상점은 줄무늬 차양. `old` 테마만 금 1줄. 가림 bbox는 지붕·굴뚝만큼 위로 22px 여유.
- **연필 스케치 월드**(`SK`, v5): 위 규칙 위에 종이 팔레트를 덮어쓰고(`C`에 Object.assign), 길은 띠 대신 타일 중심→이웃 중점의 잉크 두 줄(보도 한 줄, 간격 `ROADW×0.3`, 끝점 ±0.5px 지터), 절벽은 해칭 4줄, 타일 윗면 격자선 0.4px, 풀 포기 없음, 나무는 반투명 블롭 3개+잉크 줄기, 정적 캔버스에 종이 결 점(640px²당 1개), 하늘 종이색. 건물은 그대로 코티지.
- **수채 지도 월드**(`TOP`, v6, 탑뷰): §0-1 표의 순서대로 별도 패스로 굽는다. 투영이 바뀌므로 `WX0~WY1` 범위·`pickTile`·미니맵 뷰포트도 `TT`로 계산. 절벽·단·건물 높이는 없고(경로 시간은 그대로 원본 고도), 가림 목록은 비어 있다.
- 가림 목록 `OCC[]`: 건물·나무의 {key:x+y, bbox, draw}. 동적 레이어가 캐릭터를 그린 뒤 key가 더 큰(앞에 있는) 겹치는 소품만 다시 그려 깊이를 맞춘다(`drawActorOccluded`).

### 6-2. 동적 레이어 `draw` (05_dynamic.js)
하늘 그라데이션(아침/저녁/밤) → 카메라(`S.camX/camY/zoom`, follow 보간 0.18) → 정적 캔버스 → 경로 점선·깃발 → NPC 10명 → 플레이어(가림) → 밤 틴트+불빛 → **화면 좌표 고정 크기 표식** `drawMarkers`(단지 명패·역 태그+노선 원·POI 핀·출구 상자·출입구 문기둥, 줌 1.25+ 라벨·1.8+ 출구 글자) → 미니맵(뷰포트 사다리꼴). 입력은 포인터(드래그=카메라, 탭=표식 16px 내 우선 → 타일 `pickTile`), 휠·핀치 줌 0.55~2.6, 방향키/WASD 한 칸 이동. 탑뷰(`TOP`)에서는 하늘이 종이색이고 캐릭터·NPC를 타일 중심보다 0.3타일 아래에 세운다.

### 6-3. 캐릭터 = `STYLE.char`로 선택: 픽셀크루 도트 유령 | 동숲풍 주민 (`src/05_dynamic.js` 앞부분)
- 두 렌더러가 함께 실려 있고 배역표 `CAST`·`GUIDE`·`NPC_CAST`의 한 항목이 두 스타일 값을 다 가진다(주민: `sp·col·hat·name`, 픽셀크루: `crew·pname`). NPC·라인업은 `drawActor`, 플레이어는 `drawParty`(스타일별 배치 분기), 길잡이 얼굴은 `faceDraw`가 스타일을 본다. 이름도 `castName()`·`GUIDE.name`으로 바뀐다(픽셀/루마/비트/닷 ↔ 나비/토토/곰돌/콩알, 길잡이 픽셀 ↔ 보리).
- **픽셀크루(v3·v5, 현재)**: 엔진 `src/vendor/pixelcrew_sprites.js`(PixelCrew Desk `sprites.js` 원문, 24×22 그리드, 상태 8종, UMD → `self.PixelSprites`), 바로 앞의 `self.PixelCrewRoster`(크루 9종, `04_route.js` 끝)를 읽는다. `ghostCanvas(crew,state,frame,flip)`가 픽셀을 24×22 캔버스에 굽고 fx 'shaded' 요지(오른·아래 ×0.78, 왼·위 ×1.18, 행 감쇠, 윗가장자리 하이라이트)만 적용 — **픽셀맵은 수정하지 않는다**. `drawGhost` 기본 scale 1.15(줌 1에서 약 28×25px), 차는 머리 0.5배, 유모차 아기 닷 0.42배, 아이 0.78배. 대화창 캔버스는 24×22 pixelated, 라인업은 크루 9명 idle.
- **동숲풍 주민(v4)**: 코드 드로잉. `SPECIES` 10종 = 귀 모양(`cat·floppy·round·bunny·side·none`)·털색·무늬(`muzzle·patch·spots`). 2등신(머리 반지름 13·몸 14×12·다리 4×6, 단위 s = 0.68×scale), 갈색 윤곽, 하이라이트 눈, 볼터치, 3.7초마다 깜빡임. `drawVillager(g,x,y,{sp,col,face,state,t,scale,seed,hat,bust,noShadow})` 상태 idle·walk·talk·happy·think, `hat` sprout·ribbon·cap, `bust`=머리만(차·유모차 아기·대화창). 차는 머리만 0.6배, 아이 0.72배. 대화창 캔버스 96×88, 라인업 길잡이+배역 4+주민 8.
- NPC 10명은 골목·보도 타일만 직진 우선 무작위 보행, 멈추면 idle, 서 있는 3명은 think/idle/happy — **연출**이며 마스터 §9 멀티플레이(Colyseus)와 무관.
- 전환: `STYLE.char` 값만 바꾸고 재조립. 두 경로 모두 §12에서 오류 0 확인(v5 발행본 = pixelcrew, 대체 빌드 = villager).

## 7. 게임 흐름·상태
- `S` 한 객체: concept, mode, complex, px/py(타일 float), face, night, clock(am/day/pm), zoom, cam, traveling{path,seg,t0,stats,target}, visited, cardsSeen, done, events[], metrics, routeLog, npcs. `localStorage['imjang-proto-v1']`에 done·cardsSeen·routeLog(최근 30)만 저장.
- 시작: `boot` → `resize`·`buildStatic`·`computeMetrics`·`spawnNpcs` → 컨셉 선택 모달(`openConceptPicker`, 길잡이 새싹 인사) → 단지 선택(`openComplexPicker`, 두 번째부터는 10분 캡 모의 전면 광고 `showInterstitial`) → `setComplex`: 명패 갱신, `spawn_station`의 가장 가까운 출구 옆 보행 가능 타일에 스폰, 목적지 탭 열기(모바일은 시트 닫음).
- 도착 `onArrive`: 대화창 메시지(차=주차 +3분, 유모차=출구 엘리베이터 미확인, 초등=횡단 횟수·배정 여부) → `events.push` → `evalChecklist`(컨셉별 조건 arrive/poi/mode/night/commute/commute2/interior) → 다른 단지 정문이면 `setComplex(id,false)` → 카드 1장 노출(도착 유형→카테고리 매핑 elem→school, exit→traffic, gate→parking|slope, mart→commerce, med/park/play→community).
- 서랍 5탭 `renderDrawer`: 단지(사실 배지+범례+내부/출근/전환 버튼) · 체크리스트 · 이슈 카드(미획득은 흐림) · 목적지(직선거리 정렬, 유형별 상한) · 비교(`renderCompare`).
- 모달: 노트 `openNote`(마크다운 생성·복사·선택 폴백), 내부 `openInterior`(주차 12칸 모형·커뮤니티 닫힌 문·엘리베이터 사실), 출근 레그 `openCommute`(2·5·6호선 손입력 그래프 `LINES`, 역간 2분·환승 5분·도착 도보 5분, 커플은 두 직장 합·차이 20분 "한쪽 희생").
- 광고: `#adslot` DOM 배너(캔버스 밖), `#interstitial` 모의 전면(3초 뒤 스킵, 10분 캡). 정보는 광고 뒤에 잠기지 않음(마스터 P9·ADS001).

## 8. UI 계약(DOM id — 테스트 스크립트가 의존)
`#world`(캔버스) · `#chipComplex`(명패) · `#chipClock` · `#btnNight` · `#btnDrawer` · `#minimap` · `#hud #stats`(`#stMin #stMode #stDist #stUp #stCross #stStairs #stHint`) · `#actions`(`#btnSkip #btnDest #btnNote #btnCenter`) · `#dock button[data-mode]` · `#dialog`(`#dlgName #dlgText`) · `#drawer .tabs button[data-tab]`, `#btnDrawerClose`, `#drawerBody` · `#adslot` · `#toast` · `#interstitial`(`#interCount #interSkip`) · `#modal #modalBox`. 서랍은 900px 이상 우측 카드, 미만 하단 시트(열리면 HUD·독·대화창 숨김). 테마 토큰은 `:root` 라이트 + `prefers-color-scheme: dark`/`[data-theme=dark]` 갈색 종이.

## 9. Codex가 가져갈 것 / 가져가면 안 되는 것
**가져갈 것(그대로 이식 가능)**
- §3 `cell_data.json` 계약과 `tools/build_cell.py`의 타일화 규칙(도로 supercover·등급·차선 폭 2타일·건물 landuse 귀속·역 병합·출구 최근접 역) → 마스터 T12·T14의 참고 구현.
- §5 이동 규칙 전체(마스터 §7-1 수치와 동일) → `packages/shared`의 비용 함수 단위 테스트 입력으로.
- §4 카드·사실 스키마의 `cls/grade` 매핑과 "C는 비렌더링" 규칙(DAT005).
- 단 지형(8m 양자화+경사로)과 길 자동 타일링 아이디어 → Tiled 타일셋 설계(T09·T14)에서 절벽·경사로 타일 규칙으로.
- 길잡이 대화창·명패·핀 표식의 정보 위계(중요 이벤트=대화창, 사소=토스트).
- **캐릭터 규격**: 현재 발행본(v5)은 픽셀크루(사용자 본인 저작 MIT) — Codex 빌드에서도 `renderFrame` 픽셀을 캔버스 텍스처로 구워 카메라를 보는 빌보드(Sprite)로 쓸 수 있다. 대안 동숲풍 주민은 종족 10=귀·털색·무늬 파라미터, 배역 4+길잡이 1, 상태 5종(§6-3). 어느 쪽이든 "NPC는 연출, 실제 이용자는 presence" 구분은 유지.
- **건물 규격(코티지)**: 박공(4각)·모임지붕(그 외)·처마·굴뚝·창틀 규칙과 단지색=지붕색 규칙(§6-1). §13 아트 가이드의 건물 항목으로.

**가져가면 안 되는 것**
- 캔버스 코드 자체(Phaser 3 + React가 마스터 결정 D-05·D-06). 복붙 대신 규칙만 옮긴다.
- NPC 주민(연출) → 실제 이용자 표시는 Colyseus presence(§9 마스터)로만.
- 나무·꽃 배치, 라체르보 7개 타워, 커뮤니티 "닫힌 문" → 전부 F(개념)이며 실제 데이터로 승격 금지.
- `src/vendor/pixelcrew_sprites.js`의 픽셀맵 변형본 — 바꾸려면 PixelCrew 저장소에서 정본을 바꾸고 다시 복사한다(NOTICE.md).
- 손입력 지하철 그래프 → 마스터 T20의 역 그래프·ODsay/공공 API로 대체.
- 치안 50점 고정, 점수 산식 → 플레이테스트 전 가정치.

## 10. 알려진 한계·함정
- **데이터**: 25m 타일이라 골목 과대 표현(도로 타일 59%), OSM 나무 0, 일방통행 미반영, SRTM 30m라 단지 내부 미세 경사 없음, 라체르보 주변 landuse=construction은 OSM 미갱신(준공 2025-07), 하이베르 동수 15/16·왕십리자이 7/6·라체르보 세대 958/926 불일치 [검증].
- **연출**: 8m 단은 완만한 비탈에도 절벽을 만든다(실제 지형 아님). 밤 창문 불빛·가로등은 데이터 없음. 캐릭터 가림은 bbox 근사라 모서리에서 드물게 틀림.
- **성능**: 정적 레이어 약 3,900×2,400px(DPR 1.5) + 불빛 2,600×1,600px. 저사양 모바일 미측정. 셀이 커지면 분할 필요.
- **검증 범위**: Chromium 에뮬레이션만(데스크톱 1280×760, 모바일 390×844 DPR2 터치). 실기 iOS/Android·핀치 미검증.
- **Ego 브라우저 함정**(재검증 시): `page.evaluate(fn, undefined)`는 직렬화 오류 → 인자 생략. 기본 테마가 다크일 수 있어 `Emulation.setEmulatedMedia`로 라이트 강제. 서랍이 버튼을 가릴 때는 DOM `click()`으로.

## 11. 수정 레시피
| 하고 싶은 것 | 손댈 곳 |
|---|---|
| 그림체 전환 | 재조립 없이: 주소 끝 `#캐릭터-월드`(예 `#villager-watermap`, 바꾸면 자동 새로고침) 또는 서랍 단지 탭 그림체 선택기 → 적용. 기본값을 바꾸려면 `src/02_world.js` `STYLE_DEFAULT` 수정 후 `python3 assemble.py && python3 build.py`. id = 스타일 랩 '선택 조합 복사'와 동일(char: pixelcrew·villager, world: terrace·sketch·watermap, bld: cottage). 다른 id(watercolor 건물·neon·tiltshift·탑뷰 pixelrpg 등)는 아직 본편에 없다 |
| 단지 추가(같은 셀) | `complexes.json`에 1건(+`osm_landuse_id`) → `build_cell.py` → `build.py`. 동 폴리곤이 없으면 `synthesize_towers` |
| 새 셀 | §2 ②③ bbox·`STATIONS` 수정 → 새 폴더로 복제. 템플릿은 그대로 |
| 수단·경사 수치 | `SPEED`(02_world.js)·`slopeFactor`·`stepCost`·`isStairs`(04_route.js). 비교표·노트는 자동 반영 |
| 체크리스트·컨셉 가중치 | `CONCEPTS`·`CHECKLISTS`(02_world.js). 체크 저장 키는 `concept:complex:item`(`checkKey`) |
| 카드 노출 규칙 | `CARD_CATS`(05_dynamic.js): 도착 유형 → 카테고리 후보 순서. 정문 = parking→slope→construction→regulation |
| 팔레트·지붕색·지붕 모양 | `C`(02_world.js), `CT·bldStyle`(03_static.js). 박공 높이는 `drawBuilding`의 `rh`(짧은 변×0.45, 4~13px), 처마는 `CT.eave` |
| 단 높이 | `TIER`(02_world.js, m). 절벽 px = TIER×1.6 |
| 표식 라벨 줌 임계 | `drawMarkers` 첫 줄 `showLabels/bigLabels` |
| 캐릭터 배역·종족·크기 | `CAST`·`GUIDE`·`NPC_CAST`·`CONCEPT_CAR`(05_dynamic.js). 종족 추가는 `SPECIES`에 귀·털색·무늬 1줄, 크기는 `drawVillager`의 `0.68` 또는 호출 `scale` |
| 소스 수정 후 | `python3 assemble.py && python3 build.py` → `dev.html` 로컬 확인 → `index.html` 재발행 |
| 출근 허브·노선 | `LINES`·`HUBS`(02_world.js) |

## 12. 검증 요약(v2, 2026-10-11 저녁, Chromium 에뮬레이션, JS 오류 0건)
같은 출발·도착으로 계산하면 코덱스 빌드와 대조할 수 있는 기준값이다(전부 '추정', 마스터 MOV007의 ±10% 대조 연습용).

| 흐름 | 결과 |
|---|---|
| 데스크톱 1280×760 · 가족 · 하이베르 | 신당역 3번 출구 스폰 → 정문 유모차 11분·496m·↑19m·최대 8% → 카드 [A-est] 오르막 → 체크 1/6 → 신당초 유모차 11분·489m·↑9m·최대 12%·횡단 1 → 카드 [A] 배정초 → 노트 72/100 → 출근 레그 신당→강남 45분 → 내부(주차 968대 여유) → 밤 모드 → 차 모드 왕십리자이 정문 6분·724m·↑44m·최대 16%·신호 1 → 단지 전환·카드 [A] 1.3대 |
| 비교표(정문 기준 자동 계산) | 역 출구→정문 도보: 하이베르 8분/496m↑19m · 왕십리자이 11분/595m↑48m · 라체르보 6분/341m↑8m. 유모차: 11분 · 19분(횡단 1) · 8분. 초등 도보: 8·8·4분. 마트: 9·10·2분. 병원·약국: 10·12·5분. 세대당 주차 1.23·1.3·1.29대 |
| 모바일 390×844 DPR2 터치 · 1인 · 라체르보 | 왕십리역 9번 출구 스폰·시트 자동 닫힘 → 정문 도보 6분·341m·↑8m → 지도 탭 이동 5분·287m → 가로 넘침 0. 가족·왕십리자이 정문 유모차 19분·697m·↑33m·최대 11%에서 대화창 상단·HUD·독 하단 분리 확인 |
| v3 픽셀크루(같은 날 밤) | 데스크톱 가족·하이베르: 크루 9명 라인업, 비트가 닷이 탄 유모차를 밀며 정문 11분·496m, 도착 카드 [A] 1.23대, 주민 크루 보행·건물 가림. 모바일 커플·라체르보 정문 도보 6분·341m, 가로 넘침 0. JS 오류 0건. 수치는 v2와 동일(렌더만 변경) |
| v4 동숲풍 세트(같은 날 밤, TaskSpace 54) | 데스크톱 1280×800 가족·하이베르: 첫 화면 길잡이 보리+배역 4+주민 8 라인업, 곰돌이 콩알이 탄 유모차를 밀며 정문 11분·496m·↑19m·최대 8%, 차 모드(머리만)·도보(아이 동행), 커플 나비+토토·자전거, 밤 창문 불빛(새 창 위치), 주민 10종 보행·건물 가림. **비교표 509자 = v3 빌드와 문자 단위 동일**. 모바일 390×844 DPR2 가족 가로 넘침 0(scrollWidth 390). 첫 화면까지(정적 레이어 포함) 약 0.19초(v3 0.12~0.19초). JS 오류 0건 |
| v5 픽셀크루×코티지×연필 스케치(같은 날 밤, TaskSpace 55) | 데스크톱 1280×800 가족·하이베르: 크루 9명 라인업·길잡이 픽셀, 종이 팔레트·잉크 두 줄 길·절벽 해칭·격자선·번짐 나무·종이 결 위에 코티지 건물, 비트가 닷이 탄 유모차·차(머리)·도보(닷 동행), 밤 틴트+불빛, 줌아웃 전체 셀. **비교표 509자 = v4·v3와 문자 단위 동일**. `STYLE`을 villager×terrace로 바꾼 대체 빌드도 오류 0(길잡이 보리). 모바일 390×844 DPR2 커플 가로 넘침 0. JS 오류 0건 |
| v6 수채 지도(탑뷰)+해시 전환(10-12 새벽, TaskSpace 56) | 데스크톱 1280×800 `#pixelcrew-watermap` 가족·하이베르: 종이 결 위 번진 블롭·손그림 길·평면 건물·번짐 나무, 서랍 단지 탭 선택기가 watermap/pixelcrew 표시, 큰길에서 지도 탭 이동 유모차 2분·75m(탑뷰 `pickTile`), 유모차 근접, 밤(아파트 중심 불빛·가로등), 줌아웃 전체 셀. **비교표 509자 동일**. 선택기로 주민×스케치 적용 → 새로고침 후 `#villager-sketch`·길잡이 보리. 모바일 390×844 `#villager-watermap` 1인: STYLE 파싱 villager/watermap, 가로 넘침 0. 같은 문서에서 해시만 바꿔도(`#pixelcrew-terrace`) 자동 새로고침으로 전환. JS 오류 0건 |
| 미검증 | 실기 iOS Safari·Android Chrome, 핀치 줌 실기, 저사양 기기 성능, 아티팩트 뷰어가 링크 해시를 iframe에 전달하는지(로컬에선 확인) |

캡처 `qa/v1_before_desktop.png`(재작업 전), `qa/v2_desktop_walk.png`, `qa/v2_desktop_night.png`, `qa/v2_desktop_compare.png`, `qa/v2_mobile_travel.png`. v4: `qa/v4_intro_villagers.png`, `qa/v4_desktop_family_stroller.png`, `qa/v4_desktop_couple_bike.png`, `qa/v4_desktop_travel_dialog.png`, `qa/v4_desktop_night.png`, `qa/v4_desktop_compare.png`, `qa/v4_mobile_family.png`. v5: `qa/v5_intro_pixelcrew_sketch.png`, `qa/v5_desktop_walk.png`, `qa/v5_desktop_family_stroller.png`, `qa/v5_desktop_night.png`, `qa/v5_desktop_cell_overview.png`, `qa/v5_alt_villager_terrace.png`, `qa/v5_mobile_couple.png`. v6: `qa/v6_desktop_watermap.png`, `qa/v6_desktop_watermap_stroller.png`, `qa/v6_desktop_watermap_night.png`, `qa/v6_desktop_watermap_overview.png`, `qa/v6_mobile_villager_watermap.png`. 절차는 §2 ⑥.

## 13. 코덱스 빌드에 옮길 때의 병합 제안(제안이며 결정 아님 — 결정은 마스터 §19)
1. **기준 구간 수치 보정**: 코덱스의 체험 그래프(`src/graph.ts`)는 "실제 길찾기와 달라요"로 표기돼 있다. 이 프로토의 `computeMetrics`(정문↔역 출구·초등·마트·병원, §12 비교표)는 OSM 도로·SRTM 고도 기반이라 한 단계 더 사실에 가깝다. 코덱스 장소 9곳의 `meters·slope`를 이 값으로 맞추거나, 마스터 T13(OSRM route_metric)이 나올 때까지 임시 기준으로 쓴다.
2. **언덕**: `terrain.ts`의 평면 base에 §6-1의 8m 단 규칙(평활→양자화→최빈값→길 타일 경사로)을 Builder box 단으로 쌓으면 디오라마에 언덕이 생긴다. 절벽 높이 = 8m, 경사로는 길 폴리라인이 단을 넘는 지점.
3. **길 폭 등급**: `ROADW` 표를 미터로 환산하면 대로 약 13m(17px/32px×25m) · 간선 9m · 골목 7m · 서비스 5m · 보도 4m. 코덱스 beam 폭(도로 3.8·보도 1.65)에 등급을 추가할 때 참고.
4. **사실·카드 스키마 병합**: `complexes.json`의 facts(`cls`)와 cards(`cat·grade·src·date·counter`)를 `src/complexes.ts`와 합친다. 규칙 두 가지는 유지 — 모르는 값은 unknown으로 보존(DAT002), C 등급은 월드에 그리지 않음(DAT005).
5. **코덱스가 이미 앞선 것은 그대로**: `/presence` 실제 접속자, 실내 씬 2종, 25구 도감 2,893건, axe 접근성 0건, 네이티브 dialog. 이 프로토의 NPC·닫힌 문·개념 타워는 가져가지 않는다(§9).
6. **공통 검증**: 두 빌드 모두 "신당역 3번 출구→하이베르 정문"과 "왕십리역 9번 출구→라체르보 정문"을 도보·유모차로 계산해 §12 값과 ±10% 안에 드는지 적는다. 어긋나면 이유(데이터·규칙)를 기록하고 마스터 §7-4 기준 구간 정의로 올린다.

## 14. 링크·파일 묶음
| 무엇 | 어디 |
|---|---|
| 프로토 실행(아티팩트 v8, 기본 픽셀크루×코티지×연필 스케치, 링크 끝에 `#villager-watermap` 식으로 조합 지정 가능, 비공개 — 공유 설정 필요) | https://claude.ai/artifact/QgdaSDY7SDJc18LU3Qxwsu |
| 이 가이드 페이지(복사 버튼, 비공개) | https://claude.ai/artifact/8TWdNc2NYNU1d817EgpuwV |
| 통합 기획서(정본) / HTML | `../IMJANG_WORLD_MASTER_2026-10-11.md` / `../index.html` (아티팩트 https://claude.ai/artifact/Rk1mh2t5bn1LPJLuaXNxba) |
| 제작 노트(출처·규칙·검증 로그) | `PROTOTYPE_NOTES.md` (§1-1 v2 변경, §4 출처·한계, §7·§7-1 로그) |
| 25구 단지 카탈로그 | `../SEOUL_25GU_COMPLEX_CATALOG_2026-10-11.md` |
| 코덱스 빌드와 문서 | 저장소 `codex/` — `README.md`, `docs/Claude_V5_전체월드스타일_구현가이드.md`, `DESIGN.md`, `qa/v5/QA.md` |
| 코덱스 통합 기획서(코덱스 측 정본) | 작성자 로컬 보관(저장소 미포함) `서울_아파트_임장월드_통합개발기획서.md` (개정 3, S01~S22, U01~U16) |
| 스타일 랩(캐릭터·건물·월드맵 각 10종, 조합 미리보기) | `stylelab/index.html`(아티팩트 https://claude.ai/artifact/DsWyzkZp2Ag3wD8LGkFgbv) · `stylelab/STYLE_LAB_2026-10-11.md`(카탈로그·이식 절차) · 정본 `stylelab/src/` — 사용자 선택 1: 동숲풍 세트(villager×cottage×terrace) → v4, **선택 2: pixelcrew×cottage×sketch → v5(기본값)**, v6에서 수채 지도(watermap, 탑뷰)도 `STYLE.world`에 추가. 해시·서랍 선택기로 전환 |
| 이전 템플릿 보관 | `template_v1_backup.html`(v1 재작업 전) · `template_v3_pixelcrew_backup.html`(v3 픽셀크루 단독) · `template_v4_villager_backup.html`(v4 동숲풍 세트) |
| 픽셀크루 원본(캐릭터 정본, v5 현재 사용) | PixelCrew Desk 저장소(작성자 본인, 비공개) — `src/renderer/shared/sprites.js`(픽셀맵), `src/shared/crew.js`(명부), `src/renderer/shared/fx.js`(조명 5모드), `docs/CHARACTERS.md`(디자인 문법·이름 규칙) |

| GitHub 저장소 | https://github.com/flykimjiwon/aptHanimo — 공개, 2026-10-12 사용자 지시로 첫 푸시(`imjang_world_2026-10-11/` 폴더 전체 = 기획서·프로토·스타일 랩·카탈로그). `.omc/`·`osm3.json`·캐시는 제외 |

2026-10-12 첫 커밋·푸시 완료. 이후 커밋·푸시도 사용자 지시가 있을 때만.
