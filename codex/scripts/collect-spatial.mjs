import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import ky from "ky";

const ROOT = new URL("../", import.meta.url); const RAW = new URL("research/spatial/raw/", ROOT); const WORLDS = new URL("public/worlds/", ROOT);
const RADIUS = 650; const GRID_SIZE = 65; const TERRAIN_ZOOM = 14;
const METRES_PER_LATITUDE_DEGREE = 111_320; const BBOX = "37.551,127.015,37.568,127.045";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const configs = JSON.parse(await readFile(new URL("research/spatial/config.json", ROOT), "utf8"));

const round = (value, digits = 2) => Number(value.toFixed(digits)); const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const osmUrl = (element) => `https://www.openstreetmap.org/${element.type}/${element.id}`;
const pointFor = (element) => {
  if (Number.isFinite(element.lon) && Number.isFinite(element.lat)) return [element.lon, element.lat];
  const geometry = element.geometry ?? [];
  if (geometry.length === 0) return undefined;
  return [geometry.reduce((sum, p) => sum + p.lon, 0) / geometry.length, geometry.reduce((sum, p) => sum + p.lat, 0) / geometry.length];
};
const localize = ([longitude, latitude], [originLongitude, originLatitude]) => [
  round((longitude - originLongitude) * METRES_PER_LATITUDE_DEGREE * Math.cos(originLatitude * Math.PI / 180)),
  round(-(latitude - originLatitude) * METRES_PER_LATITUDE_DEGREE),
];
const distanceSquared = ([x, z]) => x * x + z * z;
const ringsFrom = (value) => {
  if (!Array.isArray(value)) return [];
  if (value.length > 2 && value.every((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))) return [value];
  return value.flatMap(ringsFrom);
};
const polygonContains = ([x, y], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};
function clipSegment(a, b) {
  let t0 = 0; let t1 = 1;
  const dx = b[0] - a[0]; const dz = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] + RADIUS], [dx, RADIUS - a[0]], [-dz, a[1] + RADIUS], [dz, RADIUS - a[1]]]) {
    if (p === 0 && q < 0) return undefined;
    const ratio = q / p;
    if (p < 0) t0 = Math.max(t0, ratio); else if (p > 0) t1 = Math.min(t1, ratio);
    if (t0 > t1) return undefined;
  }
  return [[round(a[0] + t0 * dx), round(a[1] + t0 * dz)], [round(a[0] + t1 * dx), round(a[1] + t1 * dz)]];
}
function clipPolyline(points) {
  const parts = []; let part = [];
  for (let index = 1; index < points.length; index += 1) {
    const segment = clipSegment(points[index - 1], points[index]);
    if (!segment) { if (part.length > 1) parts.push(part); part = []; continue; }
    const last = part.at(-1);
    if (last && distanceSquared([last[0] - segment[0][0], last[1] - segment[0][1]]) > 0.01) { parts.push(part); part = []; }
    if (part.length === 0) part.push(segment[0]); part.push(segment[1]);
  }
  if (part.length > 1) parts.push(part);
  return parts;
}

function overpassQuery() {
  return `[out:json][timeout:180][maxsize:536870912];(way["building"](${BBOX});way["highway"](${BBOX});nwr["amenity"]["name"](${BBOX});nwr["shop"]["name"](${BBOX});nwr["leisure"]["name"](${BBOX});nwr["railway"~"station|subway_entrance"](${BBOX});nwr["public_transport"="station"](${BBOX}););out geom tags;`;
}

async function fetchOverpass() {
  const body = new URLSearchParams({ data: overpassQuery() });
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await ky.post(endpoint, { body, timeout: 150_000, retry: { limit: 2, methods: ["post"] } }).text();
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      lastError = error;
    }
  }
  throw new Error(`All Overpass endpoints failed: ${lastError?.message ?? "unknown error"}`);
}

function decodeRgbPng(bytes) {
  const data = Buffer.from(bytes);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (data[24] !== 8 || data[25] !== 2) throw new Error("Terrarium tile must be 8-bit RGB PNG");
  const idat = [];
  for (let offset = 8; offset < data.length;) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") idat.push(data.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const inflated = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 3);
  const stride = width * 3;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[row * (stride + 1)];
    for (let column = 0; column < stride; column += 1) {
      const raw = inflated[row * (stride + 1) + column + 1] ?? 0;
      const index = row * stride + column;
      const left = column >= 3 ? pixels[index - 3] ?? 0 : 0;
      const up = row > 0 ? pixels[index - stride] ?? 0 : 0;
      const upperLeft = row > 0 && column >= 3 ? pixels[index - stride - 3] ?? 0 : 0;
      const paethBase = left + up - upperLeft;
      const paeth = Math.abs(paethBase - left) <= Math.abs(paethBase - up) && Math.abs(paethBase - left) <= Math.abs(paethBase - upperLeft) ? left : Math.abs(paethBase - up) <= Math.abs(paethBase - upperLeft) ? up : upperLeft;
      pixels[index] = (raw + [0, left, up, Math.floor((left + up) / 2), paeth][filter]) & 255;
    }
  }
  return { width, height, pixels };
}

