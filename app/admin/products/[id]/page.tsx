import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { PosterButton } from '@/components/admin/posters/poster-dialog'
import { PostButton } from '@/components/admin/products/post-dialog'
import { ProductForm } from '@/components/admin/products/product-form'
import {
  getBrandOptions,
  getCategoryOptions,
  getProductDetail,
} from '@/server/queries/products'
import { getPosterTemplates } from '@/server/queries/posters'
import { listConnectedAccounts } from '@/server/social/accounts'

export const metadata = { title: 'Бараа засах — Cora' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, brands, categories, templates, accounts] = await Promise.all([
    getProductDetail(id),
    getBrandOptions(),
    getCategoryOptions(),
    getPosterTemplates(),
    listConnectedAccounts(),
  ])

  if (!product) notFound()

  const connected = (platform: 'facebook' | 'instagram') =>
    accounts.find((account) => account.platform === platform && account.isActive)?.name ?? null

  return (
    <>
      <PageHeader
        title={product.name}
        description={`Slug: ${product.slug} · ${product.variants.length} хувилбар`}
        actions={
          <>
            <PostButton
              target={{
                productId: product.id,
                productName: product.name,
                variants: product.variants
                  .filter((variant) => variant.is_active)
                  .map((variant) => ({
                    id: variant.id,
                    label: Object.values(variant.attributes ?? {}).join(' / ') || 'Үндсэн',
                  })),
                templates: templates
                  .filter((template) => template.isActive)
                  .map((template) => ({ id: template.id, name: template.name })),
                facebookName: connected('facebook'),
                instagramName: connected('instagram'),
              }}
            />
            <PosterButton target={{ productId: product.id, productName: product.name }} />
          </>
        }
      />
      <ProductForm brands={brands} categories={categories} product={product} />
    </>
  )
}
