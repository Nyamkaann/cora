import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { formatMNT } from '@/lib/money'
import { MOVEMENT_REASON_LABELS } from '@/types/inventory'
import { getVariantMovements, getVariantSummary } from '@/server/queries/inventory'

export const metadata = { title: 'Нөөцийн түүх — Cora' }

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function VariantMovementsPage({
  params,
}: {
  params: Promise<{ variantId: string }>
}) {
  const { variantId } = await params
  const [summary, movements] = await Promise.all([
    getVariantSummary(variantId),
    getVariantMovements(variantId),
  ])

  if (!summary) notFound()

  return (
    <>
      <PageHeader
        title={`${summary.productName} · ${summary.variantLabel}`}
        description={`Одоогийн нөөц ${summary.currentStock} · өртөг ${formatMNT(summary.costPrice)}`}
        actions={
          <Button variant="outline" render={<Link href="/admin/inventory" />}>
            <ArrowLeft className="size-4" />
            Буцах
          </Button>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Огноо</TableHead>
                <TableHead>Шалтгаан</TableHead>
                <TableHead className="text-right">Тоо</TableHead>
                <TableHead className="text-right">Нэгж өртөг</TableHead>
                <TableHead>Тэмдэглэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Хөдөлгөөн бүртгэгдээгүй.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
                    <TableCell>
                      {MOVEMENT_REASON_LABELS[movement.reason] ?? movement.reason}
                    </TableCell>
                    <TableCell
                      className={
                        movement.qty < 0
                          ? 'text-right font-medium text-destructive tabular-nums'
                          : 'text-right font-medium text-emerald-600 tabular-nums'
                      }
                    >
                      {movement.qty > 0 ? `+${movement.qty}` : movement.qty}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {movement.unitCost ? formatMNT(movement.unitCost) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{movement.note ?? '—'}</TableCell>
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
