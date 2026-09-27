import 'server-only'

import { renderPoster } from '@/lib/poster/render'
import { MetaApiError, type SocialPlatform } from '@/lib/social/meta'
import { getPosterRenderInput, posterCachePath, posterPublicUrl } from '@/server/queries/posters'
import { getMetaClientFor, type SocialDb } from '@/server/social/accounts'

const POSTERS_BUCKET = 'posters'

/** One row of scheduled_posts, in the shape publishing needs. */
export type PostRow = {
  id: string
  product_id: string
  variant_id: string | null
  template_id: string | null
  caption: string | null
  hashtags: string[]
  platforms: SocialPlatform[]
}

export type PublishOutcome = {
  platform: SocialPlatform
  ok: boolean
  permalink: string | null
  error: string | null
}

export type PublishSummary = {
  postId: string
  status: 'published' | 'partial' | 'failed'
  results: PublishOutcome[]
}

export function errorMessage(error: unknown): string {
  if (error instanceof MetaApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Тодорхойгүй алдаа'
}

/** Caption and hashtags are two fields in the form but one string to Meta. */
export function buildMessage(caption: string, hashtags: string[]): string {
  const tags = hashtags
    .map((tag) => tag.trim().replace(/^#*/, ''))
    .filter((tag) => tag.length > 0)
    .map((tag) => `#${tag}`)

  return [caption.trim(), tags.join(' ')].filter((part) => part.length > 0).join('\n\n')
}

/**
 * Renders the poster and puts it in the public bucket. Meta fetches the image
 * by URL, so it has to be reachable from the internet before Graph is called.
 * A queued post renders again at publish time, so the price on the poster is
 * the price at the moment it goes out rather than when it was scheduled.
 */
export async function renderAndStorePoster(
  db: SocialDb,
  productId: string,
  variantId: string | null,
  templateId: string | null,
): Promise<{ url: string; path: string; templateId: string } | null> {
  const input = await getPosterRenderInput(productId, variantId, templateId, db)
  if (!input) return null

  const png = await renderPoster({
    layout: input.layout,
    backgroundUrl: input.backgroundUrl,
    productImageUrl: input.productImageUrl,
    logoUrl: input.logoUrl,
    title: input.title,
    price: input.price,
  })

  const path = posterCachePath(input.productId, input.templateId, input.variantId)

  const { error } = await db.storage.from(POSTERS_BUCKET).upload(path, png, {
    contentType: 'image/png',
    upsert: true,
  })

  if (error) throw new Error(error.message)

  return { url: posterPublicUrl(path), path, templateId: input.templateId }
}

/**
 * Publishes one post row to every channel it names, writing a post_results row
 * per channel and leaving scheduled_posts in its final state. A channel that
 * fails does not stop the other one.
 *
 * The same routine serves the composer and the cron worker; the worker hands
 * in the service role client because it runs without a session.
 */
export async function publishPostRow(db: SocialDb, post: PostRow): Promise<PublishSummary> {
  const message = buildMessage(post.caption ?? '', post.hashtags ?? [])
  const results: PublishOutcome[] = []

  let poster: Awaited<ReturnType<typeof renderAndStorePoster>> = null
  let posterError: string | null = null

  try {
    poster = await renderAndStorePoster(db, post.product_id, post.variant_id, post.template_id)
    if (!poster) posterError = 'Бараа эсвэл постер загвар олдсонгүй'
    // Remember what went out, so the post list can show it later.
    else await db.from('scheduled_posts').update({ poster_path: poster.path }).eq('id', post.id)
  } catch (error) {
    posterError = `Постер үүсгэж чадсангүй: ${errorMessage(error)}`
  }

  for (const platform of post.platforms) {
    if (posterError || !poster) {
      results.push({ platform, ok: false, permalink: null, error: posterError })
      continue
    }

    const connection = await getMetaClientFor(platform, post.id, db)

    if (!connection) {
      results.push({
        platform,
        ok: false,
        permalink: null,
        error: 'Холболт олдсонгүй. Сошиал холболт хэсгээс холбоно уу.',
      })
      continue
    }

    try {
      let permalink: string | null = null
      let externalId: string

      if (platform === 'facebook') {
        const response = await connection.client.postPhotoToPage(
          connection.externalId,
          { imageUrl: poster.url, message },
          post.id,
        )
        externalId = response.post_id ?? response.id
        permalink = `https://www.facebook.com/${externalId}`
      } else {
        const response = await connection.client.postToInstagram(
          connection.externalId,
          { imageUrl: poster.url, caption: message },
          post.id,
        )
        externalId = response.id

        // The post is already live; a missing link is not worth failing over.
        permalink = await connection.client
          .getInstagramPermalink(externalId, post.id)
          .catch(() => null)
      }

      await db.from('post_results').upsert(
        {
          scheduled_post_id: post.id,
          platform,
          status: 'published',
          external_post_id: externalId,
          permalink,
          error: null,
          published_at: new Date().toISOString(),
        },
        { onConflict: 'scheduled_post_id,platform' },
      )

      results.push({ platform, ok: true, permalink, error: null })
    } catch (error) {
      const failure = errorMessage(error)

      await db.from('post_results').upsert(
        { scheduled_post_id: post.id, platform, status: 'failed', error: failure },
        { onConflict: 'scheduled_post_id,platform' },
      )

      results.push({ platform, ok: false, permalink: null, error: failure })
    }
  }

  const succeeded = results.filter((result) => result.ok).length
  const status: PublishSummary['status'] =
    succeeded === 0 ? 'failed' : succeeded < results.length ? 'partial' : 'published'

  await db
    .from('scheduled_posts')
    .update({
      status,
      last_error: results.find((result) => result.error)?.error ?? null,
    })
    .eq('id', post.id)

  return { postId: post.id, status, results }
}
