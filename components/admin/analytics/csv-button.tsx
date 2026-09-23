'use client'

import { useTransition } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/lib/action-result'
import type { CsvPayload } from '@/server/actions/reports'

/** Downloads a CSV the server built. */
export function CsvButton({
  label = 'CSV татах',
  action,
}: {
  label?: string
  action: () => Promise<ActionResult<CsvPayload>>
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await action()
          if (!result.ok) {
            toast.error(result.error.message)
            return
          }

          const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = result.data.filename
          link.click()
          URL.revokeObjectURL(url)
        })
      }
    >
      <Download className="size-3.5" />
      {label}
    </Button>
  )
}
