/** Poster layout, stored as jsonb on poster_templates.layout. */
export type Box = { x: number; y: number; w: number; h: number }

export type PosterLayout = {
  canvas: { width: number; height: number }
  product: Box
  title: {
    x: number
    y: number
    w: number
    size: number
    weight: number
    color: string
    align: 'left' | 'center' | 'right'
    maxLines: number
  }
  price: {
    x: number
    y: number
    w: number
    size: number
    weight: number
    color: string
    align: 'left' | 'center' | 'right'
  }
  logo: { x: number; y: number; w: number }
}

/** Instagram portrait, the default Cora poster size. */
export const DEFAULT_LAYOUT: PosterLayout = {
  canvas: { width: 1080, height: 1350 },
  product: { x: 140, y: 260, w: 800, h: 800 },
  title: {
    x: 80,
    y: 1090,
    w: 920,
    size: 56,
    weight: 700,
    color: '#111111',
    align: 'center',
    maxLines: 2,
  },
  price: {
    x: 80,
    // Sits below two lines of title (1090 + 2 x 56 x 1.2), so a long product
    // name never runs into the price.
    y: 1240,
    w: 920,
    size: 72,
    weight: 800,
    color: '#111111',
    align: 'center',
  },
  logo: { x: 80, y: 80, w: 180 },
}

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function align(value: unknown, fallback: 'left' | 'center' | 'right') {
  return value === 'left' || value === 'center' || value === 'right' ? value : fallback
}

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback
}

/** Fills in anything a stored layout is missing, so rendering never crashes. */
export function normalizeLayout(input: unknown): PosterLayout {
  const raw = (input ?? {}) as Record<string, Record<string, unknown> | undefined>
  const canvas = raw.canvas ?? {}
  const product = raw.product ?? {}
  const title = raw.title ?? {}
  const price = raw.price ?? {}
  const logo = raw.logo ?? {}

  return {
    canvas: {
      width: number(canvas.width, DEFAULT_LAYOUT.canvas.width),
      height: number(canvas.height, DEFAULT_LAYOUT.canvas.height),
    },
    product: {
      x: number(product.x, DEFAULT_LAYOUT.product.x),
      y: number(product.y, DEFAULT_LAYOUT.product.y),
      w: number(product.w, DEFAULT_LAYOUT.product.w),
      h: number(product.h, DEFAULT_LAYOUT.product.h),
    },
    title: {
      x: number(title.x, DEFAULT_LAYOUT.title.x),
      y: number(title.y, DEFAULT_LAYOUT.title.y),
      w: number(title.w, DEFAULT_LAYOUT.title.w),
      size: number(title.size, DEFAULT_LAYOUT.title.size),
      weight: number(title.weight, DEFAULT_LAYOUT.title.weight),
      color: color(title.color, DEFAULT_LAYOUT.title.color),
      align: align(title.align, DEFAULT_LAYOUT.title.align),
      maxLines: number(title.maxLines, DEFAULT_LAYOUT.title.maxLines),
    },
    price: {
      x: number(price.x, DEFAULT_LAYOUT.price.x),
      y: number(price.y, DEFAULT_LAYOUT.price.y),
      w: number(price.w, DEFAULT_LAYOUT.price.w),
      size: number(price.size, DEFAULT_LAYOUT.price.size),
      weight: number(price.weight, DEFAULT_LAYOUT.price.weight),
      color: color(price.color, DEFAULT_LAYOUT.price.color),
      align: align(price.align, DEFAULT_LAYOUT.price.align),
    },
    logo: {
      x: number(logo.x, DEFAULT_LAYOUT.logo.x),
      y: number(logo.y, DEFAULT_LAYOUT.logo.y),
      w: number(logo.w, DEFAULT_LAYOUT.logo.w),
    },
  }
}

/**
 * Rough character budget for a box: enough to cut a long product name to the
 * allowed number of lines and finish it with an ellipsis.
 */
export function clampText(text: string, width: number, fontSize: number, maxLines: number): string {
  const charsPerLine = Math.max(4, Math.floor(width / (fontSize * 0.55)))
  const budget = charsPerLine * Math.max(1, maxLines)

  if (text.length <= budget) return text
  return `${text.slice(0, Math.max(1, budget - 1)).trimEnd()}…`
}
