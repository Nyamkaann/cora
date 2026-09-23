'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { weightedAverageCost } from '@/lib/costing'
import { toDbNumeric } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'
import { getInventoryRows } from '@/server/queries/inventory'

const addStockSchema = z.object({
  variant_id: z.uuid(),
  qty: z.number().int().min(1, 'Тоо ширхэг 1-ээс багагүй байх ёстой'),
  unit_cost: z.union([z.string(), z.number()]),
  note: z.string().trim().max(500).nullish(),
})

const adjustSchema = z.object({
  variant_id: z.uuid(),
  qty: z.number().int().refine((value) => value !== 0, 'Тоо ширхэг 0 байж болохгүй'),
  reason: z.enum(['adjustment', 'damage']),
  note: z.string().trim().max(500).nullish(),
})

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Мэдээлэл буруу байна'
}

/**
 * Stock intake. Writes the ledger row and, when the new cost differs, moves
 * variant.cost_price to the weighted average of old and new stock.
 */
export async function addStock(input: unknown): Promise<ActionResult<{ costPrice: string }>> {
  const user = await requireUser()

  const parsed = addStockSchema.safeParse(input)
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))

  const supabase = await createClient()

  const { data: variant, error: variantError } = await supabase
    .from('product_variants')
    .select('id, cost_price')
    .eq('id', parsed.data.variant_id)
    .maybeSingle()

  if (variantError) return actionError(friendlyDbError(variantError))
  if (!variant) return actionError('Хувилбар олдсонгүй')

  const { data: stockRow } = await supabase
    .from('v_variant_stock')
    .select('current_stock')
    .eq('variant_id', parsed.data.variant_id)
    .maybeSingle()

  const currentStock: number = stockRow?.current_stock ?? 0
  const unitCost = toDbNumeric(parsed.data.unit_cost)

  const { error: movementError } = await supabase.from('stock_movements').insert({
    variant_id: parsed.data.variant_id,
    qty: parsed.data.qty,
    reason: 'stock_in',
    unit_cost: unitCost,
    note: parsed.data.note ?? null,
    created_by: user.id,
  })

  if (movementError) return actionError(friendlyDbError(movementError))

  const nextCost = weightedAverageCost({
    currentStock,
    currentCost: variant.cost_price,
    incomingQty: parsed.data.qty,
    incomingCost: unitCost,
  })

  const nextCostValue = toDbNumeric(nextCost)

  if (nextCostValue !== toDbNumeric(variant.cost_price)) {
    const { error: costError } = await supabase
      .from('product_variants')
      .update({ cost_price: nextCostValue })
      .eq('id', parsed.data.variant_id)

    if (costError) return actionError(friendlyDbError(costError))
  }

  revalidatePath('/admin/inventory')
  revalidatePath('/admin/products')
  return { ok: true, data: { costPrice: nextCostValue } }
}

/** Manual correction: stock count, damage or fixing a mistake. */
export async function adjustStock(input: unknown): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = adjustSchema.safeParse(input)
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))

  const supabase = await createClient()

  const { error } = await supabase.from('stock_movements').insert({
    variant_id: parsed.data.variant_id,
    qty: parsed.data.qty,
    reason: parsed.data.reason,
    note: parsed.data.note ?? null,
    created_by: user.id,
  })

  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/inventory')
  return { ok: true, data: undefined }
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Inventory CSV. Built on the server so per variant costs are only ever sent
 * as a finished file the admin asked for.
 */
export async function exportInventoryCsv(): Promise<ActionResult<{ csv: string; filename: string }>> {
  await requireUser()

  const rows = await getInventoryRows()
  const header = ['Бараа', 'Хувилбар', 'SKU', 'Нөөц', 'Өртөг', 'Нөөцийн үнэ']

  const body = rows.map((row) =>
    [
      row.productName,
      row.variantLabel,
      row.sku ?? '',
      row.currentStock,
      row.costPrice,
      row.stockValue,
    ]
      .map(csvCell)
      .join(','),
  )

  const stamp = new Date().toISOString().slice(0, 10)

  return {
    ok: true,
    data: {
      // BOM keeps Cyrillic readable in Excel.
      csv: `﻿${[header.map(csvCell).join(','), ...body].join('\n')}`,
      filename: `cora-noots-${stamp}.csv`,
    },
  }
}
