'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, friendlyDbError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { toDbNumeric } from '@/lib/money'
import {
  ORDER_CHANNELS,
  ORDER_STATUSES,
  calculateOrderTotals,
  movementsForStatusChange,
  type OrderStatus,
} from '@/lib/orders'
import { createClient } from '@/lib/supabase/server'

const orderItemSchema = z.object({
  variant_id: z.uuid(),
  qty: z.number().int().min(1, 'Тоо ширхэг 1-ээс багагүй байх ёстой'),
  unit_price: z.union([z.string(), z.number()]),
})

const orderInputSchema = z.object({
  channel: z.enum(ORDER_CHANNELS),
  customer_name: z.string().trim().max(200).nullish(),
  customer_phone: z.string().trim().max(50).nullish(),
  delivery_address: z.string().trim().max(500).nullish(),
  note: z.string().trim().max(1000).nullish(),
  delivery_fee: z.union([z.string(), z.number()]).default(0),
  discount_amount: z.union([z.string(), z.number()]).default(0),
  ordered_at: z.string().min(1).nullish(),
  status: z.enum(ORDER_STATUSES).default('pending'),
  items: z.array(orderItemSchema).min(1, 'Хамгийн багадаа нэг бараа нэмнэ үү'),
})

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type VariantSnapshot = {
  id: string
  cost_price: string
  sale_price: string
  attributes: Record<string, string>
  product: { name: string } | { name: string }[] | null
}

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Мэдээлэл буруу байна'
}

function productName(variant: VariantSnapshot): string {
  const product = Array.isArray(variant.product) ? variant.product[0] : variant.product
  return product?.name ?? '—'
}

function variantLabel(variant: VariantSnapshot): string | null {
  const label = Object.values(variant.attributes ?? {}).join(' / ')
  return label === '' ? null : label
}

/** Reads the variants an order refers to, straight from the database. */
async function loadVariants(
  supabase: SupabaseServerClient,
  variantIds: string[],
): Promise<Map<string, VariantSnapshot>> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, cost_price, sale_price, attributes, product:products ( name )')
    .in('id', variantIds)

  if (error) throw new Error(error.message)

  const variants: VariantSnapshot[] = data ?? []
  return new Map(variants.map((variant) => [variant.id, variant]))
}

async function currentStock(
  supabase: SupabaseServerClient,
  variantIds: string[],
): Promise<Map<string, number>> {
  if (variantIds.length === 0) return new Map()

  const { data } = await supabase
    .from('v_variant_stock')
    .select('variant_id, current_stock')
    .in('variant_id', variantIds)

  const rows: { variant_id: string; current_stock: number }[] = data ?? []
  return new Map(rows.map((row) => [row.variant_id, row.current_stock]))
}

export type OrderTotalsPreview = {
  subtotal: string
  revenue: string
  cost: string
  grossProfit: string
  marginPct: number
  total: string
  unitCount: number
}

/**
 * Totals for the order form. Costs are read on the server and only the
 * aggregate comes back, so per variant costs never reach the browser.
 */
export async function previewOrderTotals(input: unknown): Promise<ActionResult<OrderTotalsPreview>> {
  await requireUser()

  const parsed = z
    .object({
      items: z.array(orderItemSchema),
      discount_amount: z.union([z.string(), z.number()]).default(0),
      delivery_fee: z.union([z.string(), z.number()]).default(0),
    })
    .safeParse(input)

  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))

  const supabase = await createClient()
  const variantIds = [...new Set(parsed.data.items.map((item) => item.variant_id))]
  const variants = variantIds.length > 0 ? await loadVariants(supabase, variantIds) : new Map()

  const totals = calculateOrderTotals(
    parsed.data.items.map((item) => ({
      qty: item.qty,
      unitPrice: item.unit_price,
      unitCost: variants.get(item.variant_id)?.cost_price ?? '0',
    })),
    parsed.data.discount_amount,
    parsed.data.delivery_fee,
  )

  return {
    ok: true,
    data: {
      subtotal: totals.subtotal.toFixed(2),
      revenue: totals.revenue.toFixed(2),
      cost: totals.cost.toFixed(2),
      grossProfit: totals.grossProfit.toFixed(2),
      marginPct: totals.marginPct.toDecimalPlaces(1).toNumber(),
      total: totals.total.toFixed(2),
      unitCount: totals.unitCount,
    },
  }
}

