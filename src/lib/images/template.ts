import "server-only";
import sharp from "sharp";
import path from "node:path";

const LOGO_PATH = path.join(process.cwd(), "public", "brand", "cora-logo.png");
const BACKGROUND_COLOR = { r: 253, g: 240, b: 238, alpha: 1 };

type Layout = {
  width: number;
  height: number;
  margin: number;
  logoWidth: number;
  productAreaHeight: number;
  nameFontSize: number;
  priceFontSize: number;
  nameBaselineY: number;
  priceBaselineY: number;
};

// Hand-tuned per output size rather than one formula scaled off a single
// aspect ratio — the three targets (square, portrait, wide) have different
// enough proportions that a single fraction-of-height formula either
// crushes the product area or lets the two text lines collide.
const LAYOUTS: Record<string, Layout> = {
  igSquare: {
    width: 1080,
    height: 1080,
    margin: 44,
    logoWidth: 140,
    productAreaHeight: 648,
    nameFontSize: 46,
    priceFontSize: 64,
    nameBaselineY: 950,
    priceBaselineY: 1030,
  },
  igPortrait: {
    width: 1080,
    height: 1350,
    margin: 44,
    logoWidth: 140,
    productAreaHeight: 742,
    nameFontSize: 46,
    priceFontSize: 64,
    nameBaselineY: 1220,
    priceBaselineY: 1300,
  },
  facebook: {
    width: 1200,
    height: 630,
    margin: 40,
    logoWidth: 130,
    productAreaHeight: 280,
    nameFontSize: 34,
    priceFontSize: 46,
    nameBaselineY: 538,
    priceBaselineY: 598,
  },
};

export const TEMPLATE_SIZES = {
  igSquare: { width: LAYOUTS.igSquare.width, height: LAYOUTS.igSquare.height },
  igPortrait: { width: LAYOUTS.igPortrait.width, height: LAYOUTS.igPortrait.height },
  facebook: { width: LAYOUTS.facebook.width, height: LAYOUTS.facebook.height },
} as const;

export type TemplateSizeKey = keyof typeof TEMPLATE_SIZES;
export type TemplateOutputs = Record<TemplateSizeKey, Buffer>;

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

export function formatPriceForImage(price: number | string) {
  const amount = typeof price === "string" ? Number(price) : price;
  return `${new Intl.NumberFormat("mn-MN").format(amount)}₮`;
}

function buildTextOverlaySvg(layout: Layout, name: string, priceText: string) {
  return Buffer.from(
    `<svg width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .name { font: 700 ${layout.nameFontSize}px sans-serif; fill: #3a2a2f; }
        .price { font: 800 ${layout.priceFontSize}px sans-serif; fill: #b1476b; }
      </style>
      <text x="50%" y="${layout.nameBaselineY}" text-anchor="middle" class="name">${escapeXml(name)}</text>
      <text x="50%" y="${layout.priceBaselineY}" text-anchor="middle" class="price">${escapeXml(priceText)}</text>
    </svg>`
  );
}

async function renderOne(layout: Layout, cutout: Buffer, name: string, priceText: string): Promise<Buffer> {
  const { width, height, margin, productAreaHeight } = layout;

  const productBuffer = await sharp(cutout)
    .resize({
      width: width - margin * 2,
      height: productAreaHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
  const productMeta = await sharp(productBuffer).metadata();
  const productLeft = Math.round((width - (productMeta.width ?? 0)) / 2);
  const productTop = margin + Math.round((productAreaHeight - (productMeta.height ?? 0)) / 2);

  const logoBuffer = await sharp(LOGO_PATH).resize({ width: layout.logoWidth }).toBuffer();
  const textSvg = buildTextOverlaySvg(layout, name, priceText);

  return sharp({
    create: { width, height, channels: 4, background: BACKGROUND_COLOR },
  })
    .composite([
      { input: productBuffer, left: productLeft, top: productTop },
      { input: logoBuffer, left: margin, top: margin },
      { input: textSvg, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

export async function renderProductTemplates(
  cutout: Buffer,
  name: string,
  price: number | string
): Promise<TemplateOutputs> {
  const priceText = formatPriceForImage(price);

  const [igSquare, igPortrait, facebook] = await Promise.all([
    renderOne(LAYOUTS.igSquare, cutout, name, priceText),
    renderOne(LAYOUTS.igPortrait, cutout, name, priceText),
    renderOne(LAYOUTS.facebook, cutout, name, priceText),
  ]);

  return { igSquare, igPortrait, facebook };
}
