import { NextResponse, type NextRequest } from 'next/server'

import { safeEqual } from '@/lib/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishPostRow, type PostRow } from '@/server/social/publish'

// Rendering posters pulls in sharp and resvg, so this can never run on the edge.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// An Instagram container can take most of a minute on its own.
export const maxDuration = 300

const BATCH = 5

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  return safeEqual(token, secret)
}

/**
 * Publishes the posts whose time has come. fn_claim_due_posts flips each row to
 * 'publishing' inside the same statement that selects it, with FOR UPDATE SKIP
 * LOCKED, so two overlapping runs can never pick up the same post.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  const { data, error } = await db.rpc('fn_claim_due_posts', { p_limit: BATCH })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const claimed: PostRow[] = data ?? []
  const summaries = []

  for (const post of claimed) {
    try {
      summaries.push(await publishPostRow(db, post))
    } catch (cause) {
      // publishPostRow handles per channel failures; this is the unexpected
      // kind, and the row must not be left stuck in 'publishing'.
      const message = cause instanceof Error ? cause.message : 'Тодорхойгүй алдаа'
      await db
        .from('scheduled_posts')
        .update({ status: 'failed', last_error: message })
        .eq('id', post.id)

      summaries.push({ postId: post.id, status: 'failed' as const, results: [] })
    }
  }

  return NextResponse.json({
    claimed: claimed.length,
    published: summaries.filter((s) => s.status === 'published').length,
    partial: summaries.filter((s) => s.status === 'partial').length,
    failed: summaries.filter((s) => s.status === 'failed').length,
  })
}
