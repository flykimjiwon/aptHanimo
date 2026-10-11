export type BrandId = "raemian" | "xi" | "summit" | "ipark";

export type BrandMark = {
  readonly id: BrandId;
  readonly name: string;
  readonly src: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly crop: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly surface: string;
  readonly source: string;
  readonly edition: string;
};

export const BRAND_MARKS: Readonly<Record<BrandId, BrandMark>> = {
  raemian: {
    id: "raemian",
    name: "래미안",
    src: "/brands/raemian-heritage.png",
    imageWidth: 800,
    imageHeight: 350,
    crop: { x: 130, y: 96, width: 126, height: 158 },
    surface: "#fffef9",
    source: "https://www.raemian.co.kr/community/times/style/view.do?seq=82",
    edition: "사진에 보이는 옛 삼선·來美安 표기",
  },
  xi: {
    id: "xi",
    name: "자이",
    src: "/brands/xi-signature.png",
    imageWidth: 367,
    imageHeight: 367,
    crop: { x: 64, y: 138, width: 250, height: 102 },
    surface: "#ffffff",
    source: "https://www.xi.co.kr/brand/intro",
    edition: "사진의 곡선 Xi 계열 · 공식 보존 시그니처",
  },
  summit: {
    id: "summit",
    name: "푸르지오 써밋",
    src: "/brands/cherbo-footer.png",
    imageWidth: 164,
    imageHeight: 96,
    crop: { x: 0, y: 0, width: 164, height: 48 },
    surface: "#ede9df",
    source: "https://www.prugio.com/lacervo/",
    edition: "라체르보 공식 단지 사이트의 SUMMIT PRUGIO",
  },
  ipark: {
    id: "ipark",
    name: "아이파크",
    src: "/brands/ipark.svg",
    imageWidth: 490,
    imageHeight: 100,
    crop: { x: 0, y: 0, width: 490, height: 100 },
    surface: "#35463d",
    source: "https://www.i-park.com/brand/brand-design",
    edition: "현재 공식 BI · 확장용 브랜드 참고",
  },
};
