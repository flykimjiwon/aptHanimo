# 한바퀴 실행본·서비스 검사·CI 가이드

2026-10-12 KST. 제품 기준은 Codex 단지 섬 `952a132`, Claude v12 `683f272`다. 이번 변경은 서버 설정·반복 가능한 HTTP/WebSocket 검사·분리된 CI·인계 문서다. 게임 화면·이동 엔진·공간 데이터는 변경하지 않았다.

## 1. 최신 실행본 열기

저장소 루트에서 실행한다. Bun 1.3.14와 커밋된 `bun.lock`을 사용한다.

```sh
cd codex
bun install --frozen-lockfile
bun test
bun run build
bun run smoke
bun start
```

| 페이지 | 주소 | 범위 |
|---|---|---|
| Codex 본편 | http://localhost:5178/ | 실제 좌표의 세 단지 자유 산책 |
| Codex 스타일 실험실 | http://localhost:5178/style-lab.html | 캐릭터·건물·지도 스타일 비교 |
| Codex 단지 섬 | http://localhost:5178/island.html | 왕십리자이 한 단지의 별도 비교판 |
| Claude 본편 | http://127.0.0.1:8793/dev.html | 아래 정적 서버 실행 필요 |
| Claude 3D 랩 | http://127.0.0.1:8793/stylelab3d/index.html | 실제 섬 3곳, Three.js CDN 인터넷 필요 |

별도 터미널의 저장소 루트에서 Claude 서버를 실행한다.

```sh
python3 -m http.server 8793 --bind 127.0.0.1 --directory prototype
```

`bun start`는 최신 `dist/`를 제공한다. 소스가 최신이어도 빌드나 실행 디렉터리가 오래되면 과거 화면이 나온다. 이번 로컬 검사에서도 기존 5178 서버가 이전 독립 폴더를 실행해 `/island.html`이 404였고, 최신 checkout의 빌드로 서버를 교체한 뒤 200과 파일 바이트 일치를 확인했다. 서버 종료는 포트 소유자·실행 경로를 확인한 뒤 자신이 시작한 프로세스에만 한다.

`bun run dev`는 Vite 개발 서버다. 실제 접속자 통신까지 확인하려면 HTTP와 `/presence`를 함께 제공하는 `bun start`를 사용한다. 로컬 서버는 터미널/프로세스가 종료되면 멈춘다. Git push는 공개 웹 서비스 배포가 아니다.

## 2. 서버 환경변수

| 변수 | 기본값 | 허용값 |
|---|---|---|
| `HANBAKWI_PORT` | `5178` | 십진 문자열 `0`~`65535`. `0`은 OS가 빈 포트 선택. 음수·소수·공백·앞자리 0은 거부 |
| `HANBAKWI_HOSTNAME` | `0.0.0.0` | `0.0.0.0`, `127.0.0.1`, `::`, `::1` |

예: `HANBAKWI_HOSTNAME=127.0.0.1 HANBAKWI_PORT=5180 bun start`. 기본값은 같은 Wi-Fi에서 LAN IP로 접속하는 기존 동작을 유지한다. IPv6는 설정 허용값이며 이번 실제 접속 검사는 IPv4에서 수행했다. 잘못된 설정은 listen 전에 종료 코드 1로 실패한다.

## 3. 반복 가능한 서비스 검사

```sh
bun run build
bun run smoke
bun run smoke --help
```

`scripts/smoke-server.mjs`가 `127.0.0.1:0`에 자신의 Bun 서버를 시작한다. 5178을 재사용하지 않으며 현재 폴더가 아닌 스크립트 위치로 앱 경로를 찾는다. 시작 제한 10초, 개별 요청·WebSocket 이벤트 제한 5초다. 성공과 예외 모두 자식 서버를 정리한다. 기존 서버·브라우저·localStorage는 조작하지 않는다.

- HTTP: `dist/`의 모든 비압축 파일(현재43개)을 실제 응답과 바이트 비교. 본편·스타일 랩·섬 3개 진입점, JS/CSS·월드·문맥·도감·브랜드 자산 포함. ETag/304, gzip GET·HEAD와 `q=0`, MIME 추측 방지, 정적 자산 캐시, 400/403/404/405/426 및 WebSocket 방·Origin 오류를 확인한다. 현재 **54건**이며 빌드 파일 수에 따라 바뀐다.
- WebSocket: 준비·같은 방 두 접속자·좌표 전파·다른 방 격리·잘못된 위치1008·잘못된 JSON1007·퇴장 알림을 실제 소켓으로 확인한다. 출력은 **6개 검증 항목**이다. 무작위 방을 사용해 실행 간 충돌을 피한다.
- 빌드 누락이나 알 수 없는 인자는 종료 코드1로 실패한다. 시작 실패와 HTTP500을 주입한 임시 복사본에서도 실패 후 자식 PID가 남지 않는 것을 확인했다. 검사 두 개를 동시에 실행해 모두 통과했다.

