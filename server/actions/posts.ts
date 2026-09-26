'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { checkScheduleWindow, ulaanbaatarToUtc } from '@/lib/social/schedule'
import { createClient } from '@/lib/supabase/server'
import { publishPostRow, type PostRow, type PublishSummary } from '@/server/social/publish'

export type { PublishOutcome, PublishSummary } from '@/server/social/publish'

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

/** What the composer shows after a scheduled post is accepted. */
export type QueuedSummary = { postId: string; scheduledAt: string }

export type PublishResult =
  | { kind: 'published'; summary: PublishSummary }
  | { kind: 'queued'; queued: QueuedSummary }

/**
 * Creates one post for a product and either sends it straight away or leaves
 * it queued for the worker.
 *
 * Scheduling is ours rather than Meta's: Instagram has no scheduled publish in
 * the Graph API, so routing both channels through the queue is what lets a
 * scheduled Instagram post exist at all, and it keeps one code path.
 */
export async function publishProductPost(input: unknown): Promise<ActionResult<PublishResult>> {
  const user = await requireUser()

  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return actionError('Хүсэлт буруу байна')

  const { productId, platforms, caption, hashtags } = parsed.data
  const variantId = parsed.data.variantId ?? null
  const templateId = parsed.data.templateId ?? null
  const wantsSchedule = Boolean(parsed.data.scheduledDate && parsed.data.scheduledTime)

  let scheduledAt: Date | null = null
  if (wantsSchedule) {
    scheduledAt = ulaanbaatarToUtc(parsed.data.scheduledDate!, parsed.data.scheduledTime!)

    const window = checkScheduleWindow(scheduledAt)
    if (!window.ok) return actionError(window.reason)
  }

  const supabase = await createClient()

  const { data: post, error: insertError } = await supabase
    .from('scheduled_posts')
    .insert({
      product_id: productId,
      variant_id: variantId,
      template_id: templateId,
      caption,
      hashtags,
      platforms,
      scheduled_at: scheduledAt?.toISOString() ?? null,
      status: scheduledAt ? 'queued' : 'publishing',
      created_by: user.id,
    })
    .select('id, product_id, variant_id, template_id, caption, hashtags, platforms')
    .single()

  if (insertError || !post) return actionError(friendlyDbError(insertError ?? { message: 'Алдаа' }))

  revalidatePath('/admin/posts')

  if (scheduledAt) {
    return {
      ok: true,
      data: { kind: 'queued', queued: { postId: post.id, scheduledAt: scheduledAt.toISOString() } },
    }
  }

  const summary = await publishPostRow(supabase, post as PostRow)

  revalidatePath('/admin/posts')
  revalidatePath(`/admin/products/${productId}`)

  return { ok: true, data: { kind: 'published', summary } }
}

/** Takes a queued post out of the worker's reach. */
export async function cancelPost(postId: string): Promise<ActionResult> {
  await requireUser()

  const parsed = z.uuid().safeParse(postId)
  if (!parsed.success) return actionError('Хүсэлт буруу байна')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', parsed.data)
    .in('status', ['queued', 'draft'])
    .select('id')

  if (error) return actionError(friendlyDbError(error))
  if (!data || data.length === 0) {
    return actionError('Энэ постыг цуцлах боломжгүй — аль хэдийн илгээгдсэн байна.')
  }

  revalidatePath('/admin/posts')
  return { ok: true, data: undefined }
}

/** Sends a failed or partly failed post again, right now. */
export async function retryPost(postId: string): Promise<ActionResult<PublishSummary>> {
  await requireUser()

  const parsed = z.uuid().safeParse(postId)
  if (!parsed.success) return actionError('Хүсэлт буруу байна')

  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('scheduled_posts')
    .select('id, product_id, variant_id, template_id, caption, hashtags, platforms, status')
    .eq('id', parsed.data)
    .maybeSingle()

  if (error) return actionError(friendlyDbError(error))
  if (!post) return actionError('Пост олдсонгүй')
  if (!['failed', 'partial'].includes(post.status)) {
    return actionError('Зөвхөн амжилтгүй болсон постыг дахин илгээнэ.')
  }

  await supabase
    .from('scheduled_posts')
    .update({ status: 'publishing', last_error: null })
    .eq('id', post.id)

  const summary = await publishPostRow(supabase, post as PostRow)

  revalidatePath('/admin/posts')
  return { ok: true, data: summary }
}
