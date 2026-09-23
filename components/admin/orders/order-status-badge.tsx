import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus } from '@/lib/orders'

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  confirmed: 'secondary',
  delivered: 'default',
  cancelled: 'destructive',
  returned: 'destructive',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'paid' ? 'secondary' : 'outline'}>
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
