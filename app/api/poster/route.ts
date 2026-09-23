import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { getSession } from '@/lib/auth'
import { renderPoster } from '@/lib/poster/render'
import { createClient } from '@/lib/supabase/server'
import { getPosterRenderInput, posterCachePath } from '@/server/queries/posters'

// sharp and resvg are native modules: this route can never run on the edge.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POSTERS_BUCKET = 'posters'

const bodySchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullish(),
  templateId: z.uuid().nullish(),
})

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Хүсэлт буруу байна' }, { status: 400 })
  }

  const input = await getPosterRenderInput(
    parsed.data.productId,
    parsed.data.variantId,
    parsed.data.templateId,
  )

  if (!input) {
    return NextResponse.json({ error: 'Бараа эсвэл загвар олдсонгүй' }, { status: 404 })
  }

  const png = await renderPoster({
    layout: input.layout,
    backgroundUrl: input.backgroundUrl,
    productImageUrl: input.productImageUrl,
    logoUrl: input.logoUrl,
    title: input.title,
    price: input.price,
  })

  // Cache the result in Storage so the same poster is not re-rendered.
  const supabase = await createClient()
  await supabase.storage
    .from(POSTERS_BUCKET)
    .upload(posterCachePath(input.productId, input.templateId, input.variantId), png, {
      contentType: 'image/png',
      upsert: true,
    })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
