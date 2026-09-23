'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { toDbNumeric } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

const expenseSchema = z.object({
  category: z.string().trim().min(1, 'Ангилалаа сонгоно уу').max(100),
  amount: z.union([z.string(), z.number()]),
  expense_date: z.string().min(1, 'Огноогоо оруулна уу'),
  description: z.string().trim().max(500).nullish(),
})

export async function createExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsed = expenseSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? 'Мэдээлэл буруу байна')
  }

  const amount = toDbNumeric(parsed.data.amount)
  if (Number(amount) <= 0) return actionError('Дүн 0-ээс их байх ёстой')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      category: parsed.data.category,
      amount,
      expense_date: parsed.data.expense_date,
      description: parsed.data.description ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    return actionError(friendlyDbError(error ?? { message: 'Зардал бүртгэж чадсангүй' }))
  }

  revalidatePath('/admin/expenses')
  return { ok: true, data: { id: data.id } }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  await requireUser()

  const idCheck = z.uuid().safeParse(expenseId)
  if (!idCheck.success) return actionError('Зардлын ID буруу байна')

  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/expenses')
  return { ok: true, data: undefined }
}