이는 서비스 검사다. 캐릭터 이동감·화면 배치·핀치·GPU 성능의 통과 근거로 사용하지 않는다. 예상치 못한 정상 WebSocket 종료는 다음 메시지의 5초 제한에서 실패할 수 있다. 강제 OS 종료나 장시간 부하까지 검증한 것은 아니다.

## 4. GitHub Actions

정본: [`.github/workflows/verify.yml`](../../.github/workflows/verify.yml). `main` push, PR, 수동 실행에서 **Codex app**과 **Prototype**을 별도 job으로 실행한다. 두 레인의 테스트 수를 합산하지 않는다.

| Job | 실행 | 환경 |
|---|---|---|
| Codex app | frozen install → Bun test → 타입 검사 포함 build → smoke → Biome | Ubuntu24.04, Bun1.3.14 |
| Prototype | 규칙149 → 검증기11 → 본편·2D 랩·3D 섬 데이터 재생성 → 6개 생성물 Git diff | Ubuntu24.04, Node22, Python3.12, 고정 Python hash seed |

각 job은 10분 제한, 권한은 `contents: read`, checkout 인증정보 저장은 끈다. Actions는 전체 commit SHA로 고정한다. GitHub runner에 네트워크는 있지만 Prototype 검사 명령은 커밋된 자료만 사용한다. `bake.sh`, `--refresh`, 골든 `--update`는 CI에 넣지 않는다. 검증 중 OSM 갱신이나 기준값 변경이 일어나지 않게 하기 위해서다.

Prototype 재현 명령(저장소 루트):

```sh
node prototype/tests/run.mjs
node --test prototype/tests/harness.test.mjs
python3 prototype/assemble.py
python3 prototype/build.py
python3 prototype/stylelab/build_stylelab.py
python3 prototype/stylelab3d/build_island_data.py
git diff --exit-code -- prototype/template.html prototype/index.html prototype/dev.html prototype/stylelab/index.html prototype/stylelab/dev.html prototype/stylelab3d/island_data.js
```

CI는 브라우저 회귀·실기 모바일·배포를 실행하지 않는다. branch protection의 필수 검사 설정도 변경하지 않았다. 실제 실행 결과는 [GitHub Actions](https://github.com/flykimjiwon/aptHanimo/actions/workflows/verify.yml)에서 해당 커밋을 확인한다.

구성 근거: Bun의 [HTTP 서버 설정](https://bun.sh/docs/runtime/http/server), [CI 안내](https://bun.sh/guides/runtime/cicd), GitHub의 [Actions 보안 권장사항](https://docs.github.com/en/actions/reference/security/secure-use).

## 5. 운영 보강 당시 결과와 한계

2026-10-13 주력 통합 이후에는 [통합판 검증](UNIFIED_VILLAGE_2026-10-13.md)을 먼저 따른다. 네 HTML 진입점·113테스트·HTTP62/WS6이 현재 기준이며 아래 표는10/12 운영 보강의 역사 기록이다.

| 표면 | 실제 결과 |
|---|---|
| Codex 단위·엔진 검사 | 105 pass / 0 fail, 9,539 assertions / 21파일 |
| TypeScript·production build | 종료0, gzip 자산39개 |
| 변경 서버·smoke Biome | 진단0 |
| 전체 Biome | 종료0, 기존 경고26·정보59. 경고0이라고 표현하지 않음 |
| 격리 서비스 및 교체한 5178 | 각각 HTTP54·WebSocket6 통과 |
| CLI 실패·수명 | help0, 잘못된 인자/환경1, 동시2회 통과, 시작/HTTP 실패 후 자식 정리 |
| Prototype | 규칙149/149, 검증기11/11, 재생성6파일 일치 |
| 기존 브라우저 자료 | 이동·수첩·3D 컨셉·섬 가이드에 시점별 보존. 이번에는 브라우저 미조작 |

검토와 원인 분석은 [이번 운영 검증 기록](../qa/operations-2026-10-12/REVIEW.md)을 따른다. 실기 iOS/Android, 브라우저 회귀 CI, 공개 서비스 운영은 남아 있다. 실제 좌표·DEM·실내 예시·광고 데모의 경계는 기존 제작 가이드를 유지한다.

## 6. AI 인계·다운로드 묶음

다음 AI는 루트 `AI_HANDOFF.md` → 담당 레인 인계 → 이 문서 순서로 읽고, `git status`, `git log`, 원격 SHA부터 확인한다. 오래된 독립 폴더와 기존 V5 ZIP을 최신 소스로 사용하지 않는다.

새 전달물은 최종 커밋의 `git archive`로 생성한다. 소스 ZIP에는 두 레인과 기획·출처 문서가 포함되고 `node_modules`, `dist`, 연구 사진 원본, 개인 경로는 포함하지 않는다. 별도 합본 문서는 전체 기획·두 레인 제작 가이드·카탈로그·출처·현재 검증을 모으고 기준 SHA를 기록한다. ZIP 무결성과 SHA-256을 확인하며 기존 V5 전달물은 역사 자료로 보존한다.
