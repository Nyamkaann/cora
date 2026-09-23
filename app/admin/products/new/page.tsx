import { PageHeader } from '@/components/admin/page-header'
import { ProductForm } from '@/components/admin/products/product-form'
import { getBrandOptions, getCategoryOptions } from '@/server/queries/products'

export const metadata = { title: 'Шинэ бараа — Cora' }

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([getBrandOptions(), getCategoryOptions()])

  return (
    <>
      <PageHeader title="Шинэ бараа" description="Үндсэн мэдээлэл, хувилбар, зургаа оруулна уу." />
      <ProductForm brands={brands} categories={categories} />
    </>
  )
}
