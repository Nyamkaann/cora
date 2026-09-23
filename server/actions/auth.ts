'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/action-result'

const loginSchema = z.object({
  email: z.string().min(1, 'И-мэйлээ оруулна уу').email('И-мэйл буруу байна'),
  password: z.string().min(6, 'Нууц үг хамгийн багадаа 6 тэмдэгт'),
  next: z.string().optional(),
})

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Мэдээлэл буруу байна' } }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { ok: false, error: { message: 'И-мэйл эсвэл нууц үг буруу байна' } }
  }

  revalidatePath('/', 'layout')
  return { ok: true, data: undefined }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
