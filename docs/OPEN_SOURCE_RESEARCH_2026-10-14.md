# 임장·주민 커뮤니티를 위한 오픈소스 조사

조사일: 2026-10-14. **65개 저장소**의 기능·소스 스냅샷·라이선스 원문을 대조했다. 지도/3D, 캐릭터 제작, 주민 커뮤니티·운영, 현장 조사·오프라인, 사진 측량까지 범위를 넓혔다. 전 세계의 모든 프로젝트를 망라했다는 뜻은 아니다. 무료 자산·공공 데이터·source-available 제품은 OSS 코드와 구분한다. [S1]

기준 앱: Three 0.180.0 + vanilla TypeScript + Vite + Bun 1.3.14 + SQLite. [현재 스택과 통합 방향](TECH_STACK_AND_INTEGRATION_2026-10-14.md), [프로토타입 보존 목록](PROTOTYPE_ARCHIVE_2026-10-14.md)을 먼저 읽는다. **이번 조사는 제품에 새 의존성을 설치하지 않았다.**

## 먼저 참고할 조합

| 목적 | 우선 후보 | 이 제품에서의 적용 판단 |
|---|---|---|
| 주민 사진·의견이 실제 개선으로 이어짐 | [FixMyStreet](https://fixmystreet.org/pro-manual/admin-tasks/) | 위치 제보→검토→상태→응답 패턴을 참고. 현재 서버에 요청/답변 연결과 변경 이력을 구현하는 것이 우선 |
| 현장 활동의 재미·사용성 | [StreetComplete](https://github.com/streetcomplete/StreetComplete) | 주변 장소에서 작은 질문 하나씩 해결. 방문 도장에 관찰 근거를 연결하되 민원 수·사진 수 경쟁을 만들지 않음 |
| 고유한 귀여운 캐릭터 | [Blender](https://www.blender.org/about/license/) 또는 [Blockbench](https://github.com/JannisX11/blockbench) | 직접 만든 동물 1종·자체 리그·6상태 GLB. 현재 절차적 캐릭터는 유지 |
| 자산 검사·경량화 | [glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | 먼저 GLB 품질/노드/클립 검사, 이후 압축. 자동 품질·FPS 향상 약속 없음 |
| 사용성 회귀 방지 | [Playwright](https://github.com/microsoft/playwright) + 기존 axe-core | 모바일 제출·실패·검토 전후·철회를 CI로 검증. 실기 검증을 대체하지 않음 |
| 사진을 포함한 복구 | [Litestream](https://litestream.io/reference/restore/) | 도구 선정 전에 현재 SQLite의 일관된 백업·새 서버 복원 검증. DB에 사진 BLOB도 들어 있음 |
| 지도 자료 정확도 | 공공 건물 자료 + 필요할 때 Turf/proj4 | 실제 한 단지의 CRS·경계·hole·출처 검증. 렌더러 교체보다 우선 |

위 우선순위는 현재 코드의 빈틈과 공식 프로젝트의 기능을 연결한 **설계 판단**이다. 의존성 도입 순위나 성능 측정 결과가 아니다. [S2]

## 선택을 바꾼 검증 결과

- **현재 버전 유지:** maplibre-gl-three 3.0.2는 Three ^0.186.1을 peer로 선언해 현재 0.180을 제외한다. 카메라 소유권도 MapLibre로 바뀐다. 즉시 붙이는 성능 도구가 아니다. [S3] [manifest](https://github.com/safwat-halaby/maplibre-gl-three/blob/5e769e41f547f3ada539a811f6d9bd2601eed638/package.json#L60-L64)
- **압축 포맷:** Three r180 GLTFLoader는 EXT_meshopt를 지원하지만 KHR_meshopt handler는 없다. 알 수 없는 required extension에서 단순 경고 후 진행할 수 있어 성공 콜백만으로 자산이 정상이라고 판단하면 안 된다. 최소 빈 scene fixture도 경고 후 resolve를 재현했다. 실제 압축 모델은 별도 검증 대상이다. [loader](https://github.com/mrdoob/three.js/blob/0af9729d0c143a86a1d725d6e2c3ad83301f3f34/examples/jsm/loaders/GLTFLoader.js#L518-L524), [출력 옵션](https://github.com/zeux/meshoptimizer/blob/b2330430776a95a1545f03fc7bf16927f8cadc59/gltf/README.md#L93-L99)
- **BVH 실험:** 제품 밖에서 Three0.180 + three-mesh-bvh0.9.16을 설치하고 합성 box의 hit/miss/측면 ray 3개를 비교해 결과 일치를 확인했다. 실제 앱 FPS, 건물 수에 따른 이득, 메모리 절감은 측정하지 않았다. picking이 병목일 때만 도입한다. [S1]
- **서버 선택:** MinIO는 공식 README에 유지보수 종료를 명시하고 저장소가 archived 상태다. 새 기본 저장소 추천에서 제외한다. 구 rapier.js의 archived 상태는 Rapier 전체 종료와 달리 공식 본체로의 bindings 이동이다. [MinIO](https://github.com/minio/minio/tree/7aac2a2c5b7c882e68c1ce017d8256be2feea27f), [Rapier bindings](https://github.com/dimforge/rapier/blob/475caa3ff4646fd9a796b67d14116256f4962bc7/bindings/typescript/README.md)
- **라이선스 분리:** Directus 현재 원문은 MSCL-1.0-GPL, Sentry 서버는 FSL-1.1-Apache-2.0이다. 일반적인 permissive OSS로 묶지 않는다. Sentry JS/Bun SDK는 별도 MIT이며 @sentry/bun11.7.0은 Bun>=1.3.14를 선언한다. 선언 호환과 실제 통합 검증은 다르다. [S4] [Directus](https://github.com/directus/directus/blob/8e140f94250834cea0a0fb6eb822cac39ed9faec/license), [Sentry server](https://github.com/getsentry/sentry/blob/166d88610613dcf02bed435ead31f6fd6482a6df/LICENSE.md), [SDK](https://github.com/getsentry/sentry-javascript/blob/51b1946a9947e828931e1466ddefdad9c8a4c8e1/packages/bun/package.json#L8-L12)
- **Uppy 조건:** published core6.2.0 + dashboard6.0.1 + xhr-upload6.0.1은 core peer가 일치한다. 기존 multipart/receipt 계약과 실제 통합은 미검증. Golden Retriever는 opt-in 초안 복구 후보이며 기본 만료 설정을 정확한 시각의 안전 삭제 보장으로 소개하지 않는다. [문서](https://uppy.io/docs/golden-retriever/), [저장 기본값](https://github.com/transloadit/uppy/blob/d31568153784e9f69cf09ab1a63ef77fe1cafa30/packages/@uppy/golden-retriever/src/IndexedDBStore.ts#L135-L139)

## 저장소 카탈로그

모든 source/라이선스 링크는 조사 시점 **commit SHA에 고정**했다. SHA는 특정 소스 스냅샷이며 npm 배포 버전과 동일하다고 가정하지 않는다. 65개 license URL은 직접 HTTP200과 내용 해시를 확인했다. 라이선스 열은 원문 선언의 요약으로, dependency·asset·상표·hosted service 조건까지 일괄 허용한다는 뜻이 아니다. 제품에 복사할 때는 선택한 파일과 배포 형태를 다시 확인한다. [S1]

판정: **이미 사용**=현행 설치, **우선 참고**=제품 흐름을 참고, **우선 실험**=작은 별도 제작/검증 작업, **조건부**=요구가 생길 때, **보류**=현재 비용·범위가 큼. 참고는 코드 복사나 라이선스 승계를 생략한다는 뜻이 아니다.

### 지도·공간

| ID·저장소 | 선언 라이선스 | 판정·적용 조건 |
|---|---|---|
| R01 [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh/tree/b0935a7ec5904d2c009880be8da843b2637f185d) | [MIT](https://github.com/gkjohnson/three-mesh-bvh/blob/b0935a7ec5904d2c009880be8da843b2637f185d/LICENSE) | **조건부**. 정적 메시 raycast 가속. Three 0.180+0.9.16 합성 교차검사 통과; 실제 병목 측정 후. |
| R02 [Turfjs/turf](https://github.com/Turfjs/turf/tree/0c20329dfc2b63555ddd5d5388c4858669df6037) | [MIT](https://github.com/Turfjs/turf/blob/0c20329dfc2b63555ddd5d5388c4858669df6037/LICENSE) | **조건부**. polygon·거리 검증에 필요한 하위 패키지만. 현재 자체 좌표 변환 교체는 불필요. |
| R03 [proj4js/proj4js](https://github.com/proj4js/proj4js/tree/7b94f6be407e25ea4b8b5ae80f0fece279a79ea4) | [MIT](https://github.com/proj4js/proj4js/blob/7b94f6be407e25ea4b8b5ae80f0fece279a79ea4/LICENSE.md) | **조건부**. 공공 건물 CRS가 실제로 필요할 때 변환 어댑터에 사용. |
| R04 [mourner/flatbush](https://github.com/mourner/flatbush/tree/bb12071743bfeaf1b11d232b0a07b7857cabfdf8) | [ISC](https://github.com/mourner/flatbush/blob/bb12071743bfeaf1b11d232b0a07b7857cabfdf8/LICENSE) | **조건부**. 불변 bbox 공간 색인. 순회 비용을 측정한 뒤 선택. |
| R05 [mourner/rbush](https://github.com/mourner/rbush/tree/e59712716a84dda2e31f9b471b32faa178d8056f) | [MIT](https://github.com/mourner/rbush/blob/e59712716a84dda2e31f9b471b32faa178d8056f/LICENSE) | **보류**. 동적 편집 색인 대안. Flatbush와 동시에 넣지 않음. |
| R06 [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js/tree/ec6de8ee0cc11644bf8d95df18c7d76e44811393) | [BSD-3-Clause](https://github.com/maplibre/maplibre-gl-js/blob/ec6de8ee0cc11644bf8d95df18c7d76e44811393/LICENSE.txt) | **조건부**. 동네 위치·주변 지도 별도 화면. 주력 Three 카메라 대체 아님. |
| R07 [protomaps/PMTiles](https://github.com/protomaps/PMTiles/tree/aec8fa1341222fdddb3318e9ffa8e18e19b312f7) | [BSD-3-Clause](https://github.com/protomaps/PMTiles/blob/aec8fa1341222fdddb3318e9ffa8e18e19b312f7/LICENSE) | **보류**. Range 요청 기반 지도 아카이브. 제공 데이터 이용 조건 별도. |
| R08 [protomaps/basemaps](https://github.com/protomaps/basemaps/tree/42ffaaa4a85a41bfcb23e43cc0f5b492a5eca123) | [BSD-3-Clause 코드 / CC0 디자인](https://github.com/protomaps/basemaps/blob/42ffaaa4a85a41bfcb23e43cc0f5b492a5eca123/LICENSE.md) | **참고**. 패키지 ISC 표기와 전용 LICENSE 차이 기록. 지도 원자료는 별도. |
| R09 [JamesLMilner/terra-draw](https://github.com/JamesLMilner/terra-draw/tree/911d9b492ca1a8b361cb0198894fc5cc3f2b4df5) | [MIT](https://github.com/JamesLMilner/terra-draw/blob/911d9b492ca1a8b361cb0198894fc5cc3f2b4df5/LICENSE) | **조건부**. 운영자가 경계·장소를 편집하는 요구가 생길 때. |
| R10 [geotiffjs/geotiff.js](https://github.com/geotiffjs/geotiff.js/tree/bfab64228071086ef2be0e95a6a6532bc853ddb1) | [MIT](https://github.com/geotiffjs/geotiff.js/blob/bfab64228071086ef2be0e95a6a6532bc853ddb1/LICENSE) | **조건부**. 오프라인 DEM 추출. CRS·nodata·수직 단위 확인 필요. |
| R11 [mapbox/martini](https://github.com/mapbox/martini/tree/f9a7a96b583affff6f9196b9f816a7ee980c5751) | [ISC](https://github.com/mapbox/martini/blob/f9a7a96b583affff6f9196b9f816a7ee980c5751/LICENSE) | **보류**. 지형 삼각형 병목 때. 2^k+1 격자와 오차 검증이 필요. |
| R12 [mapbox/earcut](https://github.com/mapbox/earcut/tree/20a6fae724a58dd78b637ab8477fa20a227c954e) | [ISC](https://github.com/mapbox/earcut/blob/20a6fae724a58dd78b637ab8477fa20a227c954e/LICENSE) | **참고**. 폴리곤 삼각분할. Three 내부 기능과 중복 설치하지 않음. |
| R13 [gkjohnson/three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg/tree/7f00d37cf6cf67ac73c3f770815d2e72636946a6) | [MIT](https://github.com/gkjohnson/three-bvh-csg/blob/7f00d37cf6cf67ac73c3f770815d2e72636946a6/LICENSE) | **보류**. 실험적 CSG. 닫힌 메시 전제; 현재 섬에 불필요. |
| R14 [NASA-AMMOS/3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS/tree/075b12387fd1219b6e9c4980205cadbc9130e550) | [Apache-2.0](https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/075b12387fd1219b6e9c4980205cadbc9130e550/LICENSE) | **보류**. 대규모 타일 스트리밍 요구 때. React 없는 three 진입점 가능. |
| R15 [mapillary/mapillary-js](https://github.com/mapillary/mapillary-js/tree/519977e4a64ba24b93e7e5b7948f0f761813290e) | [MIT](https://github.com/mapillary/mapillary-js/blob/519977e4a64ba24b93e7e5b7948f0f761813290e/LICENSE) | **보류**. 거리 사진 뷰어. HEAD Three 0.152.2 의존, 사진 이용 조건 별도. |
| R16 [CesiumGS/cesium](https://github.com/CesiumGS/cesium/tree/fa536f8b7bd056354c35f9ba0452f141829ae621) | [Apache-2.0](https://github.com/CesiumGS/cesium/blob/fa536f8b7bd056354c35f9ba0452f141829ae621/LICENSE.md) | **보류**. 지구·대규모 지리 화면에는 적합, 현재 단지 섬의 엔진 교체 비용 큼. |
| R17 [safwat-halaby/maplibre-gl-three](https://github.com/safwat-halaby/maplibre-gl-three/tree/5e769e41f547f3ada539a811f6d9bd2601eed638) | [MIT](https://github.com/safwat-halaby/maplibre-gl-three/blob/5e769e41f547f3ada539a811f6d9bd2601eed638/LICENSE.txt) | **보류**. 3.0.2 peer Three ^0.186.1: 현재 0.180 제외. MapLibre가 카메라 소유. |

### 캐릭터·제작

| ID·저장소 | 선언 라이선스 | 판정·적용 조건 |
|---|---|---|
| R18 [pixiv/three-vrm](https://github.com/pixiv/three-vrm/tree/1b4fc0cc7ef39a49d62bb7a66dcfeca8f65316f7) | [MIT](https://github.com/pixiv/three-vrm/blob/1b4fc0cc7ef39a49d62bb7a66dcfeca8f65316f7/LICENSE) | **조건부**. VRM 아바타 수요 때만. 모델 자체 권리·표정·리그는 개별 검증. |
| R19 [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform/tree/3797aad585021e68cf5fbf3f2fba37783596ffac) | [MIT](https://github.com/donmccurdy/glTF-Transform/blob/3797aad585021e68cf5fbf3f2fba37783596ffac/LICENSE.md) | **우선 실험**. 제작 도구로 GLB 검사·최적화. 시각/클립/노드 비교 후 결과 채택. |
| R20 [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer/tree/b2330430776a95a1545f03fc7bf16927f8cadc59) | [MIT](https://github.com/zeux/meshoptimizer/blob/b2330430776a95a1545f03fc7bf16927f8cadc59/LICENSE.md) | **조건부**. r180은 EXT meshopt 경로 사용. 최신 KHR 출력 기본 도입 금지. |
| R21 [JannisX11/blockbench](https://github.com/JannisX11/blockbench/tree/7c92e27d237e365110030d73e92c5d1605f0d311) | [GPL-3.0](https://github.com/JannisX11/blockbench/blob/7c92e27d237e365110030d73e92c5d1605f0d311/LICENSE.MD) | **우선 실험**. 각진 귀여운 원본 동물 모델 제작. 도구와 생성 자산의 권리는 별개. |
| R22 [blender/blender](https://github.com/blender/blender/tree/6bff2767edae535dba25246e8176b774af499870) | [GPL 계열 / 구성별](https://github.com/blender/blender/blob/6bff2767edae535dba25246e8176b774af499870/COPYING) | **우선 실험**. 둥근 동물 1종·자체 리그·6상태 GLB. 직접 만든 산출물 권리 유지. |
| R23 [dimforge/rapier](https://github.com/dimforge/rapier/tree/475caa3ff4646fd9a796b67d14116256f4962bc7) | [Apache-2.0](https://github.com/dimforge/rapier/blob/475caa3ff4646fd9a796b67d14116256f4962bc7/LICENSE) | **보류**. 물리 상호작용 수요 때. 경로 탐색 대체 아님; 구 rapier.js는 이관됨. |
| R24 [pmndrs/drei](https://github.com/pmndrs/drei/tree/bf6f4addf47467d3885de272d94ca5127f6ef68f) | [MIT](https://github.com/pmndrs/drei/blob/bf6f4addf47467d3885de272d94ca5127f6ef68f/LICENSE) | **참고**. React19/R3F9 peer. 현재 vanilla Three에 복사 설치하지 않음. |
| R25 [donmccurdy/three-pathfinding](https://github.com/donmccurdy/three-pathfinding/tree/b55cd7e825c5bd01965083f2543b13048a7d4127) | [MIT](https://github.com/donmccurdy/three-pathfinding/blob/b55cd7e825c5bd01965083f2543b13048a7d4127/LICENSE) | **참고**. navmesh 경로 계산. mesh 생성·crowd까지 제공한다고 가정하지 않음. |
| R26 [isaac-mason/recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js/tree/8769e8b9995f127033af9f6e6eeac3fad7d66201) | [MIT](https://github.com/isaac-mason/recast-navigation-js/blob/8769e8b9995f127033af9f6e6eeac3fad7d66201/LICENSE) | **보류**. WASM navmesh/crowd가 필요한 복잡한 실내·다중 NPC 단계. |
| R27 [Mugen87/yuka](https://github.com/Mugen87/yuka/tree/10591304811222d6856020d5de129b39ef43b58d) | [MIT](https://github.com/Mugen87/yuka/blob/10591304811222d6856020d5de129b39ef43b58d/LICENSE) | **참고**. 게임 AI 행동 패턴. 확인 HEAD가 2023년으로 활동 신호 제한. |
| R28 [google/draco](https://github.com/google/draco/tree/eb7c044bfc75302b4d1e87f6bd9bb1f670c82343) | [Apache-2.0](https://github.com/google/draco/blob/eb7c044bfc75302b4d1e87f6bd9bb1f670c82343/LICENSE) | **조건부**. 실제 GLB geometry 크기와 디코딩 비용을 비교한 뒤 선택. |
| R29 [BinomialLLC/basis_universal](https://github.com/BinomialLLC/basis_universal/tree/99f52d63aa6799cbdaecfe977111dc5ec3b31d47) | [Apache-2.0 + third party](https://github.com/BinomialLLC/basis_universal/blob/99f52d63aa6799cbdaecfe977111dc5ec3b31d47/LICENSE) | **조건부**. 텍스처 GPU 메모리가 커질 때 압축 제작 도구로 평가. |
| R30 [KhronosGroup/KTX-Software](https://github.com/KhronosGroup/KTX-Software/tree/1e31189218d016cd1b4096e644248ed20bbca22f) | [파일별 / 주로 Apache-2.0](https://github.com/KhronosGroup/KTX-Software/blob/1e31189218d016cd1b4096e644248ed20bbca22f/LICENSE.md) | **조건부**. KTX2 도구. 별도 파일/부속 라이선스 함께 확인. |
| R31 [godotengine/godot](https://github.com/godotengine/godot/tree/75e2933fcece578c97de58b61652d31c58f43428) | [MIT](https://github.com/godotengine/godot/blob/75e2933fcece578c97de58b61652d31c58f43428/LICENSE.txt) | **참고**. 3D 상호작용 설계 참고. 현재 웹 UI 전체를 게임 엔진으로 재작성하지 않음. |
| R32 [saturday06/VRM-Addon-for-Blender](https://github.com/saturday06/VRM-Addon-for-Blender/tree/644a13cfc4801776835f246097521795a17d5eee) | [MIT OR GPL-3.0-or-later](https://github.com/saturday06/VRM-Addon-for-Blender/blob/644a13cfc4801776835f246097521795a17d5eee/LICENSE_MAIN.txt) | **조건부**. 현대 extension Blender 4.2~5.3 manifest; legacy 경로와 구분. 자산 권리 자동 검증 아님. |

### 커뮤니티·운영

| ID·저장소 | 선언 라이선스 | 판정·적용 조건 |
|---|---|---|
| R33 [transloadit/uppy](https://github.com/transloadit/uppy/tree/d31568153784e9f69cf09ab1a63ef77fe1cafa30) | [MIT](https://github.com/transloadit/uppy/blob/d31568153784e9f69cf09ab1a63ef77fe1cafa30/LICENSE) | **조건부**. 업로드 진행·재시도 필요 때. 기존 한 장 multipart 계약 보존; Tus 자동 호환 아님. |
| R34 [tus/tusd](https://github.com/tus/tusd/tree/78cc2291823e171b20d915570e3b68f554eab908) | [MIT](https://github.com/tus/tusd/blob/78cc2291823e171b20d915570e3b68f554eab908/LICENSE.txt) | **보류**. 대용량 이어올리기용 별도 Go 서버. 현재 작은 사진에는 운영 비용 큼. |
| R35 [better-auth/better-auth](https://github.com/better-auth/better-auth/tree/ea85d133d640233c1564417f3bad611d99356bb9) | [MIT](https://github.com/better-auth/better-auth/blob/ea85d133d640233c1564417f3bad611d99356bb9/LICENSE.md) | **조건부**. 계정 도입 시 Bun SQLite 어댑터 검증. 익명 receipt 이관·권한 분리 필요. |
| R36 [supabase/supabase](https://github.com/supabase/supabase/tree/7fa436050a00a1b7c78b4bc87ee7eb3b483a78be) | [Apache-2.0 루트 / 구성별](https://github.com/supabase/supabase/blob/7fa436050a00a1b7c78b4bc87ee7eb3b483a78be/LICENSE) | **보류**. Postgres BaaS 대안. 현재 SQLite에 붙이는 작은 모듈이 아님. |
| R37 [appwrite/appwrite](https://github.com/appwrite/appwrite/tree/d4f6b094f1921418ea2878c617a4c79593da8a0f) | [BSD-3-Clause](https://github.com/appwrite/appwrite/blob/d4f6b094f1921418ea2878c617a4c79593da8a0f/LICENSE) | **보류**. 인증·저장·API 전체 플랫폼 대안. 중복 백엔드 피함. |
| R38 [pocketbase/pocketbase](https://github.com/pocketbase/pocketbase/tree/6f370ea741f33adf889eef02e3c1b884a47aa522) | [MIT](https://github.com/pocketbase/pocketbase/blob/6f370ea741f33adf889eef02e3c1b884a47aa522/LICENSE.md) | **보류**. Go+SQLite 대안. 기존 DB를 두 서버가 공유 운영하는 설계 금지. |
| R39 [directus/directus](https://github.com/directus/directus/tree/8e140f94250834cea0a0fb6eb822cac39ed9faec) | [MSCL-1.0-GPL](https://github.com/directus/directus/blob/8e140f94250834cea0a0fb6eb822cac39ed9faec/license) | **조건 검토**. 현재 source-available. 오래된 BSL 설명을 재사용하지 않음. |
| R40 [discourse/discourse](https://github.com/discourse/discourse/tree/2c0fdfb961995c8b818214a1cf928c364dd5c536) | [GPL-2.0-or-later](https://github.com/discourse/discourse/blob/2c0fdfb961995c8b818214a1cf928c364dd5c536/LICENSE.txt) | **참고**. 검토·신뢰·신고 UX. Ruby/Postgres/Redis 별도 운영체계. |
| R41 [NodeBB/NodeBB](https://github.com/NodeBB/NodeBB/tree/1fc9d42a3e07be4d1bd2f087bfdca889faf287da) | [GPL-3.0](https://github.com/NodeBB/NodeBB/blob/1fc9d42a3e07be4d1bd2f087bfdca889faf287da/LICENSE) | **참고**. 포럼·알림·모더레이션 패턴. 초기 단지 앱과 별도 포럼 운영은 보류. |
| R42 [flarum/framework](https://github.com/flarum/framework/tree/7a24c937fa2f24c56f0ec15f26825dda60df548a) | [MIT](https://github.com/flarum/framework/blob/7a24c937fa2f24c56f0ec15f26825dda60df548a/LICENSE.md) | **참고**. 가벼운 토론 UX. PHP 서버 앱이며 TS UI 컴포넌트가 아님. |
| R43 [mysociety/fixmystreet](https://github.com/mysociety/fixmystreet/tree/ead1998af192538dfb6bdacc3d449023fcf2c5f6) | [AGPL-3.0-or-later + 예외](https://github.com/mysociety/fixmystreet/blob/ead1998af192538dfb6bdacc3d449023fcf2c5f6/LICENSE.txt) | **우선 참고**. 위치·사진 제보→검토→처리 상태→응답. 주민 참여 루프에 가장 가까움. |
| R44 [decidim/decidim](https://github.com/decidim/decidim/tree/53e5b557dc73847b7b0cfdee963dc5c5522cfa32) | [AGPL-3.0](https://github.com/decidim/decidim/blob/53e5b557dc73847b7b0cfdee963dc5c5522cfa32/LICENSE-AGPLv3.txt) | **참고**. 제안·주민 참여·진행 상태 공개. 초기 투표 기능 남발은 피함. |
| R45 [benbjohnson/litestream](https://github.com/benbjohnson/litestream/tree/fd72802bc885fb535152f9a899ab6ce274d47ed3) | [Apache-2.0](https://github.com/benbjohnson/litestream/blob/fd72802bc885fb535152f9a899ab6ce274d47ed3/LICENSE) | **조건부**. SQLite 복제·복구. 현재 사진 BLOB도 DB에 포함; 실제 복원으로 평가. |
| R46 [minio/minio](https://github.com/minio/minio/tree/7aac2a2c5b7c882e68c1ce017d8256be2feea27f) | [AGPL-3.0](https://github.com/minio/minio/blob/7aac2a2c5b7c882e68c1ce017d8256be2feea27f/LICENSE) | **신규 기본값 제외**. 공식 README 유지보수 종료, 2026-04-25 archived 확인. AIStor와 구분. |
| R47 [seaweedfs/seaweedfs](https://github.com/seaweedfs/seaweedfs/tree/590a75b9d6994e549f03259987085019bcd0b6b2) | [Apache-2.0](https://github.com/seaweedfs/seaweedfs/blob/590a75b9d6994e549f03259987085019bcd0b6b2/LICENSE) | **보류**. 외부 S3 저장이 실제 필요할 때 후보. 지금 SQLite BLOB 이관 불필요. |
| R48 [getsentry/sentry](https://github.com/getsentry/sentry/tree/166d88610613dcf02bed435ead31f6fd6482a6df) | [FSL-1.1-Apache-2.0](https://github.com/getsentry/sentry/blob/166d88610613dcf02bed435ead31f6fd6482a6df/LICENSE.md) | **조건 검토**. 서버는 source-available. MIT JS SDK와 동일 라이선스로 소개하지 않음. |
| R49 [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript/tree/51b1946a9947e828931e1466ddefdad9c8a4c8e1) | [MIT](https://github.com/getsentry/sentry-javascript/blob/51b1946a9947e828931e1466ddefdad9c8a4c8e1/LICENSE) | **조건부**. @sentry/bun 11.7.0은 Bun >=1.3.14 선언. 민감정보 필터·실제 통합 미검증. |
| R50 [PostHog/posthog](https://github.com/PostHog/posthog/tree/77044003eb637d36abce1f85fa7715833978bf8e) | [MIT 루트 / ee 별도](https://github.com/PostHog/posthog/blob/77044003eb637d36abce1f85fa7715833978bf8e/LICENSE) | **보류**. 사용 행동 분석 전송 범위부터 결정. self-host 지원과 ee 조건 별도. |
| R51 [open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js/tree/c971f527d1c0ddbd53b2f8bbf7d0f1ad1a2f795f) | [Apache-2.0](https://github.com/open-telemetry/opentelemetry-js/blob/c971f527d1c0ddbd53b2f8bbf7d0f1ad1a2f795f/LICENSE) | **조건부**. 운영 추적. Node 자동 계측을 Bun 검증 완료로 간주하지 않음. |
| R52 [microsoft/playwright](https://github.com/microsoft/playwright/tree/b536a63898eef1e55c8570818f67b5b9cd95cbe6) | [Apache-2.0](https://github.com/microsoft/playwright/blob/b536a63898eef1e55c8570818f67b5b9cd95cbe6/LICENSE) | **우선 실험**. 모바일 주민 제출·검토·철회 E2E CI. Node runner→Bun HTTP 대상으로 분리. |
| R53 [dequelabs/axe-core](https://github.com/dequelabs/axe-core/tree/7e287a6ab8ac547eb63c0b8ca513a223eca16772) | [MPL-2.0](https://github.com/dequelabs/axe-core/blob/7e287a6ab8ac547eb63c0b8ca513a223eca16772/LICENSE) | **이미 사용**. 현재 4.14.0. 자동 검사 외 키보드·실기 확인 유지. |

### 현장·저장

| ID·저장소 | 선언 라이선스 | 판정·적용 조건 |
|---|---|---|
| R54 [streetcomplete/StreetComplete](https://github.com/streetcomplete/StreetComplete/tree/36bfcc84edc8e098dd26eb68e8cfef2b483bf8b5) | [GPL-3.0](https://github.com/streetcomplete/StreetComplete/blob/36bfcc84edc8e098dd26eb68e8cfef2b483bf8b5/LICENSE) | **우선 참고**. 주변 장소에서 한 번에 작은 질문 하나. 임장 체크를 놀이처럼; OSM에 사적 후기 전송 금지. |
| R55 [zverik/every_door](https://github.com/zverik/every_door/tree/6040b2fc7694c8d17c60e250b0df88e5ce008a06) | [GPL-3.0-or-later](https://github.com/zverik/every_door/blob/6040b2fc7694c8d17c60e250b0df88e5ce008a06/LICENSE) | **참고**. 시설 연속 조사 모바일 UX. 오래된 wiki ISC와 공식 현재 LICENSE 충돌; 공식 우선. |
| R56 [getodk/collect](https://github.com/getodk/collect/tree/5554c6ba6daae800e6d28b3afba1c9e30b5f2f12) | [Apache-2.0](https://github.com/getodk/collect/blob/5554c6ba6daae800e6d28b3afba1c9e30b5f2f12/LICENSE.md) | **참고**. 통신 불안정 현장의 구조화 폼·나중 전송. Android 별도 앱, TS 컴포넌트 아님. |
| R57 [deuxfleurs-org/garage](https://github.com/deuxfleurs-org/garage/tree/6a1f58ccb04ac19025656f2ece3a0f388067f7be) | [AGPL-3.0](https://github.com/deuxfleurs-org/garage/blob/6a1f58ccb04ac19025656f2ece3a0f388067f7be/LICENSE) | **보류**. 분산 S3 후보. GitHub는 공식 upstream 별도인 미러; freshness 추가 검증 필요. |
| R58 [rustfs/rustfs](https://github.com/rustfs/rustfs/tree/ceb53fef85ba64cab5abe4637d74bedb14533a2b) | [Apache-2.0](https://github.com/rustfs/rustfs/blob/ceb53fef85ba64cab5abe4637d74bedb14533a2b/LICENSE) | **보류**. S3 후보. GA 발표와 이 앱에서 검증된 운영 안정성은 다름. |
| R59 [dexie/Dexie.js](https://github.com/dexie/Dexie.js/tree/70e0a9c256189d0a0eeae644a434fb04c4d3ddfe) | [Apache-2.0](https://github.com/dexie/Dexie.js/blob/70e0a9c256189d0a0eeae644a434fb04c4d3ddfe/LICENSE) | **조건부**. IndexedDB 초안/전송 큐. Dexie Cloud 서비스는 다른 조건; idb와 택일. |
| R60 [jakearchibald/idb](https://github.com/jakearchibald/idb/tree/654c746bef13f9fe7f5871e03ac58015cebace5a) | [ISC](https://github.com/jakearchibald/idb/blob/654c746bef13f9fe7f5871e03ac58015cebace5a/LICENSE) | **조건부**. 작은 IndexedDB promise 래퍼. 기존 저장 실패·마이그레이션부터 검증. |
| R61 [GoogleChrome/workbox](https://github.com/GoogleChrome/workbox/tree/4ea3138a120fd2c87389b54130e25f47e0fd7089) | [MIT](https://github.com/GoogleChrome/workbox/blob/4ea3138a120fd2c87389b54130e25f47e0fd7089/LICENSE) | **보류**. 오프라인 shell과 캐시 갱신 요구 때. 민감 API/사진의 무차별 캐싱 금지. |

### 사진→3D

| ID·저장소 | 선언 라이선스 | 판정·적용 조건 |
|---|---|---|
| R62 [alicevision/Meshroom](https://github.com/alicevision/Meshroom/tree/7401abc4115f82dfc1a175917e44f5adada9a984) | [MPL-2.0](https://github.com/alicevision/Meshroom/blob/7401abc4115f82dfc1a175917e44f5adada9a984/COPYING.md) | **후기 실험**. AliceVision 기반 다중 사진 3D 파이프라인. 단일 주민 사진→정확한 단지 자동 생성은 아님. |
| R63 [colmap/colmap](https://github.com/colmap/colmap/tree/6db3867f60771f34fa66d166dcc00fee7d5c6dc0) | [BSD 계열 + 의존성 별도](https://github.com/colmap/colmap/blob/6db3867f60771f34fa66d166dcc00fee7d5c6dc0/LICENSE) | **후기 실험**. SfM/MVS 사진 측량 기반. 촬영 범위·축척·정합·경량화 별도 작업. |
| R64 [OpenDroneMap/ODM](https://github.com/OpenDroneMap/ODM/tree/77439b1f45ceb4775b826f900916c64f03736331) | [AGPL-3.0](https://github.com/OpenDroneMap/ODM/blob/77439b1f45ceb4775b826f900916c64f03736331/LICENSE) | **후기 실험**. 항공 사진 지도/점군/DEM 처리. 확보한 적법 촬영 자료에 한정. |
| R65 [WebODM/WebODM](https://github.com/WebODM/WebODM/tree/65786909a10b6e2834844889359b9b7584156b66) | [AGPL-3.0](https://github.com/WebODM/WebODM/blob/65786909a10b6e2834844889359b9b7584156b66/LICENSE.md) | **후기 실험**. ODM 처리 UI. 별도 중량 서버·제작 워크플로, 현재 앱 런타임에 넣지 않음. |

## 캐릭터 자산: 무료와 오픈소스는 구분

| 출처 | 확인 내용 | 적용 |
|---|---|---|
| [Kenney](https://kenney.nl/support) | asset page의 게임 자산은 CC0 안내. 로고는 별도 | 정확한 pack·포함 LICENSE를 기록한 배경 소품 후보 |
| [Quaternius 현재 license](https://quaternius.com/license.html) / [FAQ](https://quaternius.com/faq.html) | 2026-08-28 QAL은 자산 단독 재배포를 제한하지만 FAQ는 CC0라고 설명 | **공식 문서 충돌**. blanket CC0 추천 철회. 특정 pack의 적용 조건 확인 전 raw GLB 공개 repo 반입 보류 |
| [Poly Pizza 개별 예](https://poly.pizza/m/cwYvO5UauX) | 해당 캐릭터는 CC Attribution 표기 | 사이트 전체를 CC0로 취급하지 않음 |
| [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Adobe 계정 기반 무료 사용 안내 | OSS/CC0 아님. 직접 만든 리그의 자동 호환도 미검증 |

Blender/Blockbench의 도구 라이선스와 직접 창작한 모델의 권리는 구분한다. 가져온 제3자 모델의 조건은 그대로 남는다. VRM importer의 성공은 아바타 사용권 승인이 아니다. 원본 파일·파생 GLB·출처/권리 기록을 함께 관리한다. [S5] [Blockbench 원문](https://github.com/JannisX11/blockbench/blob/7c92e27d237e365110030d73e92c5d1605f0d311/README.md#L57-L62)

## 실제 지도·사진을 쓰는 경계

- [공공 GIS 건물 API](https://www.data.go.kr/data/15123970/openapi.do)와 [전국 건물 표준 자료](https://www.data.go.kr/data/15029175/standard.do)는 건물 윤곽/속성 후보다. VWorld 무키 요청은 HTTP200 안에 missing key 오류를 반환했다. 한 단지의 실제 geometry·CRS·허용 범위는 아직 확인되지 않았다.
- [OSM](https://www.openstreetmap.org/copyright)과 [Geofabrik 한국 자료](https://download.geofabrik.de/asia/south-korea.html)는 도로/건물 입력 후보이며 attribution·데이터 이용 조건을 유지한다. 주민 후기·사적 사진을 OSM Notes로 보내는 기능은 만들지 않는다.
- 현재 Codex는 [Mapzen terrain tiles](https://registry.opendata.aws/terrain-tiles/) 경로다. 저장 metadata는 SRTM과 일부 GMTED를 기록한다. [Tilezen 출처 안내](https://github.com/tilezen/joerd/blob/0b86765156d0612d837548c2cf70376c43b3405c/docs/attribution.md)를 참고하되 건물 경계/사진 권리와 분리한다.
- [Copernicus GLO-30 AWS](https://registry.opendata.aws/copernicus-dem/) 서울 COG 두 타일은 무인증 HEAD200·Range 지원을 확인했다. 래스터를 다운로드해 정확도를 검증한 것은 아니다. 건물·수목을 포함하는 약30m DSM이라 2m 통행 판정의 실측 근거가 될 수 없다. [S6] [provider 설명](https://copernicus-dem-30m.s3.amazonaws.com/readme.html), [데이터 조건](https://docs.sentinel-hub.com/api/latest/static/files/data/dem/resources/license/License-COPDEM-30.pdf)
- 주민 사진으로 현장 사실과 외관 디테일을 점진적으로 보강할 수 있다. Meshroom/COLMAP/ODM의 다중 사진 재구성은 후속 제작 실험이다. 단일 위성사진·임의 사진 한 장에서 정확한 단지 모델을 자동 생성한다고 약속하지 않는다. [Meshroom](https://github.com/alicevision/Meshroom), [COLMAP](https://github.com/colmap/colmap), [ODM](https://github.com/OpenDroneMap/ODM)

## 조사 방법·남은 검증

지도·성능, 캐릭터·제작, 커뮤니티·운영의 세 조사 축을 병렬 검토하고, 1차 후보→호환/권리 확인→반증 점검의 세 차례로 좁혔다. 부모 검토는 현재 소스/lockfile, 후보 license URL, 격리된 실행 probe와 문서 연결을 확인했다. 별점은 선택 기준으로 사용하지 않았다.

검증으로 바뀐 결론은 Quaternius blanket CC0 철회, 혼합 DEM 출처 발견, 구 Rapier 저장소와 본체 구분, axe 신규 도입 권고 제거, 사진 백업 범위를 SQLite BLOB으로 정정한 것이다. GitHub API 제한 등으로 일부 후보의 최신 활동 시각은 확보하지 못했으며 미검증을 활성 유지보수 보장으로 바꾸지 않았다.

남은 구현 검증: 실제 GLB 6상태, 실제 공공 건물 표본, Uppy 현행 endpoint, SQLite 복원, Sentry 데이터 필터, 물리 iOS/Android, 외부 공개 서비스 운영. 이 항목은 조사 완료와 별개다.

## 출처

카탈로그 R01~R65의 pinned repository/라이선스 원문과 각 절의 공식 문서가 출처다. 접근일은 모두 **2026-10-14**. private 메타 repo의 docs/analysis/APTHANIMO_STACK_INTEGRATION_OSS_2026-10-14/에는 전체 SHA·license 응답 해시·실행 probe·검증 기록을 보존한다. 이 공개 문서에는 로컬 계정·세션 원문·비밀값을 넣지 않는다.

[S1] 본문 R01~R65 고정 소스·LICENSE 및 private 메타의 `catalog.json`, `probe/result.json` (직접 확인/실행).

[S2] [FixMyStreet 운영 흐름](https://fixmystreet.org/pro-manual/admin-tasks/)과 본문 후보별 공식 저장소. 우선순위는 설계 판단.

[S3] [maplibre-gl-three peer manifest](https://github.com/safwat-halaby/maplibre-gl-three/blob/5e769e41f547f3ada539a811f6d9bd2601eed638/package.json#L60-L64).

[S4] 본문 Directus·Sentry 서버 LICENSE와 [Bun SDK manifest](https://github.com/getsentry/sentry-javascript/blob/51b1946a9947e828931e1466ddefdad9c8a4c8e1/packages/bun/package.json#L8-L12).

[S5] [Blender 사용권](https://www.blender.org/about/license/), [Quaternius 현재 조건](https://quaternius.com/license.html), 본문 자산별 공식 출처.

[S6] [Copernicus provider 설명](https://copernicus-dem-30m.s3.amazonaws.com/readme.html); 현재 앱 2m는 탐색 격자이며 정밀도 보장 아님.
