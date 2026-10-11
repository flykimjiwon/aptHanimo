# vendor/pixelcrew_sprites.js
- 출처: `~/Desktop/kimjiwon/my-projects/pixelcrew-desk/src/renderer/shared/sprites.js` (PixelCrew Desk v0.9.x, 2026-09, MIT © 2026 Jiwon Kim — 사용자 본인 저작).
- **원문 그대로 복사(수정 0)**. PixelCrew 문서 §3-5 "원본 픽셀맵 변형 금지"를 지키기 위해 조명·배치는 프로토 쪽(`src/05_dynamic.js`의 `ghostCanvas`)에서만 후처리한다.
- 크루 명부(`crew.js`)는 색·액세서리·소품·이름만 추려 `05_dynamic.js`에 인라인(`self.PixelCrewRoster`).
- 갱신: 원본이 바뀌면 이 파일을 다시 복사하고 `python3 assemble.py && python3 build.py`.
- **v4(2026-10-11 밤)부터 본편 조립(`assemble.py`)에서 제외** — 캐릭터가 스타일 랩에서 고른 동숲풍 주민(코드 드로잉, `05_dynamic.js` `drawVillager`)으로 바뀜. 이 파일은 보관본(수정 0)이며 `../../template_v3_pixelcrew_backup.html`(v3 완성본)과 스타일 랩 `stylelab/src/vendor.js`가 계속 쓴다. 되돌리기는 가이드 §6-3.
- **v5(같은 날 밤)**: 사용자가 픽셀크루 × 코티지 × 연필 스케치를 골라 **다시 조립에 포함**(`assemble.py` parts, `04_route.js` 끝 명부 뒤). `STYLE.char='villager'`면 엔진은 실려도 쓰이지 않는다. 원문 수정 0은 그대로.
