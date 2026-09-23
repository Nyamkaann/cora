import 'server-only'

import Decimal from 'decimal.js'

import { createClient } from '@/lib/supabase/server'

export type ExpenseRow = {
  id: string
  category: string
  amount: string
  expenseDate: string
  description: string | null
}

export type ExpenseMonth = {
  /** YYYY-MM */
  month: string
  total: string
  rows: ExpenseRow[]
}

export async function getExpensesByMonth(): Promise<ExpenseMonth[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('id, category, amount, expense_date, description')
    .order('expense_date', { ascending: false })

  if (error) throw new Error(error.message)

  type Raw = {
    id: string
    category: string
    amount: string
    expense_date: string
    description: string | null
  }

  const months = new Map<string, ExpenseRow[]>()

  for (const row of (data ?? []) as Raw[]) {
    const month = row.expense_date.slice(0, 7)
    const list = months.get(month) ?? []
    list.push({
      id: row.id,
      category: row.category,
      amount: row.amount,
      expenseDate: row.expense_date,
      description: row.description,
    })
    months.set(month, list)
  }

  return [...months.entries()].map(([month, rows]) => ({
    month,
    total: rows
      .reduce((total, row) => total.plus(new Decimal(row.amount)), new Decimal(0))
      .toFixed(2),
    rows,
  }))
}
