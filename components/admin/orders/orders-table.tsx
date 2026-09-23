'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQueryState } from 'nuqs'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/admin/data-table'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/admin/orders/order-status-badge'
import { formatMNT } from '@/lib/money'
import {
  ORDER_CHANNELS,
  ORDER_CHANNEL_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from '@/lib/orders'
import type { OrderListRow } from '@/types/orders'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function OrdersTable({ orders }: { orders: OrderListRow[] }) {
  const [from, setFrom] = useQueryState('from', { defaultValue: '', shallow: false })
  const [to, setTo] = useQueryState('to', { defaultValue: '', shallow: false })
  const [channel, setChannel] = useQueryState('channel', { defaultValue: 'all', shallow: false })
  const [status, setStatus] = useQueryState('status', { defaultValue: 'all', shallow: false })

  const channelItems = { all: 'Бүх суваг', ...ORDER_CHANNEL_LABELS }
  const statusItems = { all: 'Бүх төлөв', ...ORDER_STATUS_LABELS }

  const columns = useMemo<LegacyColumnDef<OrderListRow, unknown>[]>(
    () => [
      {
        accessorKey: 'orderNo',
        header: 'Дугаар',
        cell: ({ row }) => (
          <Link href={`/admin/orders/${row.original.id}`} className="font-medium hover:underline">
            {row.original.orderNo ?? '—'}
          </Link>
        ),
      },
      {
        accessorKey: 'orderedAt',
        header: 'Огноо',
        cell: ({ row }) => formatDate(row.original.orderedAt),
      },
      {
        accessorKey: 'channel',
        header: 'Суваг',
        cell: ({ row }) => ORDER_CHANNEL_LABELS[row.original.channel],
      },
      {
        accessorKey: 'customerName',
        header: 'Харилцагч',
        cell: ({ row }) => row.original.customerName ?? '—',
      },
      {
        id: 'total',
        header: 'Нийт дүн',
        accessorFn: (row) => Number(row.total),
        cell: ({ row }) => <span className="tabular-nums">{formatMNT(row.original.total)}</span>,
      },
      {
        id: 'profit',
        header: 'Ашиг',
        accessorFn: (row) => Number(row.grossProfit),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMNT(row.original.grossProfit)}{' '}
            <span className="text-xs text-muted-foreground">
              ({row.original.marginPct.toFixed(1)}%)
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Төлөв',
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Төлбөр',
        cell: ({ row }) => <PaymentStatusBadge status={row.original.paymentStatus} />,
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={orders}
      searchPlaceholder="Дугаар, харилцагчаар хайх…"
      emptyMessage="Захиалга олдсонгүй."
      toolbar={
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">
              Эхлэх
            </Label>
            <Input
              id="from"
              type="date"
              className="w-36"
              value={from}
              onChange={(event) => setFrom(event.target.value || null)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">
              Дуусах
            </Label>
            <Input
              id="to"
              type="date"
              className="w-36"
              value={to}
              onChange={(event) => setTo(event.target.value || null)}
            />
          </div>

          <Select
            value={channel}
            onValueChange={(value) => setChannel(String(value))}
            items={channelItems}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Суваг" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх суваг</SelectItem>
              {ORDER_CHANNELS.map((value) => (
                <SelectItem key={value} value={value}>
                  {ORDER_CHANNEL_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => setStatus(String(value))}
            items={statusItems}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төлөв</SelectItem>
              {ORDER_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ORDER_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  )
}
