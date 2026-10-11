#!/usr/bin/env python3
"""스타일 랩: ../data/cell_data.json 에서 하이베르 주변 24×16 타일을 잘라 src/*.{html,js} + vendor 스프라이트와 함께 index.html(아티팩트용)·dev.html(로컬용)로 조립."""
import json, pathlib, sys
here = pathlib.Path(__file__).parent
proto = here.parent
d = json.load(open(proto / 'data' / 'cell_data.json', encoding='utf-8'))
W, H = d['meta']['W'], d['meta']['H']
X0, Y0, CW, CH = 27, 16, 24, 16
sub = lambda arr: [arr[(Y0 + y) * W + (X0 + x)] for y in range(CH) for x in range(CW)]
blds = []
for b in d['buildings']:
    if not (X0 <= b['cx'] < X0 + CW and Y0 <= b['cy'] < Y0 + CH):
        continue
    blds.append({'poly': [[round(p[0] - X0, 2), round(p[1] - Y0, 2)] for p in b['poly']], 'levels': b['levels'], 'kind': b['kind'],
                 'complex': b['complex'], 'cx': round(b['cx'] - X0, 2), 'cy': round(b['cy'] - Y0, 2), 'label': b.get('label', '')})
crop = {
    'W': CW, 'H': CH, 'origin': [X0, Y0], 'tile_m': 25,
    'elev': sub(d['elev']), 'kind': sub(d['kind']), 'rcls': sub(d['rcls']), 'lanes': sub(d['lanes']), 'cross': sub(d['cross']), 'steps': sub(d['steps']),
    'buildings': blds,
    'complexes': {c['id']: {'name': c['short'], 'color': c['color'], 'theme': c['theme']} for c in d['complexes']},
    'pois': [{'type': p['type'], 'name': p['name'], 'x': round(p['x'] - X0, 2), 'y': round(p['y'] - Y0, 2)} for p in d['pois'] if X0 <= p['x'] < X0 + CW and Y0 <= p['y'] < Y0 + CH],
    'areas': [{'kind': a['kind'], 'name': a['name'], 'poly': [[round(p[0] - X0, 2), round(p[1] - Y0, 2)] for p in a['poly']]} for a in d['areas'] if any(X0 <= p[0] < X0 + CW and Y0 <= p[1] < Y0 + CH for p in a['poly'])],
}
data = json.dumps(crop, ensure_ascii=False, separators=(',', ':'))
if '</script' in data.lower():
    sys.exit('data contains </script')
src = here / 'src'
parts = ['01_head.html', '02_core.js', 'vendor.js', '03_chars.js', '04_blds.js', '05_worlds.js', '06_app.js']
out = []
for p in parts:
    if p == 'vendor.js':
        t = '/* === vendor: PixelCrew sprites.js 원문(MIT © 2026 Jiwon Kim, ../src/vendor/NOTICE.md) === */\n' + (proto / 'src' / 'vendor' / 'pixelcrew_sprites.js').read_text(encoding='utf-8') + '\n'
    else:
        t = (src / p).read_text(encoding='utf-8')
    out.append(t)
tpl = ''.join(out)
assert tpl.count('/*__CROP__*/') == 1
html = tpl.replace('/*__CROP__*/', data)
(here / 'index.html').write_text(html, encoding='utf-8')
(here / 'dev.html').write_text('<!doctype html><html lang="ko"><head><meta charset="utf-8">' + html + '</html>', encoding='utf-8')
print('stylelab index.html', len(html), 'bytes; crop', CW, 'x', CH, 'buildings', len(blds), 'pois', len(crop['pois']), 'areas', len(crop['areas']))
