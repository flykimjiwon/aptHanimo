import sharp from "sharp";

sharp.concurrency(1);
sharp.cache({ memory: 16, files: 0, items: 16 });
export class PhotoInputError extends Error {}
export async function normalizePhoto(file: File): Promise<Uint8Array> {
  if (file.size > 6 * 1024 * 1024) throw new PhotoInputError("사진은 6MB 이하로 골라 주세요.");
  try {
    const input = sharp(await file.arrayBuffer(), {
      limitInputPixels: 20_000_000,
      animated: false,
    });
    const metadata = await input.metadata();
    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      (metadata.pages ?? 1) > 1
    )
      throw new PhotoInputError("정지된 JPG·PNG·WebP 사진만 받을 수 있어요.");
    const output = await input
      .autoOrient()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    if (output.length > 1024 * 1024)
      throw new PhotoInputError("사진을 조금 작게 저장한 뒤 다시 골라 주세요.");
    return output;
  } catch (error) {
    if (error instanceof PhotoInputError) throw error;
    if (!(error instanceof Error)) throw error;
    throw new PhotoInputError(
      "사진을 읽을 수 없어요. 2천만 화소 이하의 JPG·PNG·WebP로 다시 골라 주세요.",
    );
  }
}
