import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import type { SpatialBuilding } from "../spatial/types";
import type { WorldStyle } from "../world-style";
import { styleBuilding } from "./building-style";
import { spatialBuilding } from "./buildings";
import { worldMapTheme } from "./map-style";
import { Builder, C, MaterialPalette, tree } from "./materials";
import { StyleTextures } from "./style-textures";
import { styledPerson } from "./styled-person";

export function stylePreviewScene(style: WorldStyle): Group {
  const group = new Group();
  group.name = "illustrative-style-preview";
  const palette = new MaterialPalette();
  const theme = worldMapTheme(style.map);
  const floor = new Mesh(
    new CylinderGeometry(4.3, 4.3, 0.35, style.map === "pixel-grid" ? 8 : 48),
    new MeshStandardMaterial({ color: theme.landLow, roughness: 0.9 }),
  );
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  group.add(floor);
  const builder = new Builder(palette);
  builder.box([0, 0.01, 1.5], [7.7, 0.04, 1.5], theme.footpath);
  tree(builder, [-2.8, 0, -1.1], 0.68);
  tree(builder, [3.1, 0, -0.5], 0.5);
  group.add(builder.finish("preview-garden"));
  const building: SpatialBuilding = {
    id: "style-sample",
    name: "미리보기 모형",
    ring: [
      [0.6, -6],
      [5, -6],
      [5, -1],
      [0.6, -1],
    ],
    height: 6.6,
    heightSource: "illustrative model",
    kind: "core",
    source: "style preview",
  };
  const house = spatialBuilding(building, 0, palette);
  styleBuilding(house, building, { style: style.building, textures: new StyleTextures() });
  house.scale.multiplyScalar(0.5);
  group.add(house);
  for (const [name, x, z, scale, color] of [
    ["preview-player", -0.35, 1.2, 1.08, "#6ee7ff"],
    ["preview-friend", -2.15, 0.7, 0.7, C.tree2],
    ["preview-child", 1.55, 1.6, 0.56, C.yellow],
  ] as const) {
    const person = styledPerson(name, style.character, { color, palette });
    person.position.set(x, 0, z);
    person.scale.setScalar(scale);
    group.add(person);
  }
  return group;
}
