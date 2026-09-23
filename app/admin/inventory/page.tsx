import Link from 'next/link'
import Decimal from 'decimal.js'

import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/admin/page-header'
import { InventoryExportButton } from '@/components/admin/inventory/export-button'
import { InventorySearchField } from '@/components/admin/inventory/search-field'
import { AddStockDialog, AdjustStockDialog } from '@/components/admin/inventory/stock-dialogs'
import { formatMNT } from '@/lib/money'
import { getInventoryRows } from '@/server/queries/inventory'

export const metadata = { title: 'Нөөц — Cora' }

const LOW_STOCK_THRESHOLD = 5

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const rows = await getInventoryRows(q)

  const totalValue = rows.reduce(
    (total, row) => total.plus(new Decimal(row.stockValue)),
    new Decimal(0),
  )

  return (
    <>
      <PageHeader
        title="Нөөц"
        description={`${rows.length} хувилбар · нийт нөөцийн үнэ ${formatMNT(totalValue.toFixed(2))}`}
        actions={<InventoryExportButton />}
      />

      <div className="mb-3">
        <InventorySearchField />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Бараа</TableHead>
                <TableHead>Хувилбар</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Нөөц</TableHead>
                <TableHead className="text-right">Өртөг</TableHead>
                <TableHead className="text-right">Нөөцийн үнэ</TableHead>
                <TableHead>Сүүлийн хөдөлгөөн</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Хувилбар олдсонгүй.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.variantId}>
                    <TableCell>
                      <Link
                        href={`/admin/inventory/${row.variantId}`}
                        className="font-medium hover:underline"
                      >
                        {row.productName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.variantLabel}</TableCell>
                    <TableCell className="text-muted-foreground">{row.sku ?? '—'}</TableCell>
                    <TableCell
                      className={
                        row.currentStock < LOW_STOCK_THRESHOLD
                          ? 'text-right font-medium text-destructive tabular-nums'
                          : 'text-right tabular-nums'
                      }
                    >
                      {row.currentStock}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMNT(row.costPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMNT(row.stockValue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.lastMovementAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <AddStockDialog
                          target={{
                            variantId: row.variantId,
                            label: `${row.productName} · ${row.variantLabel}`,
                          }}
                        />
                        <AdjustStockDialog
                          target={{
                            variantId: row.variantId,
                            label: `${row.productName} · ${row.variantLabel}`,
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
