import {
  BoxGeometry,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  type Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
} from "three";
import type { SpatialBuilding } from "../spatial/types";
import type { BuildingStyle } from "../world-style";
import { facadeEdges } from "./facade-geometry";
import { Builder } from "./materials";
import type { StyleTextures, SurfacePattern } from "./style-textures";

type BuildingTreatment = {
  readonly roughness: number;
  readonly bevel: number;
  readonly outline: number;
  readonly heightScale: number;
  readonly pattern: SurfacePattern | null;
  readonly tint: string | null;
  readonly bands: number;
};

export const BUILDING_TREATMENTS: Readonly<Record<BuildingStyle, BuildingTreatment>> = {
  "soft-isometric": {
    roughness: 0.9,
    bevel: 0,
    outline: 0.34,
    heightScale: 1,
    pattern: null,
    tint: null,
    bands: 0,
  },
  "pixel-blocks": {
    roughness: 1,
    bevel: 0,
    outline: 0.65,
    heightScale: 1,
    pattern: "pixels",
    tint: null,
    bands: 6,
  },
  "paper-cut": {
    roughness: 1,
    bevel: 0,
    outline: 0.48,
    heightScale: 1,
    pattern: "paper",
    tint: "#fff4df",
    bands: 3,
  },
  "clay-toy": {
    roughness: 0.46,
    bevel: 0.24,
    outline: 0.12,
    heightScale: 1,
    pattern: null,
    tint: "#f4e8d3",
    bands: 0,
  },
  "ink-plan": {
    roughness: 1,
    bevel: 0,
    outline: 0.9,
    heightScale: 1,
    pattern: "hatch",
    tint: "#f5f0df",
    bands: 0,
  },
  woodblock: {
    roughness: 1,
    bevel: 0,
    outline: 0.55,
    heightScale: 1,
    pattern: "wood",
    tint: "#d8b59b",
    bands: 5,
  },
  "flat-roof": {
    roughness: 1,
    bevel: 0,
    outline: 0.6,
    heightScale: 0.07,
    pattern: "grid",
    tint: "#edf0e8",
    bands: 0,
  },
  watercolor: {
    roughness: 1,
    bevel: 0,
    outline: 0.14,
    heightScale: 1,
    pattern: "wash",
    tint: "#f7f6ef",
    bands: 0,
  },
  "manga-cel": {
    roughness: 1,
    bevel: 0,
    outline: 1,
    heightScale: 1,
    pattern: null,
    tint: null,
    bands: 4,
  },
  "white-model": {
    roughness: 0.85,
    bevel: 0.08,
    outline: 0.2,
    heightScale: 1,
    pattern: null,
    tint: "#fffef9",
    bands: 0,
  },
  realistic: {
    roughness: 0.76,
    bevel: 0,
    outline: 0.08,
    heightScale: 1,
    pattern: "grain",
    tint: null,
    bands: 0,
  },
};

function facadeUv(mesh: Mesh): void {
  const position = mesh.geometry.getAttribute("position");
  const values: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    values.push((position.getX(i) + position.getZ(i)) / 12, position.getY(i) / 12);
  }
  mesh.geometry.setAttribute("uv", new Float32BufferAttribute(values, 2));
}

function addBands(group: Group, building: SpatialBuilding, treatment: BuildingTreatment): void {
  if (!treatment.bands || building.kind !== "core") return;
  const builder = new Builder();
  for (const edge of facadeEdges(building.ring)) {
    for (let band = 1; band <= treatment.bands; band += 1) {
      const geometry = new BoxGeometry(edge.length, 0.22, 0.45);
      geometry.rotateY(edge.angle);
      builder.shape(geometry, "#fffef9", [
        edge.center[0],
        (building.height * band) / (treatment.bands + 1),
        edge.center[1],
      ]);
    }
  }
  group.add(builder.finish("style-layer-bands"));
}

export function styleBuilding(
  group: Group,
  building: SpatialBuilding,
  options: { readonly style: BuildingStyle; readonly textures: StyleTextures },
): void {
  const treatment = BUILDING_TREATMENTS[options.style];
  const mass = group.getObjectByName("footprint-extrusion");
  if (treatment.bevel && mass instanceof Mesh && mass.geometry instanceof ExtrudeGeometry) {
    const oldGeometry = mass.geometry;
    const rounded = new ExtrudeGeometry(oldGeometry.parameters.shapes, {
      depth: building.height,
      bevelEnabled: true,
      bevelSize: treatment.bevel,
      bevelThickness: treatment.bevel,
      bevelSegments: 2,
      curveSegments: 1,
      steps: 1,
    });
    rounded.rotateX(-Math.PI / 2);
    mass.geometry = rounded;
    oldGeometry.dispose();
  }
  addBands(group, building, treatment);
  group.scale.y = treatment.heightScale;
  group.userData.renderStyle = options.style;
  group.userData.visualHeightScale = treatment.heightScale;
  group.traverse((object) => {
    if (object instanceof LineSegments && object.material instanceof LineBasicMaterial) {
      object.material.opacity = treatment.outline;
      return;
    }
    if (!(object instanceof Mesh)) return;
    if (options.style === "flat-roof" && object.name !== "footprint-extrusion") {
      object.visible = false;
      return;
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      const window = material.userData.worldWindow === true;
      material.roughness = window && options.style === "realistic" ? 0.2 : treatment.roughness;
      material.metalness = window && options.style === "realistic" ? 0.25 : 0;
      material.flatShading = options.style === "pixel-blocks" || options.style === "manga-cel";
      if (treatment.tint && !window)
        material.color.lerp(
          new Color(treatment.tint),
          options.style === "white-model" ? 0.88 : 0.45,
        );
      if (treatment.pattern && !window) {
        facadeUv(object);
        material.map = options.textures.get(treatment.pattern);
      }
      material.needsUpdate = true;
    }
  });
}
