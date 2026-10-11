import { expect, test } from "bun:test";
import { DoubleSide, ExtrudeGeometry, Mesh, MeshStandardMaterial } from "three";
import { parseSpatial } from "../spatial/load";
import { BUILDING_IDS, DEFAULT_WORLD_STYLE, MAP_IDS } from "../world-style";
import { BUILDING_TREATMENTS, styleBuilding } from "./building-style";
import { spatialBuilding } from "./buildings";
import { styleTerrain } from "./map-style";
import { disposeGroup, MaterialPalette } from "./materials";
import { mappedLandAreas, neighborhoodContext } from "./neighborhood-context";
import { groundHeight } from "./spatial-art";
import { StyleTextures } from "./style-textures";
import { terrain } from "./terrain";
import { buildingLevel } from "./terrain-relief";

const world = parseSpatial(await Bun.file("public/worlds/haiver.json").json());
const cherbo = parseSpatial(await Bun.file("public/worlds/cherbo.json").json());
const core = world.buildings.find((building) => building.kind === "core");
if (!core) throw new RangeError("Haiver needs a core footprint");

test("all eleven building styles change actual render treatment and keep source footprints", () => {
  const source = JSON.stringify(core);
  const signatures = new Set<string>();
  for (const style of BUILDING_IDS) {
    const model = spatialBuilding(core, 0, new MaterialPalette());
    styleBuilding(model, core, { style, textures: new StyleTextures() });
    const mass = model.getObjectByName("footprint-extrusion");
    if (
      !(mass instanceof Mesh) ||
      !(mass.geometry instanceof ExtrudeGeometry) ||
      !Array.isArray(mass.material)
    )
      throw new TypeError("Styled mass unavailable");
    const material = mass.material[1];
    if (!(material instanceof MeshStandardMaterial))
      throw new TypeError("Styled wall material unavailable");
    signatures.add(
      JSON.stringify({
        scale: model.scale.y,
        roughness: material.roughness,
        color: material.color.getHex(),
        texture: material.map?.name,
        bevel: mass.geometry.parameters.options.bevelSize,
        flat: material.flatShading,
        outline: BUILDING_TREATMENTS[style].outline,
      }),
    );
    expect(model.userData.renderStyle).toBe(style);
    expect(JSON.stringify(core)).toBe(source);
    disposeGroup(model);
  }
  expect(signatures.size).toBe(BUILDING_IDS.length);
});

test("all map themes change appearance while keeping ground vertex elevations intact", () => {
  const scene = terrain({ ...world, buildings: [core], paths: [] });
  const ground = scene.getObjectByName("measured-elevation-ground");
  if (!(ground instanceof Mesh)) throw new TypeError("Ground unavailable");
  const positions = Array.from(ground.geometry.getAttribute("position").array);
  const signatures = new Set<string>();
  for (const style of MAP_IDS) {
    styleTerrain(scene, world, { style, textures: new StyleTextures() });
    const colors = ground.geometry.getAttribute("color");
    signatures.add(JSON.stringify(Array.from(colors.array).slice(0, 48)));
    expect(Array.from(ground.geometry.getAttribute("position").array)).toEqual(positions);
  }
  expect(signatures.size).toBe(MAP_IDS.length);
  disposeGroup(scene);
});

test("sloped core foundations connect the roof-level base down to the DEM", () => {
  const scene = terrain(
    { ...world, buildings: [core], paths: [] },
    { ...DEFAULT_WORLD_STYLE, building: "flat-roof" },
  );
  const building = scene.getObjectByName(`building-${core.id}`);
  const support = building?.getObjectByName("dem-grounded-foundation");
  if (!building || !(support instanceof Mesh)) throw new TypeError("Ground support unavailable");
  expect(building.position.y).toBeCloseTo(buildingLevel(world, core));
  expect(support.scale.y * building.scale.y).toBeCloseTo(1);
  expect(support.material.side).toBe(DoubleSide);
  const positions = support.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 1) {
    const localY = positions.getY(i);
    if (localY < -0.051)
      expect(localY + building.position.y).toBeCloseTo(
        groundHeight(world, [positions.getX(i), positions.getZ(i)]) - 0.05,
        3,
      );
  }
  disposeGroup(scene);
});

test("mapped neighborhood context contains sourced closed parks and real surface rails", () => {
  expect(neighborhoodContext("haiver")?.areas.length).toBe(9);
  expect(neighborhoodContext("xi")?.areas.length).toBe(8);
  expect(neighborhoodContext("cherbo")?.lines.filter((line) => line.kind === "rail").length).toBe(
    30,
  );
  for (const id of ["haiver", "xi", "cherbo"]) {
    for (const area of neighborhoodContext(id)?.areas ?? []) {
      expect(area.ring[0]).toEqual(area.ring.at(-1));
      expect(area.source).toStartWith("https://www.openstreetmap.org/way/");
    }
  }
});

test("every sourced Cherbo land polygon gets a batched DEM-draped surface", () => {
  const overlay = mappedLandAreas(cherbo, {
    park: "#5f7954",
    playground: "#cfb294",
    wood: "#66855b",
    grass: "#9db67c",
  });
  const context = neighborhoodContext("cherbo");
  const triangleCounts: unknown = overlay.userData["areaTriangleCounts"];
  if (!context || typeof triangleCounts !== "object" || triangleCounts === null)
    throw new TypeError("Mapped land evidence unavailable");
  expect(overlay.children.length).toBeLessThanOrEqual(2);
  for (const area of context.areas) {
    const count: unknown = Reflect.get(triangleCounts, area.id);
    if (typeof count !== "number") throw new TypeError(`Missing land triangles: ${area.id}`);
    expect(count).toBeGreaterThan(0);
  }
  for (const child of overlay.children) {
    if (!(child instanceof Mesh)) throw new TypeError("Mapped land batch unavailable");
    const positions = child.geometry.getAttribute("position");
    const normals = child.geometry.getAttribute("normal");
    for (let index = 0; index < positions.count; index += 1) {
      expect(positions.getY(index)).toBeCloseTo(
        groundHeight(cherbo, [positions.getX(index), positions.getZ(index)]) + 0.035,
        4,
      );
      expect(normals.getY(index)).toBeGreaterThan(0);
    }
  }
  disposeGroup(overlay);
});
