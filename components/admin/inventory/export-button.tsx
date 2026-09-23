'use client'

import { useTransition } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { exportInventoryCsv } from '@/server/actions/inventory'

/** The CSV is built on the server and only downloaded here. */
export function InventoryExportButton() {
  const [isPending, startTransition] = useTransition()

  function download() {
    startTransition(async () => {
      const result = await exportInventoryCsv()
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

  return (
    <Button type="button" variant="outline" onClick={download} disabled={isPending}>
      <Download className="size-4" />
      CSV татах
    </Button>
  )
}
