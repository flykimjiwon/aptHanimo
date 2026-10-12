#!/usr/bin/env python3
"""OSM(Overpass) + SRTM(OpenTopoData) + 손입력 단지 사실 → 임장월드 프로토타입용 cell_data.json
클러스터 셀: 신당 래미안하이베르 · 왕십리자이 · 라체르보푸르지오써밋 (서울 중구·성동구)
타일 25m, 원점 = 북서쪽 모서리, x→동, y→남.
"""
import json, math, sys, pathlib
S = pathlib.Path(__file__).parent
LAT0, LAT1 = 37.5545, 37.5675   # 남, 북
LON0, LON1 = 127.0120, 127.0400 # 서, 동
W, H = 99, 58
TILE_M = 25

osm = json.load(open(S / 'osm3.json'))['elements']
g1 = json.load(open(S / 'elev_srtm.json'))
g2 = json.load(open(S / 'elev_srtm_east.json'))
complexes = json.load(open(S / 'complexes.json'))

def bil(g, lat, lon):
    ny, nx = g['ny'], g['nx']
    fy = (lat - g['lat0']) / (g['lat1'] - g['lat0']) * (ny - 1)
    fx = (lon - g['lon0']) / (g['lon1'] - g['lon0']) * (nx - 1)
    fy = min(max(fy, 0), ny - 1 - 1e-9); fx = min(max(fx, 0), nx - 1 - 1e-9)
    y0, x0 = int(fy), int(fx); ty, tx = fy - y0, fx - x0
    e = g['elev']
    def v(y, x): return e[min(y, ny - 1) * nx + min(x, nx - 1)]
    return (v(y0, x0) * (1 - tx) + v(y0, x0 + 1) * tx) * (1 - ty) + (v(y0 + 1, x0) * (1 - tx) + v(y0 + 1, x0 + 1) * tx) * ty

def elev(lat, lon):
    if lon <= g1['lon1']: return bil(g1, lat, lon)
    if lon >= g2['lon0']: return bil(g2, lat, lon)
    t = (lon - g1['lon1']) / (g2['lon0'] - g1['lon1'])
    return bil(g1, lat, g1['lon1']) * (1 - t) + bil(g2, lat, g2['lon0']) * t

def to_tile(lat, lon):
    return (lon - LON0) / (LON1 - LON0) * W, (LAT1 - lat) / (LAT1 - LAT0) * H

def to_latlon(x, y):
    return LAT1 - y / H * (LAT1 - LAT0), LON0 + x / W * (LON1 - LON0)

def pip(x, y, poly):
    inside = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if xi > x: inside = not inside
    return inside

# --- tiles ---
E = [0.0] * (W * H)
for ty in range(H):
    for tx in range(W):
        la, lo = to_latlon(tx + 0.5, ty + 0.5)
        E[ty * W + tx] = round(elev(la, lo) * 2) / 2
KIND = [0] * (W * H)         # 0 ground 1 road 2 footway 3 steps 4 building 5 park 6 school 7 construction 8 water
RCLS = [0] * (W * H)         # road class rank
LANES = [0] * (W * H)
ONEWAY = [0] * (W * H)
CROSS = [0] * (W * H)
STEPS = [0] * (W * H)
RNAME = {}
CLASS_RANK = {'primary': 9, 'primary_link': 8, 'secondary': 8, 'secondary_link': 7, 'tertiary': 7, 'residential': 5,
              'living_street': 5, 'unclassified': 5, 'service': 4, 'pedestrian': 3, 'footway': 2, 'cycleway': 2, 'path': 2, 'steps': 1}
DEFAULT_LANES = {'primary': 3, 'primary_link': 1, 'secondary': 2, 'secondary_link': 1, 'tertiary': 2, 'residential': 1,
                 'living_street': 1, 'unclassified': 1, 'service': 1}

def supercover(x0, y0, x1, y1):
    """float 좌표 선분이 지나는 타일 목록"""
    pts = []
    dx, dy = x1 - x0, y1 - y0
    n = int(max(abs(dx), abs(dy)) * 2) + 1
    for i in range(n + 1):
        t = i / n
        pts.append((int(x0 + dx * t), int(y0 + dy * t)))
    return pts

def inb(x, y): return 0 <= x < W and 0 <= y < H

