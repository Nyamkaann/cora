import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ProfitReportRow } from '@/lib/analytics/profit'

export type SeriesPoint = {
  bucket: string
  revenue: string
  cogs: string
  gross_profit: string
  order_count: number
  unit_count: number
}

export type ChannelRow = {
  channel: string
  revenue: string
  cogs: string
  gross_profit: string
  order_count: number
}

export type TopProductRow = {
  product_id: string
  product_name: string
  units_sold: number
  revenue: string
  cogs: string
  gross_profit: string
  margin_pct: number
}

export type VariantReportRow = {
  variant_id: string
  product_name: string
  variant_label: string
  sku: string | null
  units_sold: number
  revenue: string
  cogs: string
  gross_profit: string
  margin_pct: number
}

export type ExpenseCategoryRow = {
  category: string
  total: string
  entry_count: number
}

export type MonthlyProfitRow = ProfitReportRow & {
  month: string
  gross_profit: string
  net_profit: string
}

export type LowStockRow = {
  variant_id: string
  product_name: string
  variant_label: string
  sku: string | null
  current_stock: number
}

type Range = { from: string; to: string }

/** Period totals straight from fn_profit_report. */
export async function getProfitReport(range: Range): Promise<ProfitReportRow> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_profit_report', {
    p_from: range.from,
    p_to: range.to,
  })

  if (error) throw new Error(error.message)

  const rows: ProfitReportRow[] = data ?? []
  return (
    rows[0] ?? { revenue: 0, cogs: 0, expenses: 0, order_count: 0, unit_count: 0 }
  )
}

export async function getSalesSeries(
  range: Range,
  bucket: 'day' | 'week' | 'month',
): Promise<SeriesPoint[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_sales_series', {
    p_from: range.from,
    p_to: range.to,
    p_bucket: bucket,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getSalesByChannel(range: Range): Promise<ChannelRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_sales_by_channel', {
    p_from: range.from,
    p_to: range.to,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTopProducts(range: Range, limit = 10): Promise<TopProductRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_top_products', {
    p_from: range.from,
    p_to: range.to,
    p_limit: limit,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getVariantReport(range: Range): Promise<VariantReportRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_variant_report', {
    p_from: range.from,
    p_to: range.to,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getExpensesByCategory(range: Range): Promise<ExpenseCategoryRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_expenses_by_category', {
    p_from: range.from,
    p_to: range.to,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getProfitByMonth(range: Range): Promise<MonthlyProfitRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_profit_by_month', {
    p_from: range.from,
    p_to: range.to,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getLowStock(threshold = 5): Promise<LowStockRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_low_stock', { p_threshold: threshold })

  if (error) throw new Error(error.message)
  return data ?? []
}

export type ExpenseCategoryMonthRow = {
  month: string
  category: string
  total: string
}

export async function getExpensesByCategoryMonth(
  range: Range,
): Promise<ExpenseCategoryMonthRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fn_expenses_by_category_month', {
    p_from: range.from,
    p_to: range.to,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}
