import {
  CanvasTexture,
  type Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";
import { brandImage } from "../architecture/brand-images";
import { BRAND_MARKS } from "../architecture/brands";
import type { ComplexProfile } from "../architecture/profiles";
import type { SpatialBuilding } from "../spatial/types";
import { type FacadeEdge, facadeEdges, signEdge } from "./facade-geometry";

type SignPosition = {
  readonly edge: FacadeEdge;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function signMesh(canvas: HTMLCanvasElement, placement: SignPosition): Mesh {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    new PlaneGeometry(placement.width, placement.height),
    new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const { edge } = placement;
  mesh.position.set(
    edge.center[0] + edge.normal[0] * 0.43,
    placement.y,
    edge.center[1] + edge.normal[1] * 0.43,
  );
  mesh.rotation.y = Math.atan2(edge.normal[0], edge.normal[1]);
  mesh.userData["surveyedPosition"] = false;
  return mesh;
}

export function addFacadeSign(
  group: Group,
  building: SpatialBuilding,
  profile: ComplexProfile,
): void {
  const image = brandImage(profile.brand);
  const edge = signEdge(facadeEdges(building.ring));
  if (!image || !edge) return;
  const mark = BRAND_MARKS[profile.brand];
  const canvas = document.createElement("canvas");
  canvas.width = mark.crop.width;
  canvas.height = mark.crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new TypeError("Brand sign canvas unavailable");
  ctx.fillStyle = mark.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    (mark.crop.x / mark.imageWidth) * image.naturalWidth,
    (mark.crop.y / mark.imageHeight) * image.naturalHeight,
    (mark.crop.width / mark.imageWidth) * image.naturalWidth,
    (mark.crop.height / mark.imageHeight) * image.naturalHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const width = Math.min(edge.length * 0.58, profile.brand === "raemian" ? 3.2 : 6.2);
  const height = (width * mark.crop.height) / mark.crop.width;
  const y = building.height * (profile.brand === "summit" ? 0.91 : 0.78);
  const sign = signMesh(canvas, { edge, y, width, height });
  sign.name = `official-brand-${profile.brand}`;
  sign.userData["source"] = mark.source;
  sign.userData["edition"] = mark.edition;
  group.add(sign);

  const label = document.createElement("canvas");
  label.width = 192;
  label.height = 72;
  const labelContext = label.getContext("2d");
  if (!labelContext) throw new TypeError("Building number canvas unavailable");
  labelContext.fillStyle = profile.palette.roof;
  labelContext.font = "600 44px sans-serif";
  labelContext.textAlign = "center";
  labelContext.textBaseline = "middle";
  labelContext.fillText(building.name, 96, 36, 180);
  const number = signMesh(label, { edge, y: y - height / 2 - 1.6, width: 3.5, height: 1.31 });
  number.name = "photo-style-building-number";
  group.add(number);
}
