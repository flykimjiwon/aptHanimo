import { BRAND_MARKS, type BrandId, type BrandMark } from "./brands";

export type BrandImageLoader = (mark: BrandMark) => Promise<HTMLImageElement>;

function browserImage(mark: BrandMark): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new TypeError(`Brand image unavailable: ${mark.id}`));
    image.src = mark.src;
  });
}

export class BrandImageCache {
  private readonly images = new Map<BrandId, HTMLImageElement>();
  private loading: Promise<readonly BrandId[]> | null = null;

  constructor(private readonly loader: BrandImageLoader) {}

  load(): Promise<readonly BrandId[]> {
    if (this.loading) return this.loading;
    const missing = Object.values(BRAND_MARKS).filter((mark) => !this.images.has(mark.id));
    if (missing.length === 0) return Promise.resolve([]);
    const batch = Promise.all(
      missing.map(async (mark): Promise<BrandId | null> => {
        try {
          this.images.set(mark.id, await this.loader(mark));
          return null;
        } catch {
          return mark.id;
        }
      }),
    ).then((results) => results.filter((id): id is BrandId => id !== null));
    this.loading = batch.finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  image(id: BrandId): HTMLImageElement | undefined {
    return this.images.get(id);
  }
}

const cache = new BrandImageCache(browserImage);

export function loadBrandImages(): Promise<readonly BrandId[]> {
  return cache.load();
}

export function brandImage(id: BrandId): HTMLImageElement | undefined {
  return cache.image(id);
}