const tilePoint = (longitude, latitude) => {
  const scale = 2 ** TERRAIN_ZOOM;
  return [(longitude + 180) / 360 * scale, (1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * scale];
};
async function loadTile(tileX, tileY, manifest) {
  const file = `terrarium-z${TERRAIN_ZOOM}-${tileX}-${tileY}.png`;
  const url = `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${TERRAIN_ZOOM}/${tileX}/${tileY}.png`;
  const response = await ky.get(url, { timeout: 30_000, retry: 3 });
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(file, RAW), bytes);
  manifest.set(file, { file: `raw/${file}`, url, sha256: sha256(bytes), bytes: bytes.length, imagerySources: response.headers.get("x-amz-meta-x-imagery-sources") ?? "SRTM (header unavailable)" });
  return decodeRgbPng(bytes);
}

async function terrainElevation(longitude, latitude, tileCache, manifest) {
  const [tileXF, tileYF] = tilePoint(longitude, latitude);
  const pixelX = tileXF * 256 - 0.5;
  const pixelY = tileYF * 256 - 0.5;
  const x0 = Math.floor(pixelX);
  const y0 = Math.floor(pixelY);
  const pixelValue = async (globalX, globalY) => {
    const tileX = Math.floor(globalX / 256);
    const tileY = Math.floor(globalY / 256);
    const key = `${tileX}/${tileY}`;
    if (!tileCache.has(key)) tileCache.set(key, loadTile(tileX, tileY, manifest));
    const tile = await tileCache.get(key);
    const localX = ((globalX % 256) + 256) % 256;
    const localY = ((globalY % 256) + 256) % 256;
    const offset = (localY * tile.width + localX) * 3;
    return (tile.pixels[offset] ?? 0) * 256 + (tile.pixels[offset + 1] ?? 0) + (tile.pixels[offset + 2] ?? 0) / 256 - 32768;
  };
  const [northwest, northeast, southwest, southeast] = await Promise.all([
    pixelValue(x0, y0), pixelValue(x0 + 1, y0), pixelValue(x0, y0 + 1), pixelValue(x0 + 1, y0 + 1),
  ]);
  const xFraction = pixelX - x0;
  const yFraction = pixelY - y0;
  const north = northwest + (northeast - northwest) * xFraction;
  const south = southwest + (southeast - southwest) * xFraction;
  return round(north + (south - north) * yFraction);
}

async function elevationGrid(config, manifest) {
  const tileCache = new Map();
  const values = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const z = -RADIUS + row * (RADIUS * 2 / (GRID_SIZE - 1));
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const x = -RADIUS + column * (RADIUS * 2 / (GRID_SIZE - 1));
      const latitude = config.origin[1] - z / METRES_PER_LATITUDE_DEGREE;
      const longitude = config.origin[0] + x / (METRES_PER_LATITUDE_DEGREE * Math.cos(config.origin[1] * Math.PI / 180));
      values.push(await terrainElevation(longitude, latitude, tileCache, manifest));
    }
  }
  return values;
}

