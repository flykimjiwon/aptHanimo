import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const RAW_DIR = new URL("research/spatial/raw/", ROOT);
const RAW_FILE = new URL("sindang-context-osm.json", RAW_DIR);
const EXISTING_FILE = new URL("sindang-combined-overpass.json", RAW_DIR);
const CONFIG_FILE = new URL("research/spatial/config.json", ROOT);
const OUTPUT_DIR = new URL("public/context/", ROOT);
const BBOX = [127.015, 37.551, 127.045, 37.568];
const MAP_URL = `https://api.openstreetmap.org/api/0.6/map?bbox=${BBOX.join(",")}`;
const METRES_PER_LATITUDE_DEGREE = 111_320;
const LIMIT = 650;

const round = (value) => Number(value.toFixed(2));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const localDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const attrs = (value) =>
  Object.fromEntries(
    [...value.matchAll(/([\w:]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
const decode = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
const sourceFor = (id) => `https://www.openstreetmap.org/way/${id}`;

function filteredWays(xml) {
  const nodes = new Map();
  for (const match of xml.matchAll(/<node\b([^>]*)>/g)) {
    const node = attrs(match[1] ?? "");
    const latitude = Number(node.lat);
    const longitude = Number(node.lon);
    if (node.id && Number.isFinite(latitude) && Number.isFinite(longitude))
      nodes.set(node.id, { lat: latitude, lon: longitude });
  }
  const elements = [];
  for (const match of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const way = attrs(match[1] ?? "");
    const body = match[2] ?? "";
    if (!way.id) continue;
    const tags = Object.fromEntries(
      [...body.matchAll(/<tag\b([^>]*)\/>/g)].flatMap((tagMatch) => {
        const tag = attrs(tagMatch[1] ?? "");
        return tag.k && tag.v ? [[tag.k, decode(tag.v)]] : [];
      }),
    );
    const area =
      (tags.name && ["park", "playground"].includes(tags.leisure)) ||
      (tags.name && tags.natural === "wood") ||
      (tags.name && ["grass", "forest"].includes(tags.landuse));
    const line =
      ["rail", "subway", "light_rail"].includes(tags.railway) ||
      tags.barrier === "retaining_wall";
    if (!area && !line) continue;
    const geometry = [...body.matchAll(/<nd\b([^>]*)\/>/g)].flatMap((nodeMatch) => {
      const reference = attrs(nodeMatch[1] ?? "").ref;
      const point = reference ? nodes.get(reference) : undefined;
      return point ? [point] : [];
    });
    if (geometry.length >= 2)
      elements.push({ type: "way", id: Number(way.id), tags, geometry });
  }
  return elements;
}

async function refreshRaw(xml) {
  const payload = {
    source: MAP_URL,
    checked: localDate(),
    responseSha256: hash(xml),
    bbox: BBOX,
    elements: filteredWays(xml),
  };
  await writeFile(RAW_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

async function fetchMap() {
  const response = await fetch(MAP_URL, {
    headers: { "user-agent": "HanbakwiContextCollector/1.0 (local research prototype)" },
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`OSM map request failed: ${response.status}`);
  return response.text();
}

function localize(point, origin) {
  return [
    round(
      (point.lon - origin[0]) *
        METRES_PER_LATITUDE_DEGREE *
        Math.cos((origin[1] * Math.PI) / 180),
    ),
    round(-(point.lat - origin[1]) * METRES_PER_LATITUDE_DEGREE),
  ];
}

function clipEdge(points, inside, intersect) {
  const result = [];
  let previous = points.at(-1);
  for (const current of points) {
    if (!previous) break;
    if (inside(current)) {
      if (!inside(previous)) result.push(intersect(previous, current));
      result.push(current);
    } else if (inside(previous)) result.push(intersect(previous, current));
    previous = current;
  }
  return result;
}

function clipPolygon(points) {
  let output = points;
  const specs = [
    [(point) => point[0] >= -LIMIT, (a, b) => edgeIntersection(a, b, 0, -LIMIT)],
    [(point) => point[0] <= LIMIT, (a, b) => edgeIntersection(a, b, 0, LIMIT)],
    [(point) => point[1] >= -LIMIT, (a, b) => edgeIntersection(a, b, 1, -LIMIT)],
    [(point) => point[1] <= LIMIT, (a, b) => edgeIntersection(a, b, 1, LIMIT)],
  ];
  for (const [inside, intersect] of specs) output = clipEdge(output, inside, intersect);
  if (output.length < 3) return [];
  const first = output[0];
  const last = output.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) output.push(first);
  return output;
}

function edgeIntersection(a, b, axis, value) {
  const amount = (value - a[axis]) / (b[axis] - a[axis]);
  return [
    round(a[0] + (b[0] - a[0]) * amount),
    round(a[1] + (b[1] - a[1]) * amount),
  ];
}

function clipSegment(a, b) {
  let start = 0;
  let end = 1;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  for (const [p, q] of [
    [-dx, a[0] + LIMIT],
    [dx, LIMIT - a[0]],
    [-dz, a[1] + LIMIT],
    [dz, LIMIT - a[1]],
  ]) {
    if (p === 0 && q < 0) return undefined;
    const ratio = q / p;
    if (p < 0) start = Math.max(start, ratio);
    else if (p > 0) end = Math.min(end, ratio);
    if (start > end) return undefined;
  }
  return [
    [round(a[0] + start * dx), round(a[1] + start * dz)],
    [round(a[0] + end * dx), round(a[1] + end * dz)],
  ];
}

function clipPolyline(points) {
  const parts = [];
  let part = [];
  for (let index = 1; index < points.length; index += 1) {
    const segment = clipSegment(points[index - 1], points[index]);
    if (!segment) {
      if (part.length > 1) parts.push(part);
      part = [];
      continue;
    }
    const last = part.at(-1);
    if (last && (last[0] !== segment[0][0] || last[1] !== segment[0][1])) {
      if (part.length > 1) parts.push(part);
      part = [];
    }
    if (part.length === 0) part.push(segment[0]);
    part.push(segment[1]);
  }
  if (part.length > 1) parts.push(part);
  return parts;
}

function areaKind(tags) {
  if (tags.leisure === "playground") return "playground";
  if (tags.natural === "wood" || tags.landuse === "forest") return "wood";
  if (tags.landuse === "grass") return "grass";
  return tags.leisure === "park" ? "park" : null;
}

function polygonArea(ring) {
  let area = 0;
  for (let index = 1; index < ring.length; index += 1) {
    const previous = ring[index - 1];
    const current = ring[index];
    area += previous[0] * current[1] - current[0] * previous[1];
  }
  return Math.abs(area) / 2;
}

function buildContext(config, elements, checked) {
  const areas = [];
  const lines = [];
  const areaIds = new Set();
  for (const element of elements) {
    const points = element.geometry.map((point) => localize(point, config.origin));
    const kind = areaKind(element.tags);
    const first = points[0];
    const last = points.at(-1);
    const closed = first && last && first[0] === last[0] && first[1] === last[1];
    if (kind && element.tags.name && points.length >= 4 && closed) {
      const ring = clipPolygon(points.slice(0, -1));
      if (ring.length >= 4 && polygonArea(ring) >= 1 && !areaIds.has(element.id)) {
        areaIds.add(element.id);
        areas.push({
          id: `osm-way-${element.id}`,
          name: element.tags.name,
          kind,
          ring,
          source: sourceFor(element.id),
        });
      }
    }
    const lineKind = element.tags.barrier === "retaining_wall" ? "retaining-wall" : "rail";
    const isLine =
      lineKind === "retaining-wall" ||
      (element.tags.railway === "rail" && element.tags.tunnel !== "yes");
    if (!isLine) continue;
    for (const [index, part] of clipPolyline(points).entries())
      lines.push({
        id: `osm-way-${element.id}-${index}`,
        name: element.tags.name ?? `OSM ${lineKind} ${element.id}`,
        kind: lineKind,
        points: part,
        source: sourceFor(element.id),
      });
  }
  return {
    id: config.id,
    areas: areas.sort((a, b) => a.id.localeCompare(b.id)),
    lines: lines.sort((a, b) => a.id.localeCompare(b.id)),
    checked,
    source: "https://www.openstreetmap.org/copyright",
  };
}

function validateContext(context) {
  const ids = new Set();
  for (const feature of [...context.areas, ...context.lines]) {
    if (ids.has(feature.id)) throw new TypeError(`Duplicate context feature: ${feature.id}`);
    ids.add(feature.id);
    const points = "ring" in feature ? feature.ring : feature.points;
    if (points.some(([x, z]) => !Number.isFinite(x) || !Number.isFinite(z)))
      throw new TypeError(`Invalid context coordinate: ${feature.id}`);
    if (points.some(([x, z]) => Math.abs(x) > LIMIT || Math.abs(z) > LIMIT))
      throw new RangeError(`Context coordinate outside world bounds: ${feature.id}`);
    if ("ring" in feature) {
      const first = feature.ring[0];
      const last = feature.ring.at(-1);
      if (!first || !last || first[0] !== last[0] || first[1] !== last[1])
        throw new TypeError(`Context polygon is not closed: ${feature.id}`);
    }
  }
}

await mkdir(RAW_DIR, { recursive: true });
await mkdir(OUTPUT_DIR, { recursive: true });
const importArg = process.argv.find((value) => value.startsWith("--import="));
let contextRaw;
if (importArg) contextRaw = await refreshRaw(await readFile(importArg.slice(9), "utf8"));
else if (process.argv.includes("--refresh")) contextRaw = await refreshRaw(await fetchMap());
else contextRaw = JSON.parse(await readFile(RAW_FILE, "utf8"));
const existing = JSON.parse(await readFile(EXISTING_FILE, "utf8"));
const elements = [...(existing.elements ?? []), ...(contextRaw.elements ?? [])].filter(
  (element) => element.type === "way" && Array.isArray(element.geometry),
);
const configs = JSON.parse(await readFile(CONFIG_FILE, "utf8"));
for (const config of configs) {
  const context = buildContext(config, elements, contextRaw.checked);
  validateContext(context);
  await writeFile(new URL(`${config.id}.json`, OUTPUT_DIR), `${JSON.stringify(context, null, 2)}\n`);
  console.log(`${config.id}: ${context.areas.length} areas, ${context.lines.length} lines`);
}
