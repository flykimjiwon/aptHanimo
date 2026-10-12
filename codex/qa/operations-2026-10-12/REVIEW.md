# 서버·CI·인계 검증 기록

2026-10-12 KST. 기준 소스 `952a132` 이후 운영 보강. UI·게임·공간 데이터 변경 없음. 이번 검증 표면은 CLI·실서버 HTTP·WebSocket이며 새 브라우저/모바일 검증으로 해석하지 않는다.

## 실제 실행

| 명령/시나리오 | 관찰 |
|---|---|
| `bun test` | 105 pass, 0 fail, 9,539 expect calls, 21파일 |
| `bun run check`, `bun run build` | 종료0, 압축 자산39개 |
| `bun run lint` | 종료0, 기존 경고26·정보59 |
| 변경 서버·smoke만 Biome | 진단0 |
| `bun run smoke` | HTTP54, 정적43파일, 진입점3, WebSocket6 통과 |
| `bun run smoke --help` | 종료0, 사용법 출력 |
| 알 수 없는 CLI 인자 | 종료1, `Unknown argument. Use --help.` |
| 누락된 빌드 임시 복사본 | 종료1, `Missing dist/index.html; run bun run build first` |
| `HANBAKWI_PORT=70000`, 잘못된 hostname | listen 전 Zod 오류, 종료1 |
| 동시 smoke 2개 | 모두 종료0, 별도 임시 포트 |
| 시작 실패 임시 복사본 | 종료1, 시작 실패 표시, 자식 PID 종료 확인 |
| HTTP500 임시 복사본 | 종료1, 응답 불일치 표시, 자식 PID 종료 확인 |
| 교체한 기본5178 서버 | 동일 HTTP54/WS6 통과, curl `/island.html` 200과 최신 빌드 바이트 일치 |
| Claude8793 | 본편과 3D 랩 HTML200, 커밋된 파일 바이트 일치 |
| Prototype 규칙/검증기 | 149/149, 11/11 |
| Prototype 4개 생성기 | 임시 복사본에서 실행, 생성물6개 바이트 일치 |

`smoke` 출력의 일부:

```json
{
  "status": "PASS",
  "surface": "HTTP/WebSocket, not browser UI",
  "http": { "checks": 54, "staticFiles": 43, "entries": 3 },
  "websocket": {
    "checks": 6,
    "sameRoomMovement": true,
    "separateRoom": true,
    "invalidPosition": 1008,
    "invalidJson": 1007,
    "leaveBroadcast": true
  }
}
```

## 세 가지 런타임 가설과 증거

1. **실행본과 최신 소스가 다르다. 확인.** 기존5178 프로세스의 cwd는 이전 독립 작업 폴더였고 `/island.html`은404였다. 최신 checkout에는 섬 빌드가 있었다. 확인한 기존 프로세스만 종료하고 현재 `codex/`에서 시작하자 같은 주소가200과 새 파일 바이트를 반환했다. 이전 폴더는 보존했다.
2. **고정 포트가 격리 검사를 막는다. 확인.** 서버 수정 전 새 CLI는 `Smoke must use its own dynamic port`로 종료1이었다. 환경변수 검증과 포트0을 연결한 뒤 성공했으며, 두 검사를 동시에 실행해도 통과했다. 기본5178 서버는 그대로 유지됐다.
3. **단위 검사·빌드만으로 실제 서비스 실패를 놓칠 수 있다. 경계 확인.** 기존105테스트·빌드가 통과해도 이전 서버는 섬404였다. 새 CLI는 실제 파일과 응답을 비교하고, 임시 HTTP500/시작 실패를 종료1로 검출했다. 정상 실서버에서 캐시·압축·오류 응답·같은 방 이동·다른 방·유효하지 않은 메시지·퇴장까지 통과했다.

## 독립 검토

3명의 검토 담당자가 두 차례에 걸쳐 5개 영역을 검토했다. 모두 최종 PASS다. 구현 검토의 통과와 최종 원격 발행·아카이브 무결성 확인은 별도로 기록한다.

| 검토 영역 | 최종 판정 | 근거 |
|---|---|---|
| 목표·제약 | PASS | 오래된 실행본 교체, 독립 검사, CI, 최신 인계 범위 충족. 게임·데이터 변경 없음 |
| CLI/서비스 QA | PASS | 정상·도움말·실패 입력·동시 실행·실패 후 정리 재현 |
| 코드 품질·수명 | PASS | 타입·테스트·smoke 재실행, timeout과 자식 정리 확인 |
| 보안·workflow | PASS | 경계 검증·SHA 고정·최소 권한·비밀값 비사용 |
| 문맥·인계 | PASS | 아래 4건 정정 후 재검토. 로컬 문서 링크 누락0, 출처·버전·수치 대조 |

- 코드 정확성·수명: **PASS**, 차단 결함 없음. 실제 타입 검사·테스트·smoke 재현. 정상 소켓이 예상보다 일찍 닫히면 메시지 대기 제한5초 뒤 실패하는 진단 지연은 비차단 관찰이다.
- 보안·workflow: **PASS**. SHA 고정·읽기 권한·인증정보 비보존·시간 제한·frozen lockfile·Origin/room/경로/페이로드 경계 확인. 데이터 갱신이나 기준값 덮어쓰기는 CI에 없다.
- CLI/서비스 QA: **PASS**. happy/help/잘못된 입력·설정/동시 실행/실패 후 자식 정리를 실제 실행했다.

문맥 검토에서 섬 빌드 진입점 누락, 이미 구현한 서비스 CI와 수첩 재방문의 백로그 잔류, 인수 문구의 V8/81테스트 기준을 발견했다. `AI_HANDOFF.md`와 Codex 인계에서 이를 정정하고 재검토를 통과했다. 원래 이동·브라우저 검증 기록은 삭제하지 않았다.

구현 커밋: `3fcd6ea`(서버와 격리 검사), `d3e6c61`(두 CI job). 최종 문서 커밋과 원격 CI는 저장소 이력 및 [Actions](https://github.com/flykimjiwon/aptHanimo/actions/workflows/verify.yml)에서 해당 SHA를 확인한다. Downloads 합본·해시 영수증에는 아카이브 기준 전체 SHA와 실제 실행 URL을 기록한다.

## 한계와 정리

OS 강제 종료·장시간 접속 부하·실기 iOS/Android·브라우저 회귀 CI·공개 서비스 배포는 이번 범위가 아니다. 빌드의 기존 Zod 주석·500kB 초과 청크 경고와 전체 Biome 경고는 남아 있다. 새 코드의 진단은0이다.

테스트 자식과 임시 복사본은 정리했다. 로컬 사용자용5178·8793 서버는 의도적으로 유지한다. 브라우저 저장값·사용자 제어 공간은 조작하지 않았다. 개인 경로·PID·원본 로그는 공개 기록에서 제외했다. 생성물·디버그 임시 파일·의존성은 커밋하지 않는다.
