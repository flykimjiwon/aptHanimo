export class SpatialLoadError extends Error {
  constructor(
    readonly reason: "network" | "invalid",
    cause: Error,
  ) {
    super("Spatial data could not be loaded", { cause });
    this.name = "SpatialLoadError";
  }
}

export class GraphicsUnavailableError extends Error {
  constructor(cause: Error) {
    super("WebGL renderer could not be created", { cause });
    this.name = "GraphicsUnavailableError";
  }
}
