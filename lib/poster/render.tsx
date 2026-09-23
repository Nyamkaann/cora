import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import sharp, { type OverlayOptions } from 'sharp'

import { clampText, normalizeLayout, type PosterLayout } from '@/lib/poster/layout'

export type PosterInput = {
  layout: PosterLayout
  /** Public URLs. Anything missing is simply skipped. */
  backgroundUrl?: string | null
  productImageUrl?: string | null
  logoUrl?: string | null
  title: string
  /** Already formatted, e.g. "₮ 135,000". */
  price: string
}

type FontSet = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[]

let fontCache: FontSet | null = null

/**
 * Cyrillic capable fonts. satori draws the text, because sharp cannot: without
 * these the Mongolian labels come out as boxes.
 */
async function loadFonts(): Promise<FontSet> {
  if (fontCache) return fontCache

  const directory = path.join(process.cwd(), 'public', 'fonts')
  const [regular, bold] = await Promise.all([
    readFile(path.join(directory, 'NotoSans-Regular.ttf')),
    readFile(path.join(directory, 'NotoSans-Bold.ttf')),
  ])

  fontCache = [
    { name: 'Noto Sans', data: regular, weight: 400, style: 'normal' },
    { name: 'Noto Sans', data: bold, weight: 700, style: 'normal' },
  ]

  return fontCache
}

async function fetchImage(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null
  }
}

function justify(align: 'left' | 'center' | 'right') {
  if (align === 'center') return 'center'
  if (align === 'right') return 'flex-end'
  return 'flex-start'
}

function TextLayer({
  layout,
  title,
  price,
}: {
  layout: PosterLayout
  title: string
  price: string
}) {
  const clampedTitle = clampText(title, layout.title.w, layout.title.size, layout.title.maxLines)

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: layout.canvas.width,
        height: layout.canvas.height,
        fontFamily: 'Noto Sans',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: layout.title.x,
          top: layout.title.y,
          width: layout.title.w,
          justifyContent: justify(layout.title.align),
          fontSize: layout.title.size,
          fontWeight: layout.title.weight >= 600 ? 700 : 400,
          color: layout.title.color,
          lineHeight: 1.2,
          textAlign: layout.title.align,
        }}
      >
        {clampedTitle}
      </div>

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: layout.price.x,
          top: layout.price.y,
          width: layout.price.w,
          justifyContent: justify(layout.price.align),
          fontSize: layout.price.size,
          fontWeight: layout.price.weight >= 600 ? 700 : 400,
          color: layout.price.color,
          lineHeight: 1.2,
        }}
      >
        {price}
      </div>
    </div>
  )
}

/**
 * Background PNG, product cutout, then the text layer on top. Returns a PNG
 * buffer at the layout's canvas size.
 */
export async function renderPoster(input: PosterInput): Promise<Buffer> {
  const layout = normalizeLayout(input.layout)
  const { width, height } = layout.canvas

  const [backgroundBuffer, productBuffer, logoBuffer, fonts] = await Promise.all([
    fetchImage(input.backgroundUrl),
    fetchImage(input.productImageUrl),
    fetchImage(input.logoUrl),
    loadFonts(),
  ])

  const base = backgroundBuffer
    ? sharp(backgroundBuffer).resize(width, height, { fit: 'cover' })
    : sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })

  const overlays: OverlayOptions[] = []

  if (productBuffer) {
    // "contain" keeps the product's aspect ratio inside its box.
    const product = await sharp(productBuffer)
      .resize(Math.round(layout.product.w), Math.round(layout.product.h), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()

    overlays.push({
      input: product,
      left: Math.round(layout.product.x),
      top: Math.round(layout.product.y),
    })
  }

  if (logoBuffer) {
    const logo = await sharp(logoBuffer)
      .resize({ width: Math.round(layout.logo.w) })
      .png()
      .toBuffer()

    overlays.push({
      input: logo,
      left: Math.round(layout.logo.x),
      top: Math.round(layout.logo.y),
    })
  }

  const svg = await satori(<TextLayer layout={layout} title={input.title} price={input.price} />, {
    width,
    height,
    fonts,
  })

  const textPng = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(0,0,0,0)',
  })
    .render()
    .asPng()

  overlays.push({ input: textPng, left: 0, top: 0 })

  return base.composite(overlays).png().toBuffer()
}
