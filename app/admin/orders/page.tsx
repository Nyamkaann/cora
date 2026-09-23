import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/admin/page-header'
import { OrdersTable } from '@/components/admin/orders/orders-table'
import { getOrderList } from '@/server/queries/orders'

export const metadata = { title: 'Захиалга — Cora' }

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; channel?: string; status?: string }>
}) {
  const filters = await searchParams
  const orders = await getOrderList(filters)

  return (
    <>
      <PageHeader
        title="Захиалга"
        description={`Нийт ${orders.length} захиалга`}
        actions={
          <Button render={<Link href="/admin/orders/new" />}>
            <Plus className="size-4" />
            Шинэ захиалга
          </Button>
        }
      />
      <OrdersTable orders={orders} />
    </>
  )
}
