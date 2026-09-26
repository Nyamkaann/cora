import { parseMoney, toDbNumeric } from '@/lib/money'
import { slugify, suggestSku } from '@/lib/slug'

/**
 * One spreadsheet row describes one variant. Rows that share a product name
 * belong to the same product, which is how a product with several sizes is
 * expressed in a flat sheet.
 */

export type ProductColumn = {
  key: string
  header: string
  width: number
  required?: boolean
  note: string
}

export const PRODUCT_COLUMNS: ProductColumn[] = [
  { key: 'name', header: 'Барааны нэр', width: 28, required: true, note: 'Заавал. Ижил нэртэй мөрүүд нэг бараа болно.' },
  { key: 'brand', header: 'Брэнд', width: 16, note: 'Байхгүй бол хоосон орхино.' },
  { key: 'category', header: 'Ангилал', width: 16, note: 'Байхгүй бол хоосон орхино.' },
  { key: 'description', header: 'Тайлбар', width: 32, note: '' },
  { key: 'optionName', header: 'Сонголтын нэр', width: 16, note: 'Size, Volume эсвэл өөрийн нэр. Хувилбаргүй бол хоосон.' },
  { key: 'optionValue', header: 'Сонголтын утга', width: 16, note: 'M, 300ml гэх мэт. Хувилбаргүй бол хоосон.' },
  { key: 'sku', header: 'SKU', width: 26, note: 'Хоосон бол автоматаар үүснэ.' },
  { key: 'costPrice', header: 'Өртөг', width: 12, required: true, note: 'Зөвхөн тоо. ₮ тэмдэг бичихгүй.' },
  { key: 'salePrice', header: 'Зарах үнэ', width: 12, required: true, note: 'Зөвхөн тоо.' },
  { key: 'stock', header: 'Эхний нөөц', width: 12, note: 'Бүхэл тоо. Хоосон бол 0.' },
  { key: 'status', header: 'Төлөв', width: 14, note: 'Идэвхтэй / Архивласан. Хоосон бол Идэвхтэй.' },
  { key: 'isActive', header: 'Хувилбар идэвхтэй', width: 18, note: 'Тийм / Үгүй. Хоосон бол Тийм.' },
]

export const PRODUCT_HEADERS = PRODUCT_COLUMNS.map((column) => column.header)

export type RawRow = Record<string, string>

export type VariantDraft = {
  optionName: string
  optionValue: string
  sku: string | null
  costPrice: string
  salePrice: string
  stock: number
  isActive: boolean
}

export type ProductDraft = {
  name: string
  slug: string
  brand: string | null
  category: string | null
  description: string | null
  status: 'active' | 'archived'
  optionName: string
  variants: VariantDraft[]
}

export type RowIssue = { row: number; message: string }

export type ParseResult = {
  products: ProductDraft[]
  issues: RowIssue[]
}

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isYes(value: string): boolean {
  const normalized = value.toLowerCase()
  return ['тийм', 'yes', 'true', '1', 'идэвхтэй'].includes(normalized)
}

function isNo(value: string): boolean {
  const normalized = value.toLowerCase()
  return ['үгүй', 'no', 'false', '0', 'идэвхгүй'].includes(normalized)
}

function parseStatus(value: string): 'active' | 'archived' {
  return value.toLowerCase().startsWith('архив') || value.toLowerCase() === 'archived'
    ? 'archived'
    : 'active'
}

