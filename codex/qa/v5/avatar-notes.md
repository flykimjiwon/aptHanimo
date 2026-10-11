# V5 메인 월드 캐릭터 스타일 구현 기록

## 결과

메인 Three.js 월드에서 `CharacterStyle` 10종을 모두 생성할 수 있다. 외부 캐릭터 자산을 추가하지 않았고, 모든 스타일은 사용자 PixelCrew의 돔형 몸, 흰 사각 눈, 분홍 볼, 노란 스카프, 세 발 문법을 유지한다.

| 렌더 경로 | 스타일 |
|---|---|
| 방향성 아틀라스 | `crew-pixel`, `paper-scout`, `ink-friend`, `sticker-pop` |
| 실제 저폴리 메시 | `round-buddy`, `voxel-walker`, `plush-crew`, `bead-crew`, `rubber-hose`, `leaf-guide` |

픽셀 스타일은 기존 32×40 셀과 nearest filtering을 유지한다. 종이·잉크·스티커는 더 큰 셀과 linear filtering을 사용하며, 4방향·4프레임 아틀라스를 스타일 변경 시 한 번 만든다. 각 사람은 자기 CanvasTexture를 소유하므로 개별 아바타 폐기 수명과 충돌하지 않는다.

실체 스타일은 구형·박스·캡슐·구슬·잎·스티치 등 서로 다른 실제 Three geometry로 구성한다. 전 스타일에 얼굴, 스카프와 세 발이 있으며, 동행 성인·아이와 자동차 운전자도 현재 스타일을 따른다. 기존 자전거, 유모차, 자동차 메시와 그림자도 유지된다.

## 공개 계약

- `avatar(mode, party, options?: AvatarOptions)`
- `AvatarOptions`: `{ color?: string; style?: CharacterStyle }`
- `PlayerAvatar.setStyle(style: CharacterStyle): void`
- `PeerAvatars.setStyle(style: CharacterStyle): void`

기존 `PlayerAvatar.set(mode, party)`와 `PeerAvatars.set(peers, layer)`는 유지된다. 스타일 변경은 새 표현을 만든 뒤 현재 위치와 회전을 복사한다. 모드, 파티, 원격 목표 위치, 이동 경로·충돌·실제 거리 상태는 캐릭터 표현과 분리되어 있다.

## 움직임과 수명

- 아틀라스 프레임과 메시 발·몸의 보행은 실제 누적 이동 거리에서 계산한다.
- 입력이 막히거나 정지하면 메시 발 회전·높이와 몸 높이가 정확한 기준 자세로 돌아간다.
- 감소 모션에서는 이동 중에도 정지 자세를 사용한다.
- 매 프레임 새 geometry, material, texture 또는 Vector 객체를 만들지 않는다.
- 스타일 교체 때 기존 그룹은 `disposeGroup()`으로 geometry, material, texture를 중복 없이 폐기한다.

## 자동 검증

- 10개 ID가 모두 명시적인 atlas/solid 경로를 선택한다.
- 6개 메시 스타일이 각각 고유한 geometry 구성을 가지며 눈 2개, 볼 2개, 스카프, 발 3개를 갖는다.
- 거리 기반 움직임 뒤 정지 자세가 복원된다.
- walk/stroller/bike/car와 family 동행이 메시 스타일에서 유지된다.
- 원격 사용자 스타일 변경이 현재 위치·회전과 동행을 보존한다.
- `bunx biome check` — 소유 파일 통과
- `bun test` — 57 통과, 실패 0
- `bun run build` — TypeScript와 Vite 프로덕션 빌드 통과. 기존 500kB 청크 경고만 남는다.

## 남은 시각 검증

Ego TaskSpace 53은 사용자가 제어 중이므로 브라우저를 조작하지 않았다. 실제 화면에서 10종의 크기 균형, 카메라별 뒷면·측면 실루엣, 야간 톤, 모바일 가독성은 통합 담당자의 후속 시각 QA가 필요하다.