function buildingHeight(element) {
  const explicit = Number.parseFloat(element.tags?.height ?? "");
  if (Number.isFinite(explicit)) return [explicit, `OSM height tag · ${osmUrl(element)}`];
  const levels = Number.parseFloat(element.tags?.["building:levels"] ?? "");
  if (Number.isFinite(levels)) return [levels * 3, `render estimate: OSM building:levels × 3 m · ${osmUrl(element)}`];
  return [9, `render default 9 m; no OSM height/levels (not surveyed) · ${osmUrl(element)}`];
}
function classifyPath(value) {
  if (value === "footway" || value === "pedestrian" || value === "path") return "footpath";
  if (value === "steps") return "steps";
  if (value === "cycleway") return "cycleway";
  return "road";
}
function poiKindMatches(id, tags) {
  if (id === "station" || id === "sang") return tags.railway === "station";
  if (id === "school" || id === "middle" || id === "high") return tags.amenity === "school";
  if (id === "park") return tags.leisure === "park" || tags.leisure === "garden" || tags.leisure === "playground";
  if (id === "mart") return tags.shop === "supermarket" || tags.shop === "mall";
  return false;
}
function buildWorld(config, osm, hogang, elevations) {
  const elements = osm.elements ?? [];
  const boundaryRings = ringsFrom(hogang.groupPolygons);
  const boundary = boundaryRings.sort((a, b) => b.length - a.length)[0] ?? [];
  const osmBuildings = elements.filter((e) => e.type === "way" && e.tags?.building && (e.geometry?.length ?? 0) >= 4);
  const surroundings = osmBuildings.filter((e) => {
    const point = pointFor(e);
    return point && !polygonContains(point, boundary);
  }).map((e) => {
    const [height, heightSource] = buildingHeight(e);
    return { id: `osm-way-${e.id}`, name: e.tags.name ?? e.tags["addr:housenumber"] ?? `OSM building ${e.id}`, ring: e.geometry.map((p) => localize([p.lon, p.lat], config.origin)), height: round(height), heightSource, kind: e.tags.building, source: osmUrl(e) };
  }).filter((b) => {
    const [x, z] = b.ring.reduce(([sumX, sumZ], point) => [sumX + point[0], sumZ + point[1]], [0, 0]).map((sum) => sum / b.ring.length);
    return Math.abs(x) <= RADIUS && Math.abs(z) <= RADIUS;
  });
  const coreBuildings = hogang.buildings.flatMap((building) => {
    const ring = ringsFrom(building.shape).sort((a, b) => b.length - a.length)[0];
    if (!ring) return [];
    const nearest = osmBuildings.map((element) => ({ element, point: pointFor(element) })).filter(({ point }) => point && polygonContains(point, ring)).sort((a, b) => distanceSquared(localize(a.point, building.centerWgs84 ? [building.centerWgs84.x, building.centerWgs84.y] : config.origin)) - distanceSquared(localize(b.point, building.centerWgs84 ? [building.centerWgs84.x, building.centerWgs84.y] : config.origin)))[0]?.element;
    const [height, heightSource] = nearest ? buildingHeight(nearest) : [config.maximumFloors * 3, `render estimate: published complex maximum ${config.maximumFloors} floors × 3 m; per-building height unavailable`];
    return [{ id: `hogang:${config.aptSlug}:${building.bulManNo}:${building.buldNmDc}`, name: `${building.buldNmDc}동`, ring: ring.map((p) => localize([p.x, p.y], config.origin)), height: round(height), heightSource, kind: "core", source: `https://hogangnono.com/api/v2/apts/${config.aptSlug}/polygon#building-${building.bulManNo}` }];
  });
  const buildings = [...coreBuildings, ...surroundings];
  const paths = elements.filter((e) => e.type === "way" && e.tags?.highway && (e.geometry?.length ?? 0) >= 2).flatMap((e) => clipPolyline(e.geometry.map((p) => localize([p.lon, p.lat], config.origin))).map((points, index) => ({
    id: `osm-way-${e.id}-${index}`, name: e.tags.name ?? `${e.tags.highway} ${e.id}`, points, width: round(Number.parseFloat(e.tags.width ?? "") || ({ motorway: 16, trunk: 14, primary: 12, secondary: 10, tertiary: 8, residential: 6, service: 4, footway: 2, pedestrian: 4, path: 1.5, steps: 2, cycleway: 2 }[e.tags.highway] ?? 3)), kind: classifyPath(e.tags.highway), source: osmUrl(e),
  })));
  const named = elements.filter((e) => e.tags?.name && pointFor(e)).map((e) => ({ element: e, position: localize(pointFor(e), config.origin) }));
  const pois = [{ id: "home", name: config.name, position: [0, 0], source: `https://hogangnono.com/api/v2/apts/${config.aptSlug}/polygon` }];
  for (const [id, aliases] of Object.entries(config.poi)) {
    const match = named.filter(({ element }) => poiKindMatches(id, element.tags) && aliases.some((alias) => element.tags.name === alias || element.tags.name.includes(alias))).sort((a, b) => Number(aliases.includes(b.element.tags.name)) - Number(aliases.includes(a.element.tags.name)) || distanceSquared(a.position) - distanceSquared(b.position))[0];
    if (match && Math.abs(match.position[0]) <= RADIUS && Math.abs(match.position[1]) <= RADIUS) pois.push({ id, name: match.element.tags.name, position: match.position, source: osmUrl(match.element) });
  }
  const entrance = hogang.entrcPoints?.[0]?.wkt;
  const entranceLocal = entrance ? localize([entrance.x, entrance.y], config.origin) : [0, 0];
  const spawn = paths.flatMap((path) => path.points).filter((point) => !buildings.some((building) => polygonContains(point, building.ring.map(([x, z]) => ({ x, y: z }))))).sort((a, b) => distanceSquared([a[0] - entranceLocal[0], a[1] - entranceLocal[1]]) - distanceSquared([b[0] - entranceLocal[0], b[1] - entranceLocal[1]]))[0] ?? entranceLocal;
  const centerElevation = elevations[Math.floor(GRID_SIZE / 2) * GRID_SIZE + Math.floor(GRID_SIZE / 2)] ?? 0;
  const checked = new Date().toISOString().slice(0, 10);
  return {
    id: config.id, name: config.name, origin: { longitude: config.origin[0], latitude: config.origin[1], elevation: centerElevation }, bounds: { minX: -RADIUS, maxX: RADIUS, minZ: -RADIUS, maxZ: RADIUS }, spawn,
    elevation: { columns: GRID_SIZE, rows: GRID_SIZE, values: elevations, source: "NASA SRTM · Mapzen/Tilezen Terrarium · AWS 공개 지형 타일", resolution: "65×65 렌더 격자(약 20.3m 간격), SRTM 30m 원자료를 쌍선형 재표본화한 절대 표고(m)", status: "공개 저해상도 DEM입니다. 약 20m 격자는 표시용 재표본이며 20m 측량 정밀도를 뜻하지 않습니다. 출입구·경사로·계단·접근성 판단에는 사용할 수 없습니다." },
    buildings, paths, pois,
    sources: [
      { title: "OpenStreetMap geometry", url: "https://www.openstreetmap.org/copyright", checked, note: `ODbL 1.0; surrounding buildings, roads, named POIs, and the spawn's nearest highway vertex retain OSM entity provenance. Core reference boundary is OSM way/${config.coreWay}. Path widths without OSM width tags are render defaults by highway class.` },
      { title: "Hogangnono public apartment polygon endpoint", url: `https://hogangnono.com/apt/${config.aptSlug}`, checked, note: `Core boundary, center, and ${coreBuildings.length} individual building polygons came from the public map response /api/v2/apts/${config.aptSlug}/polygon and were checked against current aerial imagery. Used for this local research prototype; the provider does not declare an open or commercial reuse license.` },
      { title: "Mapzen Terrain Tiles", url: "https://registry.opendata.aws/terrain-tiles/", checked, note: "Elevation data from NASA SRTM (tile response provenance); SRTM is U.S. Government public-domain data. Tilezen processing documentation and source attribution apply." },
      { title: "Dataset quality", url: `https://www.openstreetmap.org/way/${config.coreWay}`, checked, note: config.id === "cherbo" ? "OSM still labels this core as the 행당7 redevelopment site, so the seven completed tower footprints use the current public apartment-polygon response. No community or parking entrances are asserted." : "Core footprint polygons use the public apartment-polygon response; OSM supplies the surrounding town. Unnamed surroundings retain their OSM way IDs." },
    ],
  };
}

