# 프로토타입·제작 이력 보존 목록

사용자 결정: Codex 기반으로 주력을 합치되 Claude와 Codex의 모든 프로토타입과 흔적을 유지한다. 파일을 이동하거나 새 복사본으로 대체하지 않고 **기존 경로와 Git 이력**으로 보존한다.

기준 커밋: `bcce68c9a5688135dfa86b31b0c959bd66cb5a33`.

| 보존 대상 | 실행/열람 경로 | 정본과 생성물 |
|---|---|---|
| 현재 통합 단지 섬 | Bun 서버 `/` | `codex/src/entry.ts` → `src/village/main.ts` |
| Codex 생활권 전체 월드 | `/world.html` | `codex/world.html`, `src/main.ts`, 공유 모듈 |
| Codex 초기 왕십리자이 섬 | `/island.html` | `codex/island.html`, `src/island/` |
| Codex 2D 스타일 실험 | `/style-lab.html` | `codex/style-lab.html`, `src/`의 스타일 랩 모듈 |
| Claude Canvas 본편 v13 계열 | `prototype/dev.html`, `prototype/index.html` | `src/` 7조각 → `assemble.py` → `template.html` → `build.py` |
| Claude 2D 스타일 랩 | `prototype/stylelab/dev.html`, `index.html` | `build_stylelab.py`와 원본 템플릿; HTML은 생성물 |
| Claude Three 3D 랩 v13 | `prototype/stylelab3d/index.html` | 자체 HTML/JS, `build_island_data.py` → `island_data.js`; CDN 필요 |
| Claude 제작·수정·QA | `prototype/PROTOTYPE_NOTES.md`, `AI_HANDOFF_2026-10-12.md`, `qa/` | 과거 검증 수치는 당시 증거로 유지 |
| Codex 제작·수정·QA | `codex/docs/`, `codex/qa/`, `codex/research/` | 당시 구현·출처·검사 증거 |
| 최초 기획·카탈로그 | 루트 `IMJANG_WORLD_*`, `sources/`, `SEOUL_25GU_*` | master + `template.html` → `build_html.py` → 루트 `index.html` |
| PixelCrew 원문 | `prototype/src/vendor/pixelcrew_sprites.js`, `prototype/src/vendor/NOTICE.md` | 기존 원문·저작권 표기 유지 |

## 변경되지 않았음을 확인하는 기준

보존 기준의 `prototype/`는 Git 추적 파일 **120개**, tree SHA **`558d2ff607e2a343a8bf575b78298611fc37bcea`**다. 마지막 prototype 관련 커밋은 `86d5c835cdadb02910c1938d8ebb74e3a72c2d2c`. 주력 통합 커밋은 `0cd16b1264126fc0d5f63b8dbd8163dddc7771a9`다.

```sh
git rev-parse HEAD:prototype
git ls-tree -r --name-only HEAD prototype
git diff bcce68c9a5688135dfa86b31b0c959bd66cb5a33 -- prototype
```

문서 통합에서는 위 tree가 같아야 한다. 이후 사용자가 프로토타입 수정도 요청하면 정본을 고치고 재생성·검증한 **새 커밋**으로 남긴다. 이전 SHA는 계속 재현 기준으로 유지한다. 이 목록은 영구 수정 금지가 아니다.

공유 Three/공간 모듈을 바꾸면 주력 외에 생활권과 이전 섬도 영향을 받으므로 네 진입점을 검사한다. 삭제된 과거 커밋으로만 남기지 말고 기존 실행 경로도 유지한다. `dist/`, `node_modules/`, 주민 DB·사진·원문 크롤링 자료는 보존 대상이라는 이유로 Git에 추가하지 않는다.

## 역사적 분기점

- `055d06c`: 최초 Claude 기획·프로토타입.
- `64e2b49`, `1ff68d5`: Codex V5와 제작 가이드.
- `f7da8c1`, `bd240cc`, `5c67025`: Claude v7~v9 검수·재굽기·일방통행·성능.
- `47401dd`, `635bc7c`, `683f272`, `896dcc8`: Claude v10~v13 공유·3D 랩·실제 섬·표정/이동.
- `952a132`: Codex 독립 공중 섬.
- `0cd16b1`: Codex 엔진에 Claude 표현·조작 장점을 합친 주력.
- `6cd0b52`, `32c6a92`, `d862b83`, `bcce68c`: 렌더·모바일·주민 접수·철회·탐색 보강.

현재 선택은 [통합 정본](TECH_STACK_AND_INTEGRATION_2026-10-14.md), 과거 과정은 각 제작 노트와 Git log를 참고한다. AI 이름은 기여 이력을 설명하며 이후 구현 담당을 제한하지 않는다.
