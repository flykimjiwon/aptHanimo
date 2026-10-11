#!/usr/bin/env python3
"""CODEX_PROTOTYPE_GUIDE_*.md -> guide.html (../template.html 재사용, 머리글만 교체). 정본은 md."""
import pathlib, sys
here = pathlib.Path(__file__).parent
md = (here / "CODEX_PROTOTYPE_GUIDE_2026-10-11.md").read_text(encoding="utf-8")
if "</script" in md.lower():
    sys.exit("md 안에 </script 가 있어 임베드 불가")
tpl = (here.parent / "template.html").read_text(encoding="utf-8")
rep = {
  "<title>임장월드 기획서</title>": "<title>임장월드 프로토 구조 가이드</title>",
  '<div class="eyebrow">통합 기획서 v1.0 · 2026-10-11 · 세 문서(Claude Code·A·B) 종합 · Codex 실행 기준</div>': '<div class="eyebrow">프로토타입 v2 구조 가이드 · 2026-10-11 · Codex 참고용 · 정본 md는 prototype/CODEX_PROTOTYPE_GUIDE_2026-10-11.md</div>',
  '<h1 class="title">임장월드 <em>통합 기획서</em></h1>': '<h1 class="title">임장월드 미리보기 <em>구조 가이드</em></h1>',
  '<p class="lede">서울 25구의 대표 아파트 단지를 단지 중심 생활권 셀 단위의 귀여운 2.5D 월드로 만들어, 도보·유모차·자전거·차로 실제 데이터대로 걸어 보고 출처 달린 이슈를 확인하며 1인·커플·가족으로 함께 임장하는 무료·광고 운영 웹 게임. Claude Code 초안과 두 외부 기획서를 한 문서로 합쳤고, 충돌은 §19 결정 기록에 남겼다.</p>': '<p class="lede">신당 하이베르·왕십리자이·라체르보 3단지 클러스터 셀을 단일 HTML Canvas 2D로 구운 프로토타입이 어떻게 짜여 있는지(파이프라인·데이터 계약·이동 규칙·렌더링·흐름·DOM 계약)와, Codex가 정식 빌드로 가져갈 것과 가져가면 안 되는 것을 정리했다.</p>',
  '<div class="fact"><b>25구 · 셀 단위</b><span>단지 중심 생활권 셀, L0/L1/L2 3레이어, 절차 생성</span></div>': '<div class="fact"><b>단일 HTML</b><span>template.html + cell_data.json → build.py, 의존성 0</span></div>',
  '<div class="fact"><b>4 이동수단</b><span>도보·유모차·자전거·차, 경사·차선·턱 반응</span></div>': '<div class="fact"><b>99×58 · 25m</b><span>OSM·SRTM 격자, 3단지 클러스터 셀</span></div>',
  '<div class="fact"><b>사실 6분류</b><span>A/B/C/X 등급 + 현재·과거·예정 시간 레이어</span></div>': '<div class="fact"><b>데이터 ≠ 연출</b><span>경로는 원본 고도, 그림은 8m 단·나무·NPC</span></div>',
  '<div class="fact"><b>결정 22 · 티켓 32</b><span>충돌 결정 기록, 요구사항 ID 41, 한 세션 크기 티켓</span></div>': '<div class="fact"><b>정적 1장 + 동적</b><span>프리렌더 캔버스, 가림 재그리기, 고정 크기 표식</span></div>',
  '<div class="fact"><b>웹 → PWA → 앱</b><span>Phaser 3 · React · Colyseus · Supabase · OSRM 배치</span></div>': '<div class="fact"><b>가져갈 것 / 금지</b><span>§9: 규칙·계약은 이식, 캔버스 코드·NPC·개념 배치는 금지</span></div>',
  '<button class="btn" id="copyBtn" type="button">통합 기획서 원문(Markdown) 복사</button>': '<button class="btn" id="copyBtn" type="button">가이드 원문(Markdown) 복사</button>',
}
for k, v in rep.items():
    assert k in tpl, k[:40]
    tpl = tpl.replace(k, v)
assert "{{MARKDOWN}}" in tpl
(here / "guide.html").write_text(tpl.replace("{{MARKDOWN}}", md), encoding="utf-8")
print("guide.html built:", len(md), "chars")