roads_drawn = 0
for e in osm:
    t = e.get('tags', {})
    hw = t.get('highway')
    if e['type'] != 'way' or not hw or hw not in CLASS_RANK: continue
    if t.get('tunnel') == 'yes' or t.get('layer', '0').startswith('-'): continue
    if t.get('area') == 'yes': continue
    rank = CLASS_RANK[hw]
    lanes = t.get('lanes')
    try: lanes = int(lanes)
    except: lanes = DEFAULT_LANES.get(hw, 0)
    width = 2 if lanes >= 4 else 1
    ow = 1 if t.get('oneway') == 'yes' else 0
    pts = [to_tile(p['lat'], p['lon']) for p in e.get('geometry', [])]
    roads_drawn += 1
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        for (x, y) in supercover(ax, ay, bx, by):
            cells = [(x, y)]
            if width == 2:
                cells += [(x + 1, y), (x, y + 1)]
            for cx, cy in cells:
                if not inb(cx, cy): continue
                i = cy * W + cx
                if KIND[i] == 4: continue
                if hw == 'steps': STEPS[i] = 1
                if rank >= RCLS[i]:
                    RCLS[i] = rank; LANES[i] = lanes; ONEWAY[i] = ow
                    if hw == 'steps': KIND[i] = 3
                    elif rank <= 3: KIND[i] = 2
                    else: KIND[i] = 1
                    if t.get('name'): RNAME[i] = t['name']

for e in osm:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('highway') == 'crossing':
        x, y = to_tile(e['lat'], e['lon']); x, y = int(x), int(y)
        if inb(x, y): CROSS[y * W + x] = 1

# --- areas: parks, schools, construction ---
def fill_poly(poly, kind, override_roads=False):
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    for ty in range(max(0, int(min(ys))), min(H, int(max(ys)) + 1)):
        for tx in range(max(0, int(min(xs))), min(W, int(max(xs)) + 1)):
            if pip(tx + 0.5, ty + 0.5, poly):
                i = ty * W + tx
                if KIND[i] in (0,) or (override_roads and KIND[i] in (1, 2, 3)):
                    KIND[i] = kind

areas = []
for e in osm:
    t = e.get('tags', {})
    if e['type'] != 'way' or not e.get('geometry'): continue
    poly = [to_tile(p['lat'], p['lon']) for p in e['geometry']]
    if t.get('leisure') in ('park', 'playground') and len(poly) > 3:
        fill_poly(poly, 5); areas.append(('park', t.get('name'), poly))
    elif t.get('amenity') == 'school' and len(poly) > 3:
        fill_poly(poly, 6); areas.append(('school', t.get('name'), poly))
    elif t.get('landuse') == 'construction' and len(poly) > 3:
        fill_poly(poly, 7); areas.append(('construction', t.get('name'), poly))

# --- complexes landuse polygons ---
cpoly = {}
for c in complexes:
    for e in osm:
        if e['type'] == 'way' and e['id'] == c.get('osm_landuse_id'):
            cpoly[c['id']] = [to_tile(p['lat'], p['lon']) for p in e['geometry']]
for c in complexes:
    if c['id'] not in cpoly: print('WARN no landuse poly for', c['id'])

# --- buildings ---
buildings = []
for e in osm:
    t = e.get('tags', {})
    if e['type'] != 'way' or 'building' not in t or not e.get('geometry'): continue
    poly = [to_tile(p['lat'], p['lon']) for p in e['geometry']]
    if poly[0] == poly[-1]: poly = poly[:-1]
    if len(poly) < 3: continue
    cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
    if not inb(int(cx), int(cy)): continue
    lv = t.get('building:levels')
    try: lv = int(float(lv))
    except: lv = 15 if t.get('building') == 'apartments' else (4 if t.get('building') in ('yes', 'retail', 'commercial') else 3)
    cid = None
    for k, cp in cpoly.items():
        if pip(cx, cy, cp): cid = k; break  # 겹치는 landuse 폴리곤이면 먼저 정의된 단지 우선(중심점 기준, 면적 겹침은 후속)
    b = {'id': e['id'], 'label': t.get('name') or t.get('addr:housenumber') or '', 'levels': lv, 'kind': t.get('building'),
         'poly': [[round(x, 2), round(y, 2)] for x, y in poly], 'cx': round(cx, 2), 'cy': round(cy, 2), 'complex': cid}
    buildings.append(b)
    fill_poly(poly, 4, override_roads=False)
    for ty in range(max(0, int(min(p[1] for p in poly))), min(H, int(max(p[1] for p in poly)) + 1)):
        for tx in range(max(0, int(min(p[0] for p in poly))), min(W, int(max(p[0] for p in poly)) + 1)):
            if pip(tx + 0.5, ty + 0.5, poly):
                i = ty * W + tx
                if KIND[i] in (1, 2, 3) and RCLS[i] <= 4:   # 서비스도로·보도는 건물이 덮음
                    KIND[i] = 4

