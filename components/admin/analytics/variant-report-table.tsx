'use client'

import { useMemo } from 'react'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'

import { DataTable } from '@/components/admin/data-table'
import { MarginBadge } from '@/components/admin/products/margin-badge'
import { formatMNT } from '@/lib/money'
import type { VariantReportRow } from '@/server/queries/analytics'

export function VariantReportTable({ rows }: { rows: VariantReportRow[] }) {
  const columns = useMemo<LegacyColumnDef<VariantReportRow, unknown>[]>(
    () => [
      {
        accessorKey: 'product_name',
        header: 'Бараа',
        cell: ({ row }) => <span className="font-medium">{row.original.product_name}</span>,
      },
      {
        accessorKey: 'variant_label',
        header: 'Хувилбар',
        cell: ({ row }) => row.original.variant_label || 'Үндсэн',
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.sku ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'units_sold',
        header: 'Зарагдсан',
        cell: ({ row }) => <span className="tabular-nums">{row.original.units_sold}</span>,
      },
      {
        id: 'revenue',
        header: 'Орлого',
        accessorFn: (row) => Number(row.revenue),
        cell: ({ row }) => <span className="tabular-nums">{formatMNT(row.original.revenue)}</span>,
      },
      {
        id: 'cogs',
        header: 'Өртөг',
        accessorFn: (row) => Number(row.cogs),
        cell: ({ row }) => <span className="tabular-nums">{formatMNT(row.original.cogs)}</span>,
      },
      {
        id: 'gross_profit',
        header: 'Бохир ашиг',
        accessorFn: (row) => Number(row.gross_profit),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{formatMNT(row.original.gross_profit)}</span>
        ),
      },
      {
        id: 'margin_pct',
        header: 'Ашгийн %',
        accessorFn: (row) => Number(row.margin_pct),
        cell: ({ row }) => <MarginBadge value={Number(row.original.margin_pct)} />,
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Бараа, SKU-гаар хайх…"
      emptyMessage="Энэ хугацаанд борлуулалт алга."
      pageSize={25}
    />
  )
}
