'use client'

import { useState } from 'react'
import { FileArchive } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { PosterProductOption } from '@/server/queries/posters'

/** Renders posters for several products at once and downloads them as a ZIP. */
export function BulkPosters({
  products,
  templateId,
}: {
  products: PosterProductOption[]
  templateId: string | null
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)

  function toggle(productId: string) {
    setSelected((previous) =>
      previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId],
    )
  }

  async function download() {
    if (selected.length === 0) {
      toast.error('Бараагаа сонгоно уу')
      return
    }

    setIsPending(true)
    try {
      const response = await fetch('/api/poster/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selected, templateId }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Алдаа гарлаа' }))
        toast.error(payload.error ?? 'Постер үүсгэж чадсангүй')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'cora-posters.zip'
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Олноор үүсгэх</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={download} disabled={isPending}>
          <FileArchive className="size-3.5" />
          {isPending ? 'Үүсгэж байна…' : `ZIP татах (${selected.length})`}
        </Button>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Идэвхтэй бараа алга.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Label
                key={product.id}
                className="flex items-center gap-2 rounded-md border p-2 text-sm font-normal"
              >
                <Checkbox
                  checked={selected.includes(product.id)}
                  onCheckedChange={() => toggle(product.id)}
                />
                <span className="min-w-0 truncate">{product.name}</span>
                {product.hasTransparentImage ? null : (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    ил тод зураггүй
                  </span>
                )}
              </Label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
