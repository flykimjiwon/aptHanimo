import { getElement } from "./ui";
import { GraphicsUnavailableError, SpatialLoadError } from "./world-errors";

export function worldLoading(): void {
  const loading = getElement("#canvas-loading", HTMLElement);
  loading.hidden = false;
  loading.classList.remove("error");
  loading.setAttribute("role", "status");
  loading.innerHTML = "<strong>동네를 펼치고 있어요</strong><span>잠시 후 산책을 시작해요</span>";
}

export function worldUnavailable(error: Error): void {
  const loading = getElement("#canvas-loading", HTMLElement);
  const spatial = error instanceof SpatialLoadError;
  const graphics = error instanceof GraphicsUnavailableError;
  const title = spatial
    ? "동네 자료를 불러오지 못했어요"
    : graphics
      ? "3D 화면을 열지 못했어요"
      : "동네 화면을 준비하지 못했어요";
  const advice = spatial
    ? error.reason === "invalid"
      ? "공간 자료의 형식을 확인할 수 없어요. 잠시 후 다시 시도해 주세요."
      : "연결 상태를 확인하고 다시 시도해 주세요."
    : graphics
      ? "WebGL을 지원하는 브라우저인지 확인하고 다시 시도해 주세요."
      : "다시 시도해 주세요. 문제가 계속되면 페이지를 새로 열어 주세요.";
  loading.hidden = false;
  loading.classList.add("error");
  loading.setAttribute("role", "alert");
  loading.innerHTML = `<strong>${title}</strong><p>${advice}</p><button class="primary-button" data-action="retry-world">다시 시도</button><p>단지 정보와 수첩은 계속 이용할 수 있어요.</p>`;
  console.error("World initialization failed", error);
}
