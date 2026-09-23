'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/orders'
import { updateOrderStatus } from '@/server/actions/orders'

/** Which moves make sense from each state. */
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: ['returned'],
  cancelled: ['pending'],
  returned: [],
}

export function StatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const targets = NEXT_STATUSES[status]
  if (targets.length === 0) return null

  function move(target: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, target)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Төлөв «${ORDER_STATUS_LABELS[target]}» боллоо`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((target) => (
        <Button
          key={target}
          type="button"
          size="sm"
          variant={target === 'cancelled' || target === 'returned' ? 'outline' : 'default'}
          disabled={isPending}
          onClick={() => move(target)}
        >
          {ORDER_STATUS_LABELS[target]}
        </Button>
      ))}
    </div>
  )
}
