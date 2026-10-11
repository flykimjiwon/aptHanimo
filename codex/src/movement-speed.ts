export const TRAVEL_SPEEDS = [1, 2, 4, 8, 16] as const;
export type TravelSpeed = (typeof TRAVEL_SPEEDS)[number];

export const DEFAULT_TRAVEL_SPEED: TravelSpeed = 2;
const STORAGE_KEY = "hanbakwi-travel-speed-v1";

type TravelSpeedStorage = Pick<Storage, "getItem" | "setItem">;

export function parseTravelSpeed(value: unknown): TravelSpeed | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  switch (Number(value)) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    default:
      return null;
  }
}

function browserStorage(): TravelSpeedStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (error) {
    if (error instanceof DOMException) return null;
    throw error;
  }
}

export function readTravelSpeed(
  storage: TravelSpeedStorage | null = browserStorage(),
): TravelSpeed {
  try {
    return parseTravelSpeed(storage?.getItem(STORAGE_KEY)) ?? DEFAULT_TRAVEL_SPEED;
  } catch (error) {
    if (error instanceof DOMException) return DEFAULT_TRAVEL_SPEED;
    throw error;
  }
}

export function saveTravelSpeed(
  multiplier: TravelSpeed,
  storage: TravelSpeedStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, String(multiplier));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}

export class TravelSpeedState {
  private current: TravelSpeed;

  constructor(private readonly storage: TravelSpeedStorage | null = browserStorage()) {
    this.current = readTravelSpeed(storage);
  }

  get multiplier(): TravelSpeed {
    return this.current;
  }

  set(multiplier: TravelSpeed): void {
    this.current = multiplier;
    saveTravelSpeed(multiplier, this.storage);
  }

  steps(baseSteps: number): number {
    return Math.max(0, Math.floor(baseSteps)) * this.current;
  }

  scale(delta: number): number {
    return delta * this.current;
  }
}
