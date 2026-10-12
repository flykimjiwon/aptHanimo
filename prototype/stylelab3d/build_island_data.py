#!/usr/bin/env python3
"""cell_data.json(실제 OSM·SRTM 셀) → 단지별 '떠 있는 섬' 데이터(island_data.js).
단지 중심 반경 R타일(기본 14 = 350m)을 유기적인 가장자리로 잘라, 타일(종류·등급·횡단·계단·고도 단)과
건물 폴리곤(층수·종류·단지 귀속)·공원/학교 라벨·출입구·출구·POI를 담는다. 표준 라이브러리만."""
import json, math, pathlib
here = pathlib.Path(__file__).parent
d = json.load(open(here.parent / 'data' / 'cell_data.json', encoding='utf-8'))
W, H = d['meta']['W'], d['meta']['H']; E, K, R, CR, ST = d['elev'], d['kind'], d['rcls'], d['cross'], d['steps']
R_TILES = 14; TIER_M = 8

def hash01(x, y, s=0):
    h = (x * 374761393 + y * 668265263 + s * 2246822519) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffffff) / 4294967296

def pip(x, y, poly):
    ins = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: ins = not ins
        j = i
    return ins

out = {}
for c in d['complexes']:
    cx, cy = c['x'], c['y']; cpoly = c.get('poly') or []
    mask = {}
    for y in range(H):
        for x in range(W):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy; dist = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            wobble = 0.82 + 0.18 * (0.5 + 0.5 * math.sin(ang * 3 + hash01(int(cx), int(cy), 7) * 6.28)) + 0.06 * (hash01(x, y, 3) - 0.5)
            inside = dist < R_TILES * wobble
            if cpoly and not inside:
                # 단지 폴리곤 + 1타일 버퍼는 항상 포함
                for ox in (-1, 0, 1):
                    for oy in (-1, 0, 1):
                        if pip(x + 0.5 + ox, y + 0.5 + oy, cpoly): inside = True; break
                    if inside: break
            if inside: mask[(x, y)] = True
    elev_min = min(E[y * W + x] for (x, y) in mask)
    tiles = []
    for (x, y) in sorted(mask):
        i = y * W + x
        tier = int(round((E[i] - elev_min) / TIER_M))
        tiles.append([x, y, K[i], R[i], 1 if CR[i] else 0, 1 if ST[i] else 0, tier, round(E[i], 1)])
    blds = []
    for b in d['buildings']:
        tx, ty = int(b['cx']), int(b['cy'])
        if (tx, ty) not in mask: continue
        blds.append({'id': b['id'], 'poly': [[round(p[0], 2), round(p[1], 2)] for p in b['poly']], 'levels': b['levels'], 'kind': b['kind'], 'complex': b['complex'], 'label': b['label'] if b['complex'] else ''})
    areas = []
    for a in d['areas']:
        if not a.get('name') or a['kind'] == 'construction': continue
        ax = sum(p[0] for p in a['poly']) / len(a['poly']); ay = sum(p[1] for p in a['poly']) / len(a['poly'])
        if (int(ax), int(ay)) in mask: areas.append({'kind': a['kind'], 'name': a['name'], 'x': round(ax, 2), 'y': round(ay, 2)})
    exits = [{'station': e['station'], 'ref': e['ref'], 'x': e['x'], 'y': e['y']} for e in d['exits'] if (int(e['x']), int(e['y'])) in mask]
    pois = [{'type': p['type'], 'name': p['name'], 'x': p['x'], 'y': p['y']} for p in d['pois'] if (int(p['x']), int(p['y'])) in mask and p['type'] in ('elem', 'mid', 'high', 'park', 'play', 'mart', 'lib')]
    out[c['id']] = {'id': c['id'], 'short': c['short'], 'name': c['name'], 'color': c['color'], 'cx': cx, 'cy': cy, 'poly': cpoly, 'gates': [{'name': g['name'], 'x': g['x'], 'y': g['y']} for g in c['gates']],
                    'elev_min': round(elev_min, 1), 'tier_m': TIER_M, 'tile_m': d['meta']['tile_m'], 'tiles': tiles, 'buildings': blds, 'areas': areas, 'exits': exits, 'pois': pois,
                    'source': 'OpenStreetMap(ODbL) 건물 윤곽·층수·도로 + OpenTopoData SRTM 30m 고도. 지붕색·창 배치·나무는 연출. 위성사진 대조 전.'}
    print(c['id'], 'tiles', len(tiles), 'buildings', len(blds), 'areas', len(areas), 'exits', len(exits), 'pois', len(pois), 'tiers', max(t[6] for t in tiles) + 1)
js = 'self.ISLANDS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
(here / 'island_data.js').write_text(js, encoding='utf-8')
print('island_data.js', len(js), 'bytes')
