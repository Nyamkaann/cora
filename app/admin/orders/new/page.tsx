import { PageHeader } from '@/components/admin/page-header'
import { OrderForm } from '@/components/admin/orders/order-form'
import { getVariantOptions } from '@/server/queries/orders'

export const metadata = { title: 'Шинэ захиалга — Cora' }

export default async function NewOrderPage() {
  const options = await getVariantOptions()

  return (
    <>
      <PageHeader title="Шинэ захиалга" description="Бараагаа нэмэхэд ашиг шууд тооцогдоно." />
      <OrderForm options={options} />
    </>
  )
}
