# aptHanimo 공통 작업 계약

Claude·Codex 등 다음 작업자는 [현재 스택·통합 정본](docs/TECH_STACK_AND_INTEGRATION_2026-10-14.md), [원본 보존 목록](docs/PROTOTYPE_ARCHIVE_2026-10-14.md), `AI_HANDOFF.md` 순서로 읽는다.

- 사용자 선택은 Codex 기반 주력 하나다. 새 제품 기능의 기본 위치는 `codex/src/village/`와 관련 공유 모듈이다. AI별 폴더 독점 규칙은 현재 협업 기준이 아니다. 동시 작업자는 파일 책임을 정하고 서로의 변경을 되돌리지 않는다.
- `/world.html`, `/island.html`, `/style-lab.html`, `prototype/`와 기존 제작 문서를 보존한다. 실험을 주력으로 덮어쓰거나 원본을 삭제하지 않는다.
- `IMJANG_WORLD_MASTER_2026-10-11.md`의 Phaser·React·Supabase 계획은 역사다. 현재는 vanilla TypeScript·Three.js·Vite·Bun·SQLite이며 명시적 제품 결정 없이 엔진을 교체하지 않는다.
- `prototype/` 수정이 필요한 작업은 정본을 수정하고 생성물을 재생성한다. 생성 HTML 수기 수정, PixelCrew 원문 변경, Claude 골든 시간을 Codex 경로 정답으로 복사하는 작업은 피한다.
- 실제 좌표·원자료·출처와 게임 연출·추정을 구분한다. 출처 누락은 unknown이며 임의로 확정하지 않는다. OSS 코드 라이선스와 지도/사진/모델 이용 조건을 별도로 기록한다.
- 주민 SQLite·사진 BLOB·receipt·환경변수·원문 수집 파일을 커밋하지 않는다. 테스트/QA는 임시 DB·분리 포트를 사용한다. 기존 사용자 저장 기록을 초기화하지 않는다.
- Codex 변경은 `bun test`, `bun run build`, `bun run smoke`, `bun run lint`를 적절히 실행한다. UI 변경은 실제 브라우저에서 모바일/데스크톱을 확인하고 실기 미검증은 명시한다. 문서만 수정할 때는 링크·사실·보존 검사를 수행한다.
- Git은 상태 확인 후 경로/허용된 hunk만 stage한다. unrelated dirty, 다른 세션의 staged 변경을 보존한다. pull은 `--ff-only`, force push와 `--no-verify`는 사용하지 않는다.
- 새 세션은 문서의 과거 수치 대신 현재 HEAD와 원격·테스트를 확인한다. 오픈소스 후보 조사와 실제 도입/호환 검증을 구분한다.
