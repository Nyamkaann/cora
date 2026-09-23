import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/admin/page-header'
import { ProductsTable } from '@/components/admin/products/products-table'
import { getBrandOptions, getCategoryOptions, getProductList } from '@/server/queries/products'

export const metadata = { title: 'Бараа — Cora' }

export default async function ProductsPage() {
  const [products, brands, categories] = await Promise.all([
    getProductList(),
    getBrandOptions(),
    getCategoryOptions(),
  ])

  return (
    <>
      <PageHeader
        title="Бараа"
        description={`Нийт ${products.length} бараа`}
        actions={
          <Button render={<Link href="/admin/products/new" />}>
            <Plus className="size-4" />
            Шинэ бараа
          </Button>
        }
      />
      <ProductsTable products={products} brands={brands} categories={categories} />
    </>
  )
}
