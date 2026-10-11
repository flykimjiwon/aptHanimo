import { ACESFilmicToneMapping, Color, PCFSoftShadowMap, WebGLRenderer } from "three";
import type { CameraRig } from "./camera";
import type { WorldPresentation } from "./presentation";

export function observeWorldSize(
  host: HTMLElement,
  context: {
    readonly presentation: WorldPresentation;
    readonly renderer: WebGLRenderer;
    readonly rig: CameraRig;
  },
): ResizeObserver {
  const resize = (): void => {
    const { width, height } = host.getBoundingClientRect();
    context.presentation.refreshPixelRatio();
    context.renderer.setSize(width, height);
    context.rig.resize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return observer;
}

export function createSceneRenderer(host: HTMLElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(new Color("#e8eee3"), 0);
  renderer.domElement.setAttribute(
    "aria-label",
    "WASD 또는 조이스틱으로 자유롭게 이동하는 3D 동네",
  );
  host.prepend(renderer.domElement);
  return renderer;
}
