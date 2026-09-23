/** Minimal CSV writer. A BOM keeps Cyrillic readable when Excel opens it. */
export function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: (string | number)[], rows: (string | number | null)[][]): string {
  const lines = [header.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))]
  return `﻿${lines.join('\n')}`
}
