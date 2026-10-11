#!/usr/bin/env python3
"""template.html + data/cell_data.json → index.html (단일 파일, 의존성 0)."""
import pathlib, sys
here = pathlib.Path(__file__).parent
data = (here / 'data' / 'cell_data.json').read_text(encoding='utf-8')
if '</script' in data.lower():
    sys.exit('data contains </script')
tpl = (here / 'template.html').read_text(encoding='utf-8')
assert '/*__DATA__*/' in tpl
out = tpl.replace('/*__DATA__*/', data)
(here / 'index.html').write_text(out, encoding='utf-8')
(here / 'dev.html').write_text('<!doctype html><html lang="ko"><head><meta charset="utf-8">' + out + '</html>', encoding='utf-8')
print('index.html', len(out), 'bytes')
