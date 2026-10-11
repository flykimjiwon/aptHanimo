import { Group } from "three";
import type { SpatialBuilding, SpatialPath, SpatialWorld, XY } from "../spatial/types";
import { DEFAULT_WORLD_STYLE, type WorldStyle } from "../world-style";
import { styleBuilding } from "./building-style";
import { spatialBuilding } from "./buildings";
import { decorativeVegetation } from "./decoration-art";
import { styleTerrain, worldMapTheme } from "./map-style";
import { Builder, C, MaterialPalette } from "./materials";
import { mappedLandAreas, mappedRailways } from "./neighborhood-context";
import { createContourLines, createGroundMesh, groundHeight } from "./spatial-art";
import { StyleTextures } from "./style-textures";
import { addGroundedPlinth, buildingLevel, terrainSection } from "./terrain-relief";

function pathColor(path: SpatialPath, style: WorldStyle): string {
  const theme = worldMapTheme(style.map);
  switch (path.kind) {
    case "road":
      return theme.road;
    case "cycleway":
      return theme.roadCasing;
    case "steps":
      return theme.steps;
    case "footpath":
      return theme.footpath;
  }
}

function addMappedPath(
  builder: Builder,
  data: SpatialWorld,
  model: { readonly path: SpatialPath; readonly style: WorldStyle },
): void {
  const { path, style } = model;
  for (let index = 1; index < path.points.length; index += 1) {
    const start = path.points[index - 1];
    const end = path.points[index];
    if (!start || !end) continue;
    const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const divisions = Math.max(1, Math.ceil(distance / 8));
    const color = pathColor(path, style);
    for (let part = 0; part < divisions; part += 1) {
      const startAmount = part / divisions;
      const endAmount = (part + 1) / divisions;
      const x1 = start[0] + (end[0] - start[0]) * startAmount;
      const z1 = start[1] + (end[1] - start[1]) * startAmount;
      const x2 = start[0] + (end[0] - start[0]) * endAmount;
      const z2 = start[1] + (end[1] - start[1]) * endAmount;
      const y1 = groundHeight(data, [x1, z1]) + 0.1;
      const y2 = groundHeight(data, [x2, z2]) + 0.1;
      builder.beam([x1, y1, z1], [x2, y2, z2], path.width, color);
    }
  }
}

function createPathLayer(data: SpatialWorld, palette: MaterialPalette, style: WorldStyle): Group {
  const builder = new Builder(palette);
  for (const path of data.paths) addMappedPath(builder, data, { path, style });
  const group = builder.finish("mapped-paths");
  group.userData["kind"] = "paths";
  group.userData["pathCount"] = data.paths.length;
  group.userData["sources"] = [...new Set(data.paths.map((path) => path.source))];
  return group;
}

function buildingCenter(building: SpatialBuilding): XY {
  let x = 0;
  let z = 0;
  for (const point of building.ring) {
    x += point[0];
    z += point[1];
  }
  const count = Math.max(building.ring.length, 1);
  return [x / count, z / count];
}

function createBuildingLayer(
  data: SpatialWorld,
  palette: MaterialPalette,
  style: WorldStyle,
): Group {
  const textures = new StyleTextures();
  const layer = new Group();
  layer.name = "mapped-buildings";
  layer.userData["kind"] = "building-layer";
  for (const building of data.buildings) {
    const center = buildingCenter(building);
    const floor =
      building.kind === "core" ? buildingLevel(data, building) : groundHeight(data, center);
    const model = spatialBuilding(building, floor, palette);
    styleBuilding(model, building, { style: style.building, textures });
    if (building.kind === "core") addGroundedPlinth(model, data, building);
    layer.add(model);
  }
  return layer;
}

export function terrain(data: SpatialWorld, style: WorldStyle = DEFAULT_WORLD_STYLE): Group {
  const palette = new MaterialPalette();
  const group = new Group();
  group.name = `terrain-${data.id}`;
  group.userData["kind"] = "terrain";
  group.userData["worldId"] = data.id;
  group.userData["elevationSource"] = data.elevation.source;
  group.userData["buildingIds"] = data.buildings.map((building) => building.id);
  group.add(
    createGroundMesh(data, palette),
    createContourLines(data),
    mappedLandAreas(data, {
      park: style.map === "realistic-neighborhood" ? "#5f7954" : "#a5c581",
      playground: "#cfb294",
      wood: "#66855b",
      grass: "#9db67c",
    }),
    createPathLayer(data, palette, style),
    createBuildingLayer(data, palette, style),
    decorativeVegetation(data, palette),
    terrainSection(data, palette.material(C.bark)),
    mappedRailways(data),
  );
  styleTerrain(group, data, { style: style.map, textures: new StyleTextures() });
  return group;
}