await mkdir(RAW, { recursive: true }); await mkdir(WORLDS, { recursive: true });
const manifest = new Map();
for (const file of ["cherbo-satellite.png", "haiver-reference-map.png", "haiver-satellite.png", "haiver-street.png", "xi-satellite.png", "xi-street.png"]) { const bytes = await readFile(new URL(`research/spatial/${file}`, ROOT)); manifest.set(file, { file, url: "https://map.naver.com", sha256: sha256(bytes), bytes: bytes.length, license: "Reference-only Naver map capture; not a redistributable or production texture" }); }
const rawFile = "sindang-combined-overpass.json";
const rawUrl = new URL(rawFile, RAW);
const rawText = process.argv.includes("--reuse") ? await readFile(rawUrl, "utf8") : await fetchOverpass();
await writeFile(rawUrl, rawText);
manifest.set(rawFile, { file: `raw/${rawFile}`, url: OVERPASS_ENDPOINTS[0], sha256: sha256(rawText), bytes: Buffer.byteLength(rawText), license: "OpenStreetMap ODbL 1.0" });
const osm = JSON.parse(rawText);
for (const config of configs) {
  const hogangFile = `${config.id}-hogang-polygon.json`;
  const hogangBytes = await readFile(new URL(`research/spatial/${hogangFile}`, ROOT));
  manifest.set(hogangFile, { file: hogangFile, url: `https://hogangnono.com/api/v2/apts/${config.aptSlug}/polygon`, sha256: sha256(hogangBytes), bytes: hogangBytes.length, license: "No open/commercial reuse license declared; local research reference" });
  const hogang = JSON.parse(hogangBytes.toString()).body.data;
  const elevations = await elevationGrid(config, manifest);
  await writeFile(new URL(`${config.id}.json`, WORLDS), `${JSON.stringify(buildWorld(config, osm, hogang, elevations), null, 2)}\n`);
}
const manifestValue = { generatedAt: new Date().toISOString(), generator: "scripts/collect-spatial.mjs", entries: [...manifest.values()].sort((a, b) => a.file.localeCompare(b.file)) };
await writeFile(new URL("research/spatial/manifest.json", ROOT), `${JSON.stringify(manifestValue, null, 2)}\n`);
console.log(`Wrote ${configs.length} OSM/SRTM spatial worlds from ${manifest.size} raw source files.`);
