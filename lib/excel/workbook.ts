import ExcelJS from 'exceljs'

import { PRODUCT_COLUMNS, TEMPLATE_EXAMPLE_ROWS, type RawRow } from '@/lib/excel/product-sheet'

export const SHEET_NAME = 'Бараа'
export const GUIDE_SHEET_NAME = 'Заавар'

const HEADER_FILL = 'FF1F2937'

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  header.alignment = { vertical: 'middle' }
  header.height = 22
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

export function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cora'
  workbook.created = new Date()
  return workbook
}

export function addProductSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(SHEET_NAME)
  sheet.columns = PRODUCT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }))
  styleHeader(sheet)
  return sheet
}

/** A second tab explaining every column, so the sheet is self documenting. */
export function addGuideSheet(workbook: ExcelJS.Workbook) {
  const guide = workbook.addWorksheet(GUIDE_SHEET_NAME)
  guide.columns = [
    { header: 'Багана', key: 'header', width: 22 },
    { header: 'Заавал эсэх', key: 'required', width: 14 },
    { header: 'Тайлбар', key: 'note', width: 64 },
  ]
  styleHeader(guide)

  for (const column of PRODUCT_COLUMNS) {
    guide.addRow({
      header: column.header,
      required: column.required ? 'Заавал' : 'Заавал биш',
      note: column.note,
    })
  }

  guide.addRow({})
  guide.addRow({
    header: 'Нэг бараа, олон хувилбар',
    required: '',
    note: 'Ижил «Барааны нэр» бүхий мөрүүд нэг бараа болж нэгдэнэ. Хувилбар бүрд нэг мөр.',
  })
  guide.addRow({
    header: 'Дахин оруулах',
    required: '',
    note: 'Ижил нэртэй бараа байвал шинэчилнэ. «Эхний нөөц» зөвхөн ШИНЭ хувилбарт бүртгэгдэнэ — давхар нэмэгдэхгүй.',
  })
}

/** Headers, example rows an admin can overwrite, and the guide tab. */
export function buildTemplateWorkbook(): ExcelJS.Workbook {
  const workbook = createWorkbook()
  const sheet = addProductSheet(workbook)

  for (const row of TEMPLATE_EXAMPLE_ROWS) sheet.addRow(row)

  for (let index = 0; index < TEMPLATE_EXAMPLE_ROWS.length; index += 1) {
    sheet.getRow(index + 2).font = { italic: true, color: { argb: 'FF6B7280' } }
  }

  addGuideSheet(workbook)
  return workbook
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && 'result' in value) {
    return String((value as { result: unknown }).result ?? '')
  }
  if (typeof value === 'object' && 'text' in value) {
    return String((value as { text: unknown }).text ?? '')
  }
  return String(value)
}

export type SheetReadResult = { rows: RawRow[]; matchedColumns: number }

/**
 * Reads the product sheet by header name, so the admin may reorder or hide
 * columns without breaking the import.
 */
export function readProductSheet(workbook: ExcelJS.Workbook): SheetReadResult {
  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0]
  if (!sheet) return { rows: [], matchedColumns: 0 }

  const keyByColumn = new Map<number, string>()

  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = cellText(cell.value).trim()
    const column = PRODUCT_COLUMNS.find((candidate) => candidate.header === header)
    if (column) keyByColumn.set(columnNumber, column.key)
  })

  if (keyByColumn.size === 0) return { rows: [], matchedColumns: 0 }

  const rows: RawRow[] = []
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const raw: RawRow = {}
    for (const [columnNumber, key] of keyByColumn) {
      raw[key] = cellText(row.getCell(columnNumber).value)
    }
    rows.push(raw)
  }

  return { rows, matchedColumns: keyByColumn.size }
}

export async function workbookToBase64(workbook: ExcelJS.Workbook): Promise<string> {
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

export async function workbookFromBase64(base64: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  const bytes = Buffer.from(base64, 'base64')
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0])
  return workbook
}
