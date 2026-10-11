import {
  Color,
  Float32BufferAttribute,
  type Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
} from "three";
import type { SpatialWorld } from "../spatial/types";
import { mapTheme } from "../style-lab/map-themes";
import type { MapStyle } from "../world-style";
import { mappedLandAt } from "./neighborhood-context";
import type { StyleTextures, SurfacePattern } from "./style-textures";

export function worldMapTheme(style: MapStyle) {
  const theme = mapTheme(style);
  return style === "realistic-neighborhood"
    ? {
        ...theme,
        id: style,
        landLow: "#b9b9ad",
        landHigh: "#ceccba",
        road: "#747a78",
        footpath: "#c0bab0",
        steps: "#988b7b",
        background: "#d3dce1",
        contour: "#51644e55",
        ink: "#35413d",
      }
    : theme;
}

const PATTERNS: Readonly<Partial<Record<MapStyle, SurfacePattern>>> = {
  "paper-layers": "paper",
  "pixel-grid": "pixels",
  "ink-notebook": "hatch",
  "topo-outdoor": "grid",
  "watercolor-park": "wash",
  "clean-architect": "grid",
  "realistic-neighborhood": "grain",
};

function groundColors(mesh: Mesh, data: SpatialWorld, style: MapStyle): void {
  const theme = worldMapTheme(style);
  const low = Math.min(...data.elevation.values);
  const high = Math.max(...data.elevation.values);
  const positions = mesh.geometry.getAttribute("position");
  const normals = mesh.geometry.getAttribute("normal");
  const colorLow = new Color(theme.landLow);
  const colorHigh = new Color(theme.landHigh);
  const values: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i < positions.count; i += 1) {
    const amount = (positions.getY(i) + data.origin.elevation - low) / Math.max(1, high - low);
    const sun = Math.max(
      0.63,
      0.83 + normals.getX(i) * -0.17 + normals.getZ(i) * 0.12 + normals.getY(i) * 0.17,
    );
    const color = colorLow.clone().lerp(colorHigh, amount).multiplyScalar(sun);
    const land = mappedLandAt(data.id, [positions.getX(i), positions.getZ(i)]);
    if (land) color.lerp(new Color(land === "playground" ? "#cfb294" : optionsGreen(style)), 0.68);
    values.push(color.r, color.g, color.b);
    uv.push(positions.getX(i) / 24, positions.getZ(i) / 24);
  }
  mesh.geometry.setAttribute("color", new Float32BufferAttribute(values, 3));
  mesh.geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
}

function optionsGreen(style: MapStyle): string {
  return style === "realistic-neighborhood" ? "#5f7954" : "#a5c581";
}

export function styleTerrain(
  group: Group,
  data: SpatialWorld,
  options: { readonly style: MapStyle; readonly textures: StyleTextures },
): void {
  const theme = worldMapTheme(options.style);
  const pattern = PATTERNS[options.style];
  group.userData.mapStyle = options.style;
  group.traverse((object) => {
    if (
      object.name === "elevation-contours" &&
      object instanceof LineSegments &&
      object.material instanceof LineBasicMaterial
    ) {
      object.material.color.set(theme.ink);
      object.material.opacity =
        options.style === "topo-outdoor" ? 0.48 : options.style === "paper-layers" ? 0.28 : 0.12;
    }
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    if (object.name === "measured-elevation-ground") {
      groundColors(object, data, options.style);
      if (pattern) object.material.map = options.textures.get(pattern);
      object.material.roughness = options.style === "toy-island" ? 0.6 : 1;
    }
    if (object.name.startsWith("tree-crowns")) {
      const tint = options.style === "realistic-neighborhood" ? "#4c6b48" : theme.landLow;
      object.material.color.lerp(new Color(tint), 0.4);
    }
  });
}