# 라체르보: OSM에 동 폴리곤 없음 → 공사구역 폴리곤 안에 7개 타워 개념 배치(개념 재현 F)
for c in complexes:
    if c.get('synthesize_towers') and c['id'] in cpoly:
        cp = cpoly[c['id']]
        xs = [p[0] for p in cp]; ys = [p[1] for p in cp]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        lv = c['synthesize_towers']['levels']
        n = len(lv); placed = 0; k = 0
        cols = 3; rows = 3
        for r in range(rows):
            for q in range(cols):
                if placed >= n: break
                px = x0 + (x1 - x0) * (q + 0.5) / cols; py = y0 + (y1 - y0) * (r + 0.5) / rows
                if not pip(px, py, cp): continue
                s = 1.1
                poly = [[px - s, py - s], [px + s, py - s], [px + s, py + s], [px - s, py + s]]
                buildings.append({'id': f'synth-{c["id"]}-{placed}', 'label': f'{101 + placed}', 'levels': lv[placed], 'kind': 'apartments',
                                  'poly': [[round(a, 2), round(b, 2)] for a, b in poly], 'cx': round(px, 2), 'cy': round(py, 2),
                                  'complex': c['id'], 'concept': True})
                fill_poly(poly, 4, override_roads=True)
                placed += 1
        print(c['id'], 'synthesized towers:', placed)

# --- POIs ---
STATIONS = {  # 이름 → 노선 (서울 지하철 공식 노선, 손입력)
    '신당': ['2', '6'], '청구': ['5', '6'], '상왕십리': ['2'], '행당': ['5'], '왕십리': ['2', '5', '경의중앙', '수인분당'], '신금호': ['5'], '약수': ['3', '6']}
def centroid(e):
    if e['type'] == 'node': return e['lat'], e['lon']
    g = e.get('geometry') or []
    return sum(p['lat'] for p in g) / len(g), sum(p['lon'] for p in g) / len(g)

stations = []
for e in osm:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('railway') == 'station' and t.get('name') in STATIONS:
        x, y = to_tile(e['lat'], e['lon'])
        stations.append({'name': t['name'], 'lines': STATIONS[t['name']], 'x': round(x, 2), 'y': round(y, 2), 'lat': e['lat'], 'lon': e['lon']})
stations = [st for st in stations if inb(int(st['x']), int(st['y']))]
merged = {}
for st in stations:
    m = merged.setdefault(st['name'], {'name': st['name'], 'lines': st['lines'], 'xs': [], 'ys': [], 'lats': [], 'lons': []})
    m['xs'].append(st['x']); m['ys'].append(st['y']); m['lats'].append(st['lat']); m['lons'].append(st['lon'])
stations = [{'name': m['name'], 'lines': m['lines'], 'x': round(sum(m['xs'])/len(m['xs']),2), 'y': round(sum(m['ys'])/len(m['ys']),2),
             'lat': sum(m['lats'])/len(m['lats']), 'lon': sum(m['lons'])/len(m['lons'])} for m in merged.values()]
exits = []
for e in osm:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('railway') == 'subway_entrance':
        x, y = to_tile(e['lat'], e['lon'])
        if not inb(int(x), int(y)): continue
        if not stations: continue  # 역이 없는 셀이면 출구도 역 귀속 불가
        best = min(stations, key=lambda s: (s['lat'] - e['lat']) ** 2 + (s['lon'] - e['lon']) ** 2)
        exits.append({'station': best['name'], 'ref': t.get('ref', '?'), 'x': round(x, 2), 'y': round(y, 2), 'lat': e['lat'], 'lon': e['lon']})

