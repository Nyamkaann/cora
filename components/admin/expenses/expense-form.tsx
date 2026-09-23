'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoneyInput } from '@/components/admin/money-input'
import { createExpense } from '@/server/actions/expenses'

const PRESET_CATEGORIES = ['Зар сурталчилгаа', 'Түрээс', 'Цалин', 'Тээвэр', 'Бусад']
const CUSTOM = '__custom__'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ExpenseForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState(PRESET_CATEGORIES[0] as string)
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(today())
  const [description, setDescription] = useState('')

  function submit() {
    const finalCategory = category === CUSTOM ? customCategory.trim() : category
    if (!finalCategory) {
      toast.error('Ангилалаа бичнэ үү')
      return
    }

    startTransition(async () => {
      const result = await createExpense({
        category: finalCategory,
        amount: amount || '0',
        expense_date: expenseDate,
        description: description || null,
      })

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }

      toast.success('Зардал бүртгэгдлээ')
      setAmount('')
      setDescription('')
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Зардал нэмэх</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="category">Ангилал</Label>
          <Select value={category} onValueChange={(value) => setCategory(String(value))}>
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM}>Өөрөө бичих…</SelectItem>
            </SelectContent>
          </Select>
          {category === CUSTOM ? (
            <Input
              value={customCategory}
              placeholder="Ангиллын нэр"
              onChange={(event) => setCustomCategory(event.target.value)}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Дүн</Label>
          <MoneyInput id="amount" value={amount} onChange={setAmount} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-date">Огноо</Label>
          <Input
            id="expense-date"
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Тайлбар</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="button" onClick={submit} disabled={isPending}>
            <Plus className="size-4" />
            {isPending ? 'Хадгалж байна…' : 'Нэмэх'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
