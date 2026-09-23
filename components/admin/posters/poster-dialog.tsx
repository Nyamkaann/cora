'use client'

import { useEffect, useState } from 'react'
import { Download, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type PosterTarget = {
  productId: string
  productName: string
  variantId?: string | null
}

/** Renders one poster on demand, shows it, and hands over the PNG. */
export function PosterDialog({
  target,
  onClose,
}: {
  target: PosterTarget | null
  onClose: () => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!target) return

    let active = true
    let createdUrl: string | null = null
    setIsPending(true)
    setPreviewUrl(null)

    void (async () => {
      try {
        const response = await fetch('/api/poster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: target.productId,
            variantId: target.variantId ?? null,
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: 'Алдаа гарлаа' }))
          if (active) toast.error(payload.error ?? 'Постер үүсгэж чадсангүй')
          return
        }

        const blob = await response.blob()
        if (!active) return
        createdUrl = URL.createObjectURL(blob)
        setPreviewUrl(createdUrl)
      } finally {
        if (active) setIsPending(false)
      }
    })()

    return () => {
      active = false
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [target])

  function download() {
    if (!previewUrl || !target) return
    const link = document.createElement('a')
    link.href = previewUrl
    link.download = `${target.productName}.png`
    link.click()
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Постер</DialogTitle>
          <DialogDescription>{target?.productName ?? ''}</DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Үүсгэж байна…
          </div>
        ) : previewUrl ? (
          // Blob preview of a freshly rendered poster.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Постер" className="w-full rounded-lg border" />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Постер үүсгэж чадсангүй.
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Хаах
          </Button>
          <Button type="button" onClick={download} disabled={!previewUrl}>
            <Download className="size-4" />
            Татах
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Standalone button for a single product page. */
export function PosterButton({ target }: { target: PosterTarget }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ImageIcon className="size-4" />
        Постер үүсгэх
      </Button>
      <PosterDialog target={open ? target : null} onClose={() => setOpen(false)} />
    </>
  )
}