export async function createOrder(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsed = orderInputSchema.safeParse(input)
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error))

  const supabase = await createClient()
  const variantIds = [...new Set(parsed.data.items.map((item) => item.variant_id))]
  const variants = await loadVariants(supabase, variantIds)

  const missing = variantIds.find((variantId) => !variants.has(variantId))
  if (missing) return actionError('Сонгосон бараа олдсонгүй')

  // Confirming straight away needs the stock to be there.
  if (parsed.data.status === 'confirmed' || parsed.data.status === 'delivered') {
    const stock = await currentStock(supabase, variantIds)
    for (const item of parsed.data.items) {
      const available = stock.get(item.variant_id) ?? 0
      if (available < item.qty) {
        const variant = variants.get(item.variant_id)
        const label = variant ? `${productName(variant)} ${variantLabel(variant) ?? ''}`.trim() : ''
        return actionError(`Нөөц хүрэхгүй байна: ${label} (үлдэгдэл ${available})`)
      }
    }
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      channel: parsed.data.channel,
      customer_name: parsed.data.customer_name ?? null,
      customer_phone: parsed.data.customer_phone ?? null,
      delivery_address: parsed.data.delivery_address ?? null,
      note: parsed.data.note ?? null,
      delivery_fee: toDbNumeric(parsed.data.delivery_fee),
      discount_amount: toDbNumeric(parsed.data.discount_amount),
      ordered_at: parsed.data.ordered_at ?? new Date().toISOString(),
      status: 'pending',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return actionError(friendlyDbError(orderError ?? { message: 'Захиалга үүсгэж чадсангүй' }))
  }

  const orderId: string = order.id

  // unit_cost is snapshotted here: later cost changes must not move past profit.
  const { error: itemsError } = await supabase.from('order_items').insert(
    parsed.data.items.map((item) => {
      const variant = variants.get(item.variant_id) as VariantSnapshot

      return {
        order_id: orderId,
        variant_id: item.variant_id,
        qty: item.qty,
        unit_price: toDbNumeric(item.unit_price),
        unit_cost: toDbNumeric(variant.cost_price),
        product_name_snapshot: productName(variant),
        variant_label_snapshot: variantLabel(variant),
      }
    }),
  )

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', orderId)
    return actionError(friendlyDbError(itemsError))
  }

  if (parsed.data.status !== 'pending') {
    const transition = await updateOrderStatus(orderId, parsed.data.status)
    if (!transition.ok) {
      // The order itself is saved, so report the failure without losing it.
      revalidatePath('/admin/orders')
      return actionError(`Захиалга хадгалагдсан ч төлөв солиход алдаа гарлаа: ${transition.error.message}`)
    }
  }

  revalidatePath('/admin/orders')
  revalidatePath('/admin/inventory')
  return { ok: true, data: { id: orderId } }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const user = await requireUser()

  const idCheck = z.uuid().safeParse(orderId)
  if (!idCheck.success) return actionError('Захиалгын ID буруу байна')

  const statusCheck = z.enum(ORDER_STATUSES).safeParse(status)
  if (!statusCheck.success) return actionError('Тодорхойгүй төлөв')

  const supabase = await createClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('status, items:order_items ( variant_id, qty, product_name_snapshot, variant_label_snapshot )')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) return actionError(friendlyDbError(orderError))
  if (!order) return actionError('Захиалга олдсонгүй')

  type Item = {
    variant_id: string
    qty: number
    product_name_snapshot: string
    variant_label_snapshot: string | null
  }

  const items: Item[] = order.items ?? []

  // Same rule the Postgres function applies, run first for a readable warning.
  const deltas = movementsForStatusChange(
    order.status as OrderStatus,
    statusCheck.data,
    items.map((item) => ({ variantId: item.variant_id, qty: item.qty })),
  )

  const outgoing = deltas.filter((delta) => delta.reason === 'sale')
  if (outgoing.length > 0) {
    const stock = await currentStock(
      supabase,
      outgoing.map((delta) => delta.variantId),
    )

    for (const delta of outgoing) {
      const available = stock.get(delta.variantId) ?? 0
      const needed = Math.abs(delta.qty)
      if (available < needed) {
        const item = items.find((candidate) => candidate.variant_id === delta.variantId)
        const label = item
          ? `${item.product_name_snapshot} ${item.variant_label_snapshot ?? ''}`.trim()
          : ''
        return actionError(
          `Нөөц хүрэхгүй байна: ${label} (үлдэгдэл ${available}, шаардлагатай ${needed})`,
        )
      }
    }
  }

  const { error } = await supabase.rpc('fn_set_order_status', {
    p_order_id: orderId,
    p_status: statusCheck.data,
    p_user_id: user.id,
  })

  if (error) return actionError(friendlyDbError(error))

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/inventory')
  return { ok: true, data: { status: statusCheck.data } }
}
