import { BoxGeometry, type Group } from "three";
import type { ComplexProfile } from "../architecture/profiles";
import type { SpatialBuilding } from "../spatial/types";
import { type FacadeEdge, facadeEdges } from "./facade-geometry";
import { addFacadeSign } from "./facade-sign";
import { Builder } from "./materials";

type Panel = {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly y: number;
  readonly ratio: number;
  readonly color: string;
};

function panel(builder: Builder, edge: FacadeEdge, spec: Panel): void {
  const geometry = new BoxGeometry(spec.width, spec.height, spec.depth);
  geometry.rotateY(edge.angle);
  builder.shape(geometry, spec.color, [
    edge.start[0] + (edge.end[0] - edge.start[0]) * spec.ratio + edge.normal[0] * 0.12,
    spec.y,
    edge.start[1] + (edge.end[1] - edge.start[1]) * spec.ratio + edge.normal[1] * 0.12,
  ]);
}

function crown(
  builder: Builder,
  edges: readonly FacadeEdge[],
  model: { readonly height: number; readonly profile: ComplexProfile },
): void {
  const { height, profile } = model;
  for (const edge of edges) {
    panel(builder, edge, {
      width: edge.length + 0.18,
      height: 0.48,
      depth: 0.35,
      y: height - 0.12,
      ratio: 0.5,
      color: profile.palette.roof,
    });
  }
  const longest = [...edges].sort((a, b) => b.length - a.length)[0];
  if (!longest) return;
  const width = Math.min(longest.length * 0.55, 11);
  const top = profile.facade === "silver-fins" ? 2.4 : 1.6;
  for (const direction of [-1, 1]) {
    panel(builder, longest, {
      width: 0.45,
      height: top,
      depth: 0.48,
      y: height + top / 2,
      ratio: 0.5 + (direction * width) / longest.length / 2,
      color: profile.palette.roof,
    });
  }
  panel(builder, longest, {
    width: width + 0.45,
    height: 0.45,
    depth: 0.48,
    y: height + top,
    ratio: 0.5,
    color: profile.palette.roof,
  });
  if (profile.facade === "silver-fins") {
    for (let fin = 1; fin < 6; fin += 1) {
      panel(builder, longest, {
        width: 0.18,
        height: top,
        depth: 0.36,
        y: height + top / 2,
        ratio: 0.5 + ((fin / 6 - 0.5) * width) / longest.length,
        color: profile.palette.accent,
      });
    }
  }
}

export function addComplexFacade(
  group: Group,
  building: SpatialBuilding,
  profile: ComplexProfile,
): void {
  const edges = facadeEdges(building.ring);
  const builder = new Builder();
  const baseHeight = Math.min(12, building.height * profile.baseRatio);
  for (const edge of edges) {
    panel(builder, edge, {
      width: edge.length + 0.1,
      height: baseHeight,
      depth: 0.28,
      y: baseHeight / 2,
      ratio: 0.5,
      color: profile.palette.base,
    });
    if (edge.length < 7) continue;
    const columnCount = Math.min(6, Math.max(2, Math.floor(edge.length / 7)));
    for (let column = 0; column < columnCount; column += 1) {
      const ratio = (column + 0.5) / columnCount;
      const verticalAccent = profile.facade === "terracotta-bays" && column === 0;
      const silver = profile.facade === "silver-fins";
      panel(builder, edge, {
        width: silver ? Math.min(3.7, (edge.length / columnCount) * 0.55) : 1.4,
        height: building.height - baseHeight - 0.6,
        depth: silver ? 0.36 : 0.23,
        y: (building.height + baseHeight) / 2,
        ratio,
        color: verticalAccent
          ? profile.palette.accent
          : silver
            ? profile.palette.glass
            : profile.palette.side,
      });
      if (silver) {
        panel(builder, edge, {
          width: 0.24,
          height: building.height - baseHeight - 0.4,
          depth: 0.44,
          y: (building.height + baseHeight) / 2,
          ratio: ratio + Math.min(2.1, (edge.length / columnCount) * 0.3) / edge.length,
          color: profile.palette.mullion,
        });
      }
    }
    if (profile.facade === "teal-crown") {
      for (const ratio of [0.89, 0.96]) {
        panel(builder, edge, {
          width: edge.length * 0.68,
          height: 0.95,
          depth: 0.26,
          y: building.height * ratio,
          ratio: 0.5,
          color: profile.palette.accent,
        });
      }
    }
  }
  crown(builder, edges, { height: building.height, profile });
  const details = builder.finish(`photo-facade-${profile.id}`);
  details.userData["photoEvidence"] = profile.evidence;
  details.userData["surveyedDetail"] = false;
  group.add(details);
  addFacadeSign(group, building, profile);
}
