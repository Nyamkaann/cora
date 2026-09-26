'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { renderPoster } from '@/lib/poster/render'
import { MetaApiError, type SocialPlatform } from '@/lib/social/meta'
import { checkScheduleWindow, ulaanbaatarToUtc } from '@/lib/social/schedule'
import { createClient } from '@/lib/supabase/server'
import { getPosterRenderInput, posterCachePath, posterPublicUrl } from '@/server/queries/posters'
import { getMetaClientFor } from '@/server/social/accounts'

const POSTERS_BUCKET = 'posters'

const inputSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullish(),
  templateId: z.uuid().nullish(),
  caption: z.string().max(2000).default(''),
  hashtags: z.array(z.string().min(1)).max(30).default([]),
  platforms: z.array(z.enum(['facebook', 'instagram'])).min(1),
  // Both empty means publish now; both set means schedule, in Ulaanbaatar time.
  scheduledDate: z.string().nullish(),
  scheduledTime: z.string().nullish(),
})

export type PostOutcome = {
  platform: SocialPlatform
  ok: boolean
  scheduled: boolean
  permalink: string | null
  error: string | null
}

export type PublishSummary = {
  postId: string
  status: 'published' | 'partial' | 'failed' | 'queued'
  results: PostOutcome[]
}

/** Caption and hashtags are two fields in the form but one string to Meta. */
function buildMessage(caption: string, hashtags: string[]): string {
  const tags = hashtags
    .map((tag) => tag.trim().replace(/^#*/, ''))
    .filter((tag) => tag.length > 0)
    .map((tag) => `#${tag}`)

  return [caption.trim(), tags.join(' ')].filter((part) => part.length > 0).join('\n\n')
}

function errorMessage(error: unknown): string {
  if (error instanceof MetaApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Тодорхойгүй алдаа'
}

/**
 * Renders the poster and puts it in the public bucket. Meta fetches the image
 * by URL, so it has to be reachable from the internet before we call Graph.
 */
async function publishPosterImage(
  productId: string,
  variantId: string | null,
  templateId: string | null,
): Promise<{ url: string; path: string; templateId: string } | null> {
  const input = await getPosterRenderInput(productId, variantId, templateId)
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
  const supabase = await createClient()

  const { error } = await supabase.storage.from(POSTERS_BUCKET).upload(path, png, {
    contentType: 'image/png',
    upsert: true,
  })

  if (error) throw new Error(error.message)

  return { url: posterPublicUrl(path), path, templateId: input.templateId }
}

/**
 * Publishes one product to Facebook and/or Instagram, now or on a schedule.
 *
 * Instagram has no scheduling in the Graph API, so a scheduled post is
 * Facebook only; the dialog blocks the combination before it gets here.
 */
export async function publishProductPost(input: unknown): Promise<ActionResult<PublishSummary>> {
  const user = await requireUser()

  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return actionError('Хүсэлт буруу байна')

  const { productId, platforms, caption, hashtags } = parsed.data
  const variantId = parsed.data.variantId ?? null
  const wantsSchedule = Boolean(parsed.data.scheduledDate && parsed.data.scheduledTime)

  let scheduledAt: Date | null = null
  if (wantsSchedule) {
    scheduledAt = ulaanbaatarToUtc(parsed.data.scheduledDate!, parsed.data.scheduledTime!)

    const window = checkScheduleWindow(scheduledAt)
    if (!window.ok) return actionError(window.reason)

    if (platforms.includes('instagram')) {
      return actionError(
        'Instagram-ыг товлох боломжгүй — Meta-гийн API дэмждэггүй. Одоо нийтлэх эсвэл зөвхөн Facebook-ийг товлоно уу.',
      )
    }
  }

  let poster: Awaited<ReturnType<typeof publishPosterImage>>
  try {
    poster = await publishPosterImage(productId, variantId, parsed.data.templateId ?? null)
  } catch (error) {
    return actionError(`Постер үүсгэж чадсангүй: ${errorMessage(error)}`)
  }

  if (!poster) return actionError('Бараа эсвэл постер загвар олдсонгүй')

  const supabase = await createClient()
  const message = buildMessage(caption, hashtags)

  const { data: post, error: insertError } = await supabase
    .from('scheduled_posts')
    .insert({
      product_id: productId,
      variant_id: variantId,
      template_id: poster.templateId,
      caption,
      hashtags,
      platforms,
      poster_path: poster.path,
      scheduled_at: scheduledAt?.toISOString() ?? null,
      status: 'publishing',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !post) return actionError(friendlyDbError(insertError ?? { message: 'Алдаа' }))

  const results: PostOutcome[] = []

  for (const platform of platforms) {
    const connection = await getMetaClientFor(platform, post.id)

    if (!connection) {
      results.push({
        platform,
        ok: false,
        scheduled: false,
        permalink: null,
        error: 'Холболт олдсонгүй. Сошиал холболт хэсгээс холбоно уу.',
      })
      continue
    }

    try {
      let permalink: string | null = null
      let externalId: string

      if (platform === 'facebook' && scheduledAt) {
        const response = await connection.client.schedulePhotoOnPage(
          connection.externalId,
          { imageUrl: poster.url, message, scheduledAt },
          post.id,
        )
        externalId = response.id
      } else if (platform === 'facebook') {
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
      }

      await supabase.from('post_results').upsert(
        {
          scheduled_post_id: post.id,
          platform,
          status: 'published',
          external_post_id: externalId,
          permalink,
          error: null,
          published_at: scheduledAt ? null : new Date().toISOString(),
        },
        { onConflict: 'scheduled_post_id,platform' },
      )

      results.push({ platform, ok: true, scheduled: Boolean(scheduledAt), permalink, error: null })
    } catch (error) {
      const message = errorMessage(error)

      await supabase.from('post_results').upsert(
        { scheduled_post_id: post.id, platform, status: 'failed', error: message },
        { onConflict: 'scheduled_post_id,platform' },
      )

      results.push({ platform, ok: false, scheduled: false, permalink: null, error: message })
    }
  }

  const succeeded = results.filter((result) => result.ok).length
  const status: PublishSummary['status'] =
    succeeded === 0
      ? 'failed'
      : succeeded < results.length
        ? 'partial'
        : scheduledAt
          ? 'queued'
          : 'published'

  await supabase
    .from('scheduled_posts')
    .update({
      status,
      attempts: 1,
      last_error: results.find((result) => result.error)?.error ?? null,
    })
    .eq('id', post.id)

  revalidatePath(`/admin/products/${productId}`)

  return { ok: true, data: { postId: post.id, status, results } }
}
