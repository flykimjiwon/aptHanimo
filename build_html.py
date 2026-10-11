#!/usr/bin/env python3
"""IMJANG_WORLD_PRD_*.md -> index.html (template.html 의 {{MARKDOWN}} 자리에 주입). 정본은 md 하나만 고친다."""
import pathlib, sys
here = pathlib.Path(__file__).parent
md = (here / "IMJANG_WORLD_MASTER_2026-10-11.md").read_text(encoding="utf-8")
if "</script" in md.lower():
    sys.exit("md 안에 </script 가 있어 임베드 불가")
tpl = (here / "template.html").read_text(encoding="utf-8")
assert "{{MARKDOWN}}" in tpl
(here / "index.html").write_text(tpl.replace("{{MARKDOWN}}", md), encoding="utf-8")
print("index.html built:", len(md), "chars of markdown")
