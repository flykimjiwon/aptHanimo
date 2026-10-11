import { afterEach, expect, test } from "bun:test";
import { DEFAULT_WORLD_STYLE, type WorldStyle } from "./world-style";
import { readWorldStyle, saveWorldStyle, worldStyleUrl } from "./world-style-storage";

type StorageValues = Map<string, string>;
type MockStorage = Readonly<{
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}>;

const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

function installBrowser(search: string, values: StorageValues = new Map(), blockWrites = false) {
  const location = { href: new URL(search, "https://example.test/").href };
  const localStorage: MockStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (blockWrites) throw new DOMException("Storage is unavailable", "SecurityError");
      values.set(key, value);
    },
  };
  const history = {
    state: null,
    replaceState: (_state: unknown, _title: string, nextUrl?: string | URL | null) => {
      if (nextUrl !== undefined && nextUrl !== null)
        location.href = new URL(String(nextUrl), location.href).href;
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location, localStorage, history },
  });
  return { location, values };
}

afterEach(() => {
  if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

test("new users start with the cozy round-buddy world style", () => {
  installBrowser("/");

  expect(readWorldStyle()).toEqual(DEFAULT_WORLD_STYLE);
});

test("valid URL style fields override storage while invalid fields keep the saved choice", () => {
  const saved: WorldStyle = {
    character: "paper-scout",
    building: "clay-toy",
    map: "toy-island",
    view: "isometric",
  };
  const values = new Map([["hanbakwi-world-style-v1", JSON.stringify(saved)]]);
  installBrowser("/?character=ink-friend&map=unknown&view=perspective", values);

  expect(readWorldStyle()).toEqual({
    character: "ink-friend",
    building: "clay-toy",
    map: "toy-island",
    view: "perspective",
  });
});

test("saving stores the selection and preserves complex, speed, and hash in the URL", () => {
  const browser = installBrowser("/?complex=cherbo&speed=4#start");
  const style: WorldStyle = {
    character: "voxel-walker",
    building: "realistic",
    map: "realistic-neighborhood",
    view: "perspective",
  };

  expect(saveWorldStyle(style)).toBe(true);
  expect(readWorldStyle()).toEqual(style);
  const savedUrl = new URL(browser.location.href);
  expect(savedUrl.searchParams.get("complex")).toBe("cherbo");
  expect(savedUrl.searchParams.get("speed")).toBe("4");
  expect(savedUrl.hash).toBe("#start");
});

test("share URLs add style, complex, and night without changing the current URL", () => {
  const browser = installBrowser("https://example.test/style-lab.html?complex=xi&speed=8#home");
  const style: WorldStyle = {
    character: "round-buddy",
    building: "realistic",
    map: "realistic-neighborhood",
    view: "isometric",
  };
  const shared = new URL(worldStyleUrl(style, { complex: "cherbo", night: true }));
  const current = new URL(browser.location.href);

  expect(shared.searchParams.get("complex")).toBe("cherbo");
  expect(shared.searchParams.get("night")).toBe("1");
  expect(shared.searchParams.get("speed")).toBe("8");
  expect(shared.searchParams.get("building")).toBe("realistic");
  expect(shared.searchParams.get("view")).toBe("isometric");
  expect(shared.pathname).toBe("/");
  expect(shared.hash).toBe("#home");
  expect(current.searchParams.get("complex")).toBe("xi");
  expect(current.pathname).toBe("/style-lab.html");
  expect(current.searchParams.has("building")).toBe(false);
});

test("blocked local storage returns false while the URL still carries the style", () => {
  const browser = installBrowser("/?complex=haiver", new Map(), true);
  const style: WorldStyle = {
    character: "paper-scout",
    building: "paper-cut",
    map: "paper-layers",
    view: "flat",
  };

  expect(saveWorldStyle(style)).toBe(false);
  expect(readWorldStyle()).toEqual(style);
  expect(new URL(browser.location.href).searchParams.get("complex")).toBe("haiver");
});
