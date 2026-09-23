import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/admin/page-header'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/admin/orders/order-status-badge'
import { StatusActions } from '@/components/admin/orders/status-actions'
import { formatMNT } from '@/lib/money'
import { ORDER_CHANNEL_LABELS } from '@/lib/orders'
import { MOVEMENT_REASON_LABELS } from '@/types/inventory'
import { getOrderDetail } from '@/server/queries/orders'

export const metadata = { title: 'Захиалга — Cora' }

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrderDetail(id)

  if (!order) notFound()

  return (
    <>
      <PageHeader
        title={order.orderNo ?? 'Захиалга'}
        description={`${formatDateTime(order.orderedAt)} · ${ORDER_CHANNEL_LABELS[order.channel]}`}
        actions={
          <Button variant="outline" render={<Link href="/admin/orders" />}>
            <ArrowLeft className="size-4" />
            Буцах
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Барааны мөрүүд</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Бараа</TableHead>
                    <TableHead className="text-right">Тоо</TableHead>
                    <TableHead className="text-right">Нэгж үнэ</TableHead>
                    <TableHead className="text-right">Дүн</TableHead>
                    <TableHead className="text-right">Ашиг</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.productName}</p>
                        {item.variantLabel ? (
                          <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMNT(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMNT(item.lineRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMNT(item.lineProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Түүх</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Бүртгэсэн</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Сүүлд шинэчилсэн</span>
                <span>{formatDateTime(order.updatedAt)}</span>
              </div>

              {order.movements.length === 0 ? (
                <p className="text-muted-foreground">Нөөцийн хөдөлгөөн бүртгэгдээгүй.</p>
              ) : (
                <ul className="space-y-2 border-t pt-3">
                  {order.movements.map((movement) => (
                    <li key={movement.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {MOVEMENT_REASON_LABELS[movement.reason] ?? movement.reason} ·{' '}
                        {movement.productName}
                        {movement.variantLabel ? ` (${movement.variantLabel})` : ''}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {movement.qty > 0 ? `+${movement.qty}` : movement.qty}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Төлөв</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              <StatusActions orderId={order.id} status={order.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тооцоо</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Барааны дүн</dt>
                  <dd className="tabular-nums">{formatMNT(order.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Хөнгөлөлт</dt>
                  <dd className="tabular-nums">−{formatMNT(order.discountAmount)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Нийт борлуулалт</dt>
                  <dd className="font-medium tabular-nums">{formatMNT(order.revenue)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Нийт өртөг</dt>
                  <dd className="tabular-nums">{formatMNT(order.cost)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Бохир ашиг</dt>
                  <dd className="font-medium tabular-nums">{formatMNT(order.grossProfit)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Ашгийн %</dt>
                  <dd className="tabular-nums">{order.marginPct.toFixed(1)}%</dd>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <dt className="text-muted-foreground">Хүргэлт</dt>
                  <dd className="tabular-nums">{formatMNT(order.deliveryFee)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Төлөх дүн</dt>
                  <dd className="font-semibold tabular-nums">{formatMNT(order.total)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Харилцагч</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.customerName ?? '—'}</p>
              <p className="text-muted-foreground">{order.customerPhone ?? '—'}</p>
              <p className="text-muted-foreground">{order.deliveryAddress ?? '—'}</p>
              {order.note ? <p className="pt-2">{order.note}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