function parseStock(value: string): number {
  if (value === '') return 0
  const parsed = Number(value.replace(/[^\d-]/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

function attributeKey(optionName: string, optionValue: string): string {
  return optionName === '' ? '' : `${optionName}=${optionValue}`
}

/**
 * Turns sheet rows into products. Row numbers in the issues are 1 based and
 * include the header, so they match what the admin sees in Excel.
 */
export function parseProductRows(rows: RawRow[], firstDataRow = 2): ParseResult {
  const issues: RowIssue[] = []
  const byProduct = new Map<string, ProductDraft>()
  const seenSku = new Map<string, number>()

  rows.forEach((raw, index) => {
    const rowNumber = index + firstDataRow

    const name = text(raw.name)
    const costRaw = text(raw.costPrice)
    const saleRaw = text(raw.salePrice)

    // A completely blank line is padding, not an error.
    if (name === '' && costRaw === '' && saleRaw === '' && text(raw.sku) === '') return

    if (name === '') {
      issues.push({ row: rowNumber, message: 'Барааны нэр хоосон байна' })
      return
    }

    if (costRaw === '' || saleRaw === '') {
      issues.push({ row: rowNumber, message: 'Өртөг болон зарах үнэ заавал шаардлагатай' })
      return
    }

    const cost = parseMoney(costRaw)
    const sale = parseMoney(saleRaw)

    if (cost.isNegative() || sale.isNegative()) {
      issues.push({ row: rowNumber, message: 'Үнэ сөрөг байж болохгүй' })
      return
    }

    const optionName = text(raw.optionName)
    const optionValue = text(raw.optionValue)

    if (optionName !== '' && optionValue === '') {
      issues.push({ row: rowNumber, message: `«${optionName}» сонголтын утга хоосон байна` })
      return
    }

    if (optionName === '' && optionValue !== '') {
      issues.push({ row: rowNumber, message: 'Сонголтын нэр хоосон байхад утга бичигдсэн байна' })
      return
    }

    const slug = slugify(name)
    let product = byProduct.get(slug)

    if (!product) {
      product = {
        name,
        slug,
        brand: text(raw.brand) || null,
        category: text(raw.category) || null,
        description: text(raw.description) || null,
        status: parseStatus(text(raw.status)),
        optionName,
        variants: [],
      }
      byProduct.set(slug, product)
    } else if (product.optionName !== optionName) {
      issues.push({
        row: rowNumber,
        message: `«${name}» барааны сонголтын нэр мөр бүрд ижил байх ёстой`,
      })
      return
    }

    const duplicate = product.variants.some(
      (variant) =>
        attributeKey(variant.optionName, variant.optionValue) ===
        attributeKey(optionName, optionValue),
    )

    if (duplicate) {
      issues.push({
        row: rowNumber,
        message:
          optionValue === ''
            ? `«${name}» хувилбаргүй бараанд нэгээс олон мөр байна`
            : `«${name}» дотор «${optionValue}» давхардаж байна`,
      })
      return
    }

    const sku = text(raw.sku) || suggestSku(slug, optionValue === '' ? [] : [optionValue])
    const firstSeen = seenSku.get(sku)

    if (firstSeen !== undefined) {
      issues.push({ row: rowNumber, message: `«${sku}» SKU ${firstSeen}-р мөртэй давхардаж байна` })
      return
    }
    seenSku.set(sku, rowNumber)

    const activeCell = text(raw.isActive)

    product.variants.push({
      optionName,
      optionValue,
      sku,
      costPrice: toDbNumeric(cost),
      salePrice: toDbNumeric(sale),
      stock: parseStock(text(raw.stock)),
      isActive: activeCell === '' ? true : isYes(activeCell) || !isNo(activeCell),
    })
  })

  // A product whose every row failed validation has nothing to create.
  const products = [...byProduct.values()].filter((product) => product.variants.length > 0)

  return { products, issues }
}

/** Two rows an admin can copy, so the expected shape is obvious. */
export const TEMPLATE_EXAMPLE_ROWS: RawRow[] = [
  {
    name: 'Кашемир ороолт',
    brand: 'Cora',
    category: 'Аксессуар',
    description: 'Монгол кашемираар нэхсэн ороолт',
    optionName: 'Size',
    optionValue: 'M',
    sku: '',
    costPrice: '45000',
    salePrice: '98000',
    stock: '10',
    status: 'Идэвхтэй',
    isActive: 'Тийм',
  },
  {
    name: 'Кашемир ороолт',
    brand: 'Cora',
    category: 'Аксессуар',
    description: 'Монгол кашемираар нэхсэн ороолт',
    optionName: 'Size',
    optionValue: 'L',
    sku: '',
    costPrice: '45000',
    salePrice: '98000',
    stock: '6',
    status: 'Идэвхтэй',
    isActive: 'Тийм',
  },
  {
    name: 'Торгон цүнх',
    brand: 'Cora',
    category: 'Аксессуар',
    description: '',
    optionName: '',
    optionValue: '',
    sku: '',
    costPrice: '75000',
    salePrice: '148000',
    stock: '4',
    status: 'Идэвхтэй',
    isActive: 'Тийм',
  },
]
