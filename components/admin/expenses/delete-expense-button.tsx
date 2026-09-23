'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { deleteExpense } from '@/server/actions/expenses'

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Зардал устгах"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await deleteExpense(expenseId)
          if (!result.ok) {
            toast.error(result.error.message)
            return
          }
          toast.success('Устлаа')
          router.refresh()
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
