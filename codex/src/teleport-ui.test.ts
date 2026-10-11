import { expect, test } from "bun:test";
import type { Layer, Mode, Place } from "./data";
import { PLACES } from "./data";
import type { World } from "./scene/world";
import { teleportToKnownPlace } from "./teleport-ui";

class TestElement {
  readonly dataset: Record<string, string> = {};
}

function restoreGlobal(key: "document" | "HTMLElement", descriptor?: PropertyDescriptor): void {
  if (descriptor) Object.defineProperty(globalThis, key, descriptor);
  else Reflect.deleteProperty(globalThis, key);
}

test("community teleport keeps the layer's walk-only mode", () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const elementDescriptor = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");
  const stage = new TestElement();
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: TestElement });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector: () => stage },
  });
  try {
    for (const startingMode of ["car", "bike"] as const) {
      const teleports: string[] = [];
      const fakeWorld = { teleport: (id: string) => teleports.push(id) } as unknown as World;
      const context: {
        places: readonly Place[];
        world: World;
        mode: Mode;
        layer: Layer;
        selected: string;
        switchLayer: (layer: Layer) => void;
        refresh: () => void;
        status: (text: string) => void;
      } = {
        places: PLACES,
        world: fakeWorld,
        mode: startingMode,
        layer: "ground",
        selected: "home",
        switchLayer(layer) {
          context.layer = layer;
          if (layer === "community" && (context.mode === "car" || context.mode === "bike"))
            context.mode = "walk";
        },
        refresh() {},
        status() {},
      };

      teleportToKnownPlace(context, "gym");

      expect(context.layer).toBe("community");
      expect(context.mode).toBe("walk");
      expect(context.selected).toBe("gym");
      expect(teleports).toEqual(["gym"]);
      expect(stage.dataset.currentNode).toBe("gym");
    }
  } finally {
    restoreGlobal("document", documentDescriptor);
    restoreGlobal("HTMLElement", elementDescriptor);
  }
});
