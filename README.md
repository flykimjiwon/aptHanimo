# aptHanimo — 임장월드(가제)

서울 아파트 단지를 2.5D 귀여운 월드맵으로 걸어 보는 임장 웹게임 프로젝트. 2026-10-11~12, Claude Code(Fable 5.1)가 작성·제작한 기획서와 브라우저 프로토타입, 스타일 랩, 25구 단지 카탈로그를 한 폴더로 묶었다. 전부 **추정·연출**이 섞인 체험판이며 투자 판단 자료가 아니다.

| 무엇 | 어디 | 비고 |
|---|---|---|
| 통합 기획서(정본, PRD+빌드 스펙) | `IMJANG_WORLD_MASTER_2026-10-11.md` → `index.html`(`build_html.py`) | 결정 D-1~D-7, §15 4개 AI 산출물 비교 체크리스트, 부록 D 프로토 이력 |
| 초안 v0.2 | `IMJANG_WORLD_PRD_2026-10-11.md` | 이력 |
| 외부 기획서 2본(텍스트) | `sources/` | 종합 대상 |
| 프로토타입(단일 HTML, 의존성 0) | `prototype/dev.html`(더블클릭) · `prototype/index.html`(아티팩트용) | 정본은 `prototype/src/` → `assemble.py` → `build.py`. 제작 노트 `prototype/PROTOTYPE_NOTES.md`, Codex 구조 가이드 `prototype/CODEX_PROTOTYPE_GUIDE_2026-10-11.md`(`guide.html`) |
| 그림체 전환 | 주소 끝 `#캐릭터-월드` (`#villager-watermap`) 또는 서랍 단지 탭 선택기 | char: pixelcrew·villager / world: terrace·sketch·watermap / bld: cottage |
| 스타일 랩(캐릭터·건물·월드맵 각 10종) | `prototype/stylelab/dev.html` · `STYLE_LAB_2026-10-11.md` | 조합 미리보기 + JSON 내보내기 |
| 25구 단지 카탈로그 | `SEOUL_25GU_COMPLEX_CATALOG_2026-10-11.md` | [검증] 표시는 K-apt 확인 전 |
| 검증 캡처 | `prototype/qa/` | v1~v6, 크로미움 에뮬레이션 |

데이터 출처: OpenStreetMap(ODbL), OpenTopoData SRTM 30m, 네이버부동산·네이버지도·호갱노노 수동 열람 표기값(출처 등급과 함께 `prototype/tools/complexes.json`), 뉴스. 크롤러 없음. `prototype/tools/osm3.json`(Overpass 원본 3.4MB)은 저장소에 넣지 않았고 `overpass_query.ql`로 재생성한다.

캐릭터 `prototype/src/vendor/pixelcrew_sprites.js`는 작성자 본인 프로젝트 PixelCrew Desk의 원문(MIT © 2026 Jiwon Kim, `NOTICE.md`).
