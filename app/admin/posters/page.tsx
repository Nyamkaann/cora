import { PageHeader } from '@/components/admin/page-header'
import { PostersWorkspace } from '@/components/admin/posters/posters-workspace'
import { getPosterProducts, getPosterTemplates } from '@/server/queries/posters'

export const metadata = { title: 'Постер — Cora' }

export default async function PostersPage() {
  const [templates, products] = await Promise.all([getPosterTemplates(), getPosterProducts()])

  return (
    <>
      <PageHeader
        title="Постер"
        description="Дэвсгэр дээр барааны зураг, нэр, үнийг давхарлаж PNG үүсгэнэ. Meta Business Suite руу гараар оруулна."
      />
      <PostersWorkspace templates={templates} products={products} />
    </>
  )
}
