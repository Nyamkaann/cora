import { describe, expect, it } from 'vitest'

import { parseProductRows } from './product-sheet'
import {
  GUIDE_SHEET_NAME,
  SHEET_NAME,
  addProductSheet,
  buildTemplateWorkbook,
  createWorkbook,
  readProductSheet,
  workbookFromBase64,
  workbookToBase64,
} from './workbook'

/** Writes the workbook out and reads it back, the way an import really works. */
async function roundTrip(workbook: Awaited<ReturnType<typeof createWorkbook>>) {
  return workbookFromBase64(await workbookToBase64(workbook))
}

describe('template workbook', () => {
  it('has both sheets', async () => {
    const reopened = await roundTrip(buildTemplateWorkbook())

    expect(reopened.getWorksheet(SHEET_NAME)).toBeDefined()
    expect(reopened.getWorksheet(GUIDE_SHEET_NAME)).toBeDefined()
  })

  it('survives a write and read, and its example rows import cleanly', async () => {
    const reopened = await roundTrip(buildTemplateWorkbook())
    const { rows, matchedColumns } = readProductSheet(reopened)

    expect(matchedColumns).toBe(12)

    const { products, issues } = parseProductRows(rows)

    expect(issues).toEqual([])
    expect(products).toHaveLength(2)

    const scarf = products.find((product) => product.name === 'Кашемир ороолт')
    expect(scarf?.optionName).toBe('Size')
    expect(scarf?.variants.map((variant) => variant.optionValue)).toEqual(['M', 'L'])
    expect(scarf?.variants[0]?.costPrice).toBe('45000.00')
    expect(scarf?.variants[0]?.stock).toBe(10)

    const bag = products.find((product) => product.name === 'Торгон цүнх')
    expect(bag?.optionName).toBe('')
    expect(bag?.variants).toHaveLength(1)
  })
})

describe('readProductSheet', () => {
  it('matches columns by header, not by position', async () => {
    const workbook = createWorkbook()
    const sheet = workbook.addWorksheet(SHEET_NAME)
    // Deliberately reordered, and with an unknown column in the middle.
    sheet.addRow(['Зарах үнэ', 'Тэмдэглэл', 'Барааны нэр', 'Өртөг'])
    sheet.addRow(['98000', 'хамаагүй', 'Кашемир ороолт', '45000'])

    const { rows, matchedColumns } = readProductSheet(await roundTrip(workbook))

    expect(matchedColumns).toBe(3)

    const { products, issues } = parseProductRows(rows)
    expect(issues).toEqual([])
    expect(products[0]?.name).toBe('Кашемир ороолт')
    expect(products[0]?.variants[0]?.salePrice).toBe('98000.00')
  })

  it('reports no matching columns for a foreign sheet', async () => {
    const workbook = createWorkbook()
    const sheet = workbook.addWorksheet(SHEET_NAME)
    sheet.addRow(['Alpha', 'Beta'])
    sheet.addRow(['1', '2'])

    expect((await readProductSheet(await roundTrip(workbook))).matchedColumns).toBe(0)
  })

  it('reads numeric cells as numbers written by the exporter', async () => {
    const workbook = createWorkbook()
    const sheet = addProductSheet(workbook)
    sheet.addRow({ name: 'Тест', costPrice: 45000, salePrice: 98000 })

    const { rows } = readProductSheet(await roundTrip(workbook))
    const { products } = parseProductRows(rows)

    expect(products[0]?.variants[0]?.costPrice).toBe('45000.00')
  })
})