pois = []
def add_poi(e, typ, name, extra=None):
    la, lo = centroid(e); x, y = to_tile(la, lo)
    if not inb(int(x), int(y)): return
    p = {'type': typ, 'name': name, 'x': round(x, 2), 'y': round(y, 2)}
    if extra: p.update(extra)
    pois.append(p)
seen = set()
for e in osm:
    t = e.get('tags', {}); n = t.get('name')
    key = (n, t.get('amenity') or t.get('shop') or t.get('leisure'))
    if key in seen and n: continue
    if t.get('amenity') == 'school' and n:
        typ = 'elem' if '초등' in n else ('mid' if '중학' in n or '여중' in n else 'high')
        add_poi(e, typ, n); seen.add(key)
    elif t.get('amenity') in ('kindergarten', 'childcare') and n:
        add_poi(e, 'kinder', n); seen.add(key)
    elif t.get('shop') == 'supermarket' and n:
        add_poi(e, 'mart', n); seen.add(key)
    elif t.get('shop') == 'convenience' and n:
        add_poi(e, 'conv', n.split()[0]); seen.add(key)
    elif t.get('amenity') in ('pharmacy', 'doctors', 'clinic', 'hospital') and n:
        add_poi(e, 'med', n); seen.add(key)
    elif t.get('leisure') == 'park' and n:
        add_poi(e, 'park', n); seen.add(key)
    elif t.get('leisure') == 'playground':
        add_poi(e, 'play', '놀이터')
    elif t.get('amenity') == 'library' and n:
        add_poi(e, 'lib', n); seen.add(key)
    elif t.get('leisure') == 'fitness_centre' and n:
        add_poi(e, 'gym', n); seen.add(key)

# 단지 사실 → 타일 좌표 부여
for c in complexes:
    cx, cy = to_tile(c['lat'], c['lon']); c['x'] = round(cx, 2); c['y'] = round(cy, 2)
    for gte in c['gates']:
        gx, gy = to_tile(gte['lat'], gte['lon']); gte['x'] = round(gx, 2); gte['y'] = round(gy, 2)
    bl = [b for b in buildings if b['complex'] == c['id']]
    c['building_count_osm'] = len(bl)
    if c['id'] in cpoly: c['poly'] = [[round(x, 2), round(y, 2)] for x, y in cpoly[c['id']]]

out = {
    'meta': {'title': '임장월드 프로토 — 신당·왕십리 클러스터 셀', 'built': '2026-10-11', 'tile_m': TILE_M, 'W': W, 'H': H,
             'bbox': {'lat0': LAT0, 'lat1': LAT1, 'lon0': LON0, 'lon1': LON1},
             'sources': ['OpenStreetMap (ODbL) via Overpass 2026-10-11', 'OpenTopoData SRTM 30m', '네이버 부동산·네이버지도 단지정보 2026-10-11', '호갱노노 단지 페이지(수동 열람·요약) 2026-10-11', '뉴스(한국경제·서울신문·헤럴드경제 등)'],
             'roads_drawn': roads_drawn},
    'elev': E, 'kind': KIND, 'rcls': RCLS, 'lanes': LANES, 'oneway': ONEWAY, 'cross': CROSS, 'steps': STEPS,
    'rname': {str(k): v for k, v in RNAME.items()},
    'buildings': buildings, 'stations': stations, 'exits': exits, 'pois': pois, 'complexes': complexes,
    'areas': [{'kind': k, 'name': n, 'poly': [[round(x, 2), round(y, 2)] for x, y in p]} for k, n, p in areas],
}
OUT = S.parent / 'data' / 'cell_data.json'  # build.py 가 읽는 위치(예전엔 tools/ 에 떨어져 옛 데이터로 빌드되던 문제)
OUT.parent.mkdir(parents=True, exist_ok=True)
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
import collections
print('tiles', W * H, 'kinds', collections.Counter(KIND), 'buildings', len(buildings), 'stations', len(stations), 'exits', len(exits), 'pois', len(pois), 'areas', len(areas))
print('elev range', min(E), max(E))
for c in complexes: print(c['id'], 'tile', c['x'], c['y'], 'buildings', c['building_count_osm'])
print('size', OUT.stat().st_size, '->', OUT)
