import 'server-only'

import type { SocialPlatform } from '@/lib/social/meta'
import { createClient } from '@/lib/supabase/server'
import { posterPublicUrl } from '@/server/queries/posters'

export type PostStatus =
  | 'draft'
  | 'queued'
  | 'publishing'
  | 'published'
  | 'partial'
  | 'failed'
  | 'cancelled'

export type PostResultRow = {
  platform: SocialPlatform
  status: 'pending' | 'published' | 'failed'
  permalink: string | null
  error: string | null
  publishedAt: string | null
}

export type PostListRow = {
  id: string
  productId: string
  productName: string
  variantLabel: string | null
  caption: string | null
  hashtags: string[]
  platforms: SocialPlatform[]
  status: PostStatus
  attempts: number
  lastError: string | null
  scheduledAt: string | null
  createdAt: string
  posterUrl: string | null
  results: PostResultRow[]
}

type MaybeOne<T> = T | T[] | null

function one<T>(value: MaybeOne<T> | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

type RawResult = {
  platform: SocialPlatform
  status: 'pending' | 'published' | 'failed'
  permalink: string | null
  error: string | null
  published_at: string | null
}

type RawPost = {
  id: string
  product_id: string
  caption: string | null
  hashtags: string[] | null
  platforms: SocialPlatform[]
  status: PostStatus
  attempts: number
  last_error: string | null
  scheduled_at: string | null
  created_at: string
  poster_path: string | null
  product: MaybeOne<{ name: string }>
  variant: MaybeOne<{ attributes: Record<string, string> | null }>
  results: RawResult[] | null
}

/** Newest first; the page groups them by day. */
export async function getPosts(limit = 100): Promise<PostListRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scheduled_posts')
    .select(
      `id, product_id, caption, hashtags, platforms, status, attempts, last_error,
       scheduled_at, created_at, poster_path,
       product:products ( name ),
       variant:product_variants ( attributes ),
       results:post_results ( platform, status, permalink, error, published_at )`,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return ((data ?? []) as RawPost[]).map((row) => {
    const attributes = one(row.variant)?.attributes ?? null
    const variantLabel = attributes ? Object.values(attributes).join(' / ') : null

    return {
      id: row.id,
      productId: row.product_id,
      productName: one(row.product)?.name ?? 'Устсан бараа',
      variantLabel: variantLabel && variantLabel.length > 0 ? variantLabel : null,
      caption: row.caption,
      hashtags: row.hashtags ?? [],
      platforms: row.platforms,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
      posterUrl: row.poster_path ? posterPublicUrl(row.poster_path) : null,
      results: (row.results ?? []).map((result) => ({
        platform: result.platform,
        status: result.status,
        permalink: result.permalink,
        error: result.error,
        publishedAt: result.published_at,
      })),
    }
  })
}
