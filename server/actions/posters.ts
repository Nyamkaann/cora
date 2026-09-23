'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { DEFAULT_LAYOUT, normalizeLayout } from '@/lib/poster/layout'
import { createClient } from '@/lib/supabase/server'

const boxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})

const textSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  size: z.number().min(8).max(300),
  weight: z.number().min(100).max(900),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  align: z.enum(['left', 'center', 'right']),
  maxLines: z.number().int().min(1).max(4).optional(),
})

const layoutSchema = z.object({
  canvas: z.object({ width: z.number().min(200).max(4000), height: z.number().min(200).max(4000) }),
  product: boxSchema,
  title: textSchema,
  price: textSchema,
  logo: z.object({ x: z.number(), y: z.number(), w: z.number() }),
})

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Загварын нэрээ оруулна уу').max(120),
  background_path: z.string().trim().nullish(),
  layout: layoutSchema,
  is_active: z.boolean().default(true),
})

export async function createPosterTemplate(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser()

  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? 'Мэдээлэл буруу байна')
  }

  const supabase = await createClient()

  const { count } = await supabase
    .from('poster_templates')
    .select('id', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('poster_templates')
    .insert({
      name: parsed.data.name,
      background_path: parsed.data.background_path ?? null,
      layout: normalizeLayout(parsed.data.layout),
      // The very first template becomes the default automatically.
      is_default: (count ?? 0) === 0,
      is_active: parsed.data.is_active,
    })
    .select('id')
    .single()

  if (error || !data) {
    return actionError(friendlyDbError(error ?? { message: 'Загвар үүсгэж чадсангүй' }))
  }

  revalidatePath('/admin/posters')
  return { ok: true, data: { id: data.id } }
}

export async function updatePosterTemplate(
  templateId: string,
  input: unknown,
): Promise<ActionResult> {
  await requireUser()

  const idCheck = z.uuid().safeParse(templateId)
  if (!idCheck.success) return actionError('Загварын ID буруу байна')

  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? 'Мэдээлэл буруу байна')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('poster_templates')
    .update({
      name: parsed.data.name,
      background_path: parsed.data.background_path ?? null,
      layout: normalizeLayout(parsed.data.layout),
      is_active: parsed.data.is_active,
    })
    .eq('id', templateId)

  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/posters')
  return { ok: true, data: undefined }
}

export async function setDefaultPosterTemplate(templateId: string): Promise<ActionResult> {
  await requireUser()

  const idCheck = z.uuid().safeParse(templateId)
  if (!idCheck.success) return actionError('Загварын ID буруу байна')

  const supabase = await createClient()

  const { error: clearError } = await supabase
    .from('poster_templates')
    .update({ is_default: false })
    .neq('id', templateId)

  if (clearError) return actionError(friendlyDbError(clearError))

  const { error } = await supabase
    .from('poster_templates')
    .update({ is_default: true, is_active: true })
    .eq('id', templateId)

  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/posters')
  return { ok: true, data: undefined }
}

export async function deletePosterTemplate(templateId: string): Promise<ActionResult> {
  await requireUser()

  const idCheck = z.uuid().safeParse(templateId)
  if (!idCheck.success) return actionError('Загварын ID буруу байна')

  const supabase = await createClient()

  const { data: template } = await supabase
    .from('poster_templates')
    .select('is_default')
    .eq('id', templateId)
    .maybeSingle()

  if (template?.is_default) {
    return actionError('Үндсэн загварыг устгах боломжгүй. Эхлээд өөр загварыг үндсэн болгоно уу.')
  }

  const { error } = await supabase.from('poster_templates').delete().eq('id', templateId)
  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/posters')
  return { ok: true, data: undefined }
}

/** Layout a brand new template starts from. */
export async function defaultPosterLayout() {
  return DEFAULT_LAYOUT
}
