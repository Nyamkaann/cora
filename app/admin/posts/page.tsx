import { PageHeader } from '@/components/admin/page-header'
import { PostsList } from '@/components/admin/posts/posts-list'
import { getPosts } from '@/server/queries/posts'

export const metadata = { title: 'Нийтлэл — Cora' }

export default async function PostsPage() {
  const posts = await getPosts()

  const queued = posts.filter((post) => post.status === 'queued').length
  const failed = posts.filter(
    (post) => post.status === 'failed' || post.status === 'partial',
  ).length

  const description = [
    `Нийт ${posts.length} нийтлэл`,
    queued > 0 ? `${queued} товлосон` : null,
    failed > 0 ? `${failed} анхаарал шаардсан` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <PageHeader title="Нийтлэл" description={description} />
      <PostsList posts={posts} />
    </>
  )
}
