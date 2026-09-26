import { describe, expect, it } from 'vitest'

import { parseProductRows, type RawRow } from './product-sheet'

function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    name: 'Кашемир ороолт',
    brand: 'Cora',
    category: 'Аксессуар',
    description: '',
    optionName: '',
    optionValue: '',
    sku: '',
    costPrice: '45000',
    salePrice: '98000',
    stock: '10',
    status: '',
    isActive: '',
    ...overrides,
  }
}

describe('parseProductRows', () => {
  it('groups rows that share a product name into one product', () => {
    const { products, issues } = parseProductRows([
      row({ optionName: 'Size', optionValue: 'M' }),
      row({ optionName: 'Size', optionValue: 'L', stock: '6' }),
    ])

    expect(issues).toEqual([])
    expect(products).toHaveLength(1)
    expect(products[0]?.name).toBe('Кашемир ороолт')
    expect(products[0]?.slug).toBe('kashemir-oroolt')
    expect(products[0]?.optionName).toBe('Size')
    expect(products[0]?.variants.map((v) => v.optionValue)).toEqual(['M', 'L'])
    expect(products[0]?.variants[1]?.stock).toBe(6)
  })

  it('suggests a SKU when the cell is empty', () => {
    const { products } = parseProductRows([row({ optionName: 'Size', optionValue: 'M' })])
    expect(products[0]?.variants[0]?.sku).toBe('CORA-KASHEMIROROOLT-M')
  })

  it('keeps a SKU the admin typed', () => {
    const { products } = parseProductRows([row({ sku: 'MY-SKU-1' })])
    expect(products[0]?.variants[0]?.sku).toBe('MY-SKU-1')
  })

  it('normalises money into database form', () => {
    const { products } = parseProductRows([row({ costPrice: '45,000', salePrice: '₮ 98 000' })])
    expect(products[0]?.variants[0]?.costPrice).toBe('45000.00')
    expect(products[0]?.variants[0]?.salePrice).toBe('98000.00')
  })

  it('skips blank padding rows without complaining', () => {
    const { products, issues } = parseProductRows([
      row(),
      { name: '', brand: '', category: '', description: '', optionName: '', optionValue: '', sku: '', costPrice: '', salePrice: '', stock: '', status: '', isActive: '' },
    ])
    expect(issues).toEqual([])
    expect(products).toHaveLength(1)
  })

  it('reports a missing name with the Excel row number', () => {
    const { issues } = parseProductRows([row({ name: '', sku: 'X-1' })])
    expect(issues).toEqual([{ row: 2, message: 'Барааны нэр хоосон байна' }])
  })

  it('requires both prices', () => {
    const { issues } = parseProductRows([row({ salePrice: '' })])
    expect(issues[0]?.message).toContain('заавал')
  })

  it('rejects a negative price', () => {
    const { issues } = parseProductRows([row({ costPrice: '-100' })])
    expect(issues[0]?.message).toContain('сөрөг')
  })

  it('rejects an option name without a value', () => {
    const { issues } = parseProductRows([row({ optionName: 'Size', optionValue: '' })])
    expect(issues[0]?.message).toContain('утга хоосон')
  })

  it('rejects a value without an option name', () => {
    const { issues } = parseProductRows([row({ optionName: '', optionValue: 'M' })])
    expect(issues[0]?.message).toContain('нэр хоосон')
  })

  it('rejects the same option value twice in one product', () => {
    const { issues, products } = parseProductRows([
      row({ optionName: 'Size', optionValue: 'M' }),
      row({ optionName: 'Size', optionValue: 'M' }),
    ])
    expect(issues[0]?.message).toContain('давхардаж')
    expect(products[0]?.variants).toHaveLength(1)
  })

  it('rejects two rows for a product with no options', () => {
    const { issues } = parseProductRows([row(), row()])
    expect(issues[0]?.message).toContain('нэгээс олон мөр')
  })

  it('rejects a duplicate SKU and names the earlier row', () => {
    const { issues } = parseProductRows([
      row({ optionName: 'Size', optionValue: 'M', sku: 'DUP' }),
      row({ name: 'Өөр бараа', sku: 'DUP' }),
    ])
    expect(issues[0]?.message).toContain('2-р мөртэй')
  })

  it('rejects a product whose option name changes between rows', () => {
    const { issues } = parseProductRows([
      row({ optionName: 'Size', optionValue: 'M' }),
      row({ optionName: 'Volume', optionValue: '300ml' }),
    ])
    expect(issues[0]?.message).toContain('ижил байх ёстой')
  })

  it('reads the archived status and the inactive flag', () => {
    const { products } = parseProductRows([row({ status: 'Архивласан', isActive: 'Үгүй' })])
    expect(products[0]?.status).toBe('archived')
    expect(products[0]?.variants[0]?.isActive).toBe(false)
  })

  it('defaults status to active and the variant to enabled', () => {
    const { products } = parseProductRows([row()])
    expect(products[0]?.status).toBe('active')
    expect(products[0]?.variants[0]?.isActive).toBe(true)
  })

  it('treats a blank or broken stock cell as zero', () => {
    const { products } = parseProductRows([row({ stock: '' }), row({ name: 'Хоёр', stock: 'олон' })])
    expect(products[0]?.variants[0]?.stock).toBe(0)
    expect(products[1]?.variants[0]?.stock).toBe(0)
  })

  it('drops a product whose only row failed', () => {
    const { products, issues } = parseProductRows([row({ costPrice: '' })])
    expect(products).toEqual([])
    expect(issues).toHaveLength(1)
  })
})
