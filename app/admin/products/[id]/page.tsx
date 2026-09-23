import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { ProductForm } from '@/components/admin/products/product-form'
import {
  getBrandOptions,
  getCategoryOptions,
  getProductDetail,
} from '@/server/queries/products'

export const metadata = { title: 'Бараа засах — Cora' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, brands, categories] = await Promise.all([
    getProductDetail(id),
    getBrandOptions(),
    getCategoryOptions(),
  ])

  if (!product) notFound()

  return (
    <>
      <PageHeader
        title={product.name}
        description={`Slug: ${product.slug} · ${product.variants.length} хувилбар`}
      />
      <ProductForm brands={brands} categories={categories} product={product} />
    </>
  )
}
