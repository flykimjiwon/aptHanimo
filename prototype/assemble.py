#!/usr/bin/env python3
"""src/*.html|js + src/vendor → template.html (순서 고정). 정본은 src/ 이고 template.html 은 생성물."""
import pathlib
here = pathlib.Path(__file__).parent
src = here / 'src'
parts = ['01_head.html', '02_world.js', '03_static.js', '04_route.js', 'vendor/pixelcrew_sprites.js', '05_dynamic.js', '06_ui.js']  # v5: 캐릭터 두 스타일(STYLE.char) 모두 포함 — vendor 는 04_route.js 끝의 self.PixelCrewRoster 뒤에 와야 한다
out = []
for p in parts:
    t = (src / p).read_text(encoding='utf-8')
    if p.startswith('vendor/'):
        t = '/* === vendor: ' + p + ' (원문 그대로, src/vendor/NOTICE.md) === */\n' + t + '\n'
    out.append(t)
tpl = ''.join(out)
assert tpl.count('/*__DATA__*/') == 1
(here / 'template.html').write_text(tpl, encoding='utf-8')
print('template.html', len(tpl), 'chars from', len(parts), 'parts')
