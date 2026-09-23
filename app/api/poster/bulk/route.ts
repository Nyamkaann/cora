import { NextResponse, type NextRequest } from 'next/server'
import JSZip from 'jszip'
import { z } from 'zod'

import { getSession } from '@/lib/auth'
import { slugify } from '@/lib/slug'
import { renderPoster } from '@/lib/poster/render'
import { getPosterRenderInput } from '@/server/queries/posters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  productIds: z.array(z.uuid()).min(1).max(50),
  templateId: z.uuid().nullish(),
})

/** Renders several posters and hands them back as one ZIP. */
export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Хүсэлт буруу байна' }, { status: 400 })
  }

  const zip = new JSZip()
  let rendered = 0

  for (const productId of parsed.data.productIds) {
    const input = await getPosterRenderInput(productId, null, parsed.data.templateId)
    if (!input) continue

    const png = await renderPoster({
      layout: input.layout,
      backgroundUrl: input.backgroundUrl,
      productImageUrl: input.productImageUrl,
      logoUrl: input.logoUrl,
      title: input.title,
      price: input.price,
    })

    zip.file(`${slugify(input.title) || productId}.png`, png)
    rendered += 1
  }

  if (rendered === 0) {
    return NextResponse.json({ error: 'Үүсгэх бараа олдсонгүй' }, { status: 404 })
  }

  const archive = await zip.generateAsync({ type: 'nodebuffer' })

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="cora-posters.zip"',
      'Cache-Control': 'no-store',
    },
  })
}
