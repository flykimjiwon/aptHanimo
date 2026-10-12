# aptHanimo — 임장월드(가제)

서울 아파트 단지를 2.5D 귀여운 월드맵으로 걸어 보는 임장 웹게임 프로젝트. 2026-10-11~12, Claude Code(Fable 5.1)가 작성·제작한 기획서와 브라우저 프로토타입, 스타일 랩, 25구 단지 카탈로그를 한 폴더로 묶었다. 전부 **추정·연출**이 섞인 체험판이며 투자 판단 자료가 아니다.

| 무엇 | 어디 | 비고 |
|---|---|---|
| **AI 인계(입구)** | `AI_HANDOFF.md` | 두 레인(Codex `codex/` · Claude `prototype/`) 합본: 지도·경계·상태·백로그·인수 문구. 레인 정본은 `codex/docs/AI_HANDOFF_2026-10-12.md`, `prototype/AI_HANDOFF_2026-10-12.md` |
| 통합 기획서(정본, PRD+빌드 스펙) | `IMJANG_WORLD_MASTER_2026-10-11.md` → `index.html`(`build_html.py`) | 결정 D-01~D-22·미결 D-U1~14(§19), 요구사항 ID(§16)·티켓(§17), 부록 D 프로토 이력 |
| 초안 v0.2 | `IMJANG_WORLD_PRD_2026-10-11.md` | 이력 |
| 외부 기획서 2본(텍스트) | `sources/` | 종합 대상 |
| 프로토타입(단일 HTML, 의존성 0) | `prototype/dev.html`(더블클릭) · `prototype/index.html`(아티팩트용) | 정본은 `prototype/src/` → `assemble.py` → `build.py`. 제작 노트 `prototype/PROTOTYPE_NOTES.md`, Codex 구조 가이드 `prototype/CODEX_PROTOTYPE_GUIDE_2026-10-11.md`(`guide.html`) |
| 그림체 전환 | 주소 끝 `#캐릭터-월드` (`#villager-watermap`) 또는 서랍 단지 탭 선택기 | char: pixelcrew·villager / world: terrace·sketch·watermap / bld: cottage |
| 스타일 랩(캐릭터·건물·월드맵 각 10종) | `prototype/stylelab/dev.html` · `STYLE_LAB_2026-10-11.md` | 조합 미리보기 + JSON 내보내기 |
| **3D 스타일 랩**(three.js, 귀여운 캐릭터 풍 6 × 월드 풍 5 × 시점 4) | `prototype/stylelab3d/index.html` · `STYLE_LAB_3D_2026-10-12.md` | CDN ESM(인터넷 필요). 고른 조합 JSON을 3D 본편(`codex/`)에 전달 |
| 25구 단지 카탈로그 | `SEOUL_25GU_COMPLEX_CATALOG_2026-10-11.md` | [검증] 표시는 K-apt 확인 전 |
| 검증 캡처 | `prototype/qa/` | v1~v7, 크로미움 에뮬레이션 |
| 테스트·재굽기 | [검증 가이드](prototype/tests/README.md) · 규칙149개 + 검증기 회귀11개 · `bash prototype/tools/bake.sh [--refresh]` | 본편·스타일랩 동시 생성, 골든·방향 자료 오류 실패 처리. v8 일방통행·v9 렌더링 계약 유지 / v10: 카드·사실 정정 요청(GitHub 이슈 사전 작성)·노트 이미지 저장·공유·가림 이진탐색 |
| 검수 반영(v7, 2026-10-12) | `prototype/PROTOTYPE_NOTES.md` 머리말 v7 | roundRect 폴리필·계단 규칙·카드 매핑·주차 타임라인·charset·ODbL 고지 등. 검수 보고서는 메타 repo `docs/analysis/APTHANIMO_CLAUDE_PROTO_REVIEW_2026-10-12.md` |

데이터 출처: 지도 데이터 © OpenStreetMap contributors(ODbL, 화면 하단과 단지 탭에 상시 고지), OpenTopoData SRTM 30m, 네이버부동산·네이버지도·호갱노노 수동 열람 표기값(출처 등급과 함께 `prototype/tools/complexes.json`), 뉴스. 크롤러 없음. `prototype/tools/osm3.json`(Overpass 원본 3.4MB)은 저장소에 넣지 않았고 `bash prototype/tools/bake.sh --refresh`로 다시 받는다(User-Agent 필요).

캐릭터 `prototype/src/vendor/pixelcrew_sprites.js`는 작성자 본인 프로젝트 PixelCrew Desk의 원문(MIT © 2026 Jiwon Kim, `NOTICE.md`).

## Codex 독립 구현 · 한바퀴 V5

[`codex/`](codex/)에 별도로 구현한 실제 좌표 기반 자유 산책 앱을 추가했다. 기존 Claude `prototype/`과 실행·데이터 파이프라인을 분리했다. Three.js로 세 단지 지형과 건물을 그리고, 캐릭터10종·건물11종·지도11종·3시점, 자유 이동·배속·순간이동과 실제 WebSocket 접속자를 제공한다.

```sh
cd codex
bun install --frozen-lockfile
bun run build
bun start
```

브라우저: `http://localhost:5178/` · 스타일 실험실: `http://localhost:5178/style-lab.html`. [AI 인계 가이드](codex/docs/AI_HANDOFF_2026-10-12.md), [제작방법·기술스택·출처](codex/docs/Claude_V5_전체월드스타일_구현가이드.md), [QA 인덱스](codex/qa/v5/QA.md)·[후속 수정 검증](codex/qa/v5/repair-2026-10-12.md)을 참고한다. 2026-10-12 Codex 세션이 브라우저 전체 검수 뒤 결함 5건(도착 UI·차량 경로 완주·순간이동 취소·모바일 조작부·초기화 오류 복구)을 수정했고 Bun 81테스트·엔진 80경로·브라우저 차량 17목적지·화면 8조건으로 검증했다. 실기 iOS/Android와 공개 웹 서비스 배포는 미검증·미포함이다.
