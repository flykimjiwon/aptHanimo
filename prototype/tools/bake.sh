#!/usr/bin/env bash
# 셀 재굽기: Overpass 재취득(선택) → 셀 → 본편·스타일랩 빌드 → 테스트. 의존성: curl, python3, node.
# 사용: bash prototype/tools/bake.sh            (tools/osm3.json 이 있으면 재사용)
#       bash prototype/tools/bake.sh --refresh  (Overpass 에서 다시 받음, ODbL)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; proto="$(dirname "$here")"
if [[ "${1:-}" == "--refresh" || ! -f "$here/osm3.json" ]]; then
  echo "Overpass 취득 중(bbox는 overpass_query.ql)…"
  curl -sS --max-time 180 -o "$here/osm3.json" \
    -A 'imjang-world-prototype (personal research; github.com/flykimjiwon/aptHanimo)' -H 'Accept: application/json' \
    --data-urlencode "data@$here/overpass_query.ql" 'https://overpass-api.de/api/interpreter'
  python3 -c "import json,sys; d=json.load(open('$here/osm3.json')); print('elements', len(d['elements']), 'osm_base', d.get('osm3s',{}).get('timestamp_osm_base'))"
fi
python3 "$here/build_cell.py"
( cd "$proto" && python3 assemble.py && python3 build.py && python3 stylelab/build_stylelab.py && node tests/run.mjs && node --test tests/harness.test.mjs )
echo "골든값이 바뀌었으면 의도한 변경인지 확인한 뒤: node $proto/tests/run.mjs --update"
