'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ImagePlus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  deleteImage,
  reorderImages,
  setImageTransparent,
  setPrimaryImage,
} from '@/server/actions/products'
import type { ProductImageRow } from '@/types/catalog'

export type PendingImage = {
  key: string
  file: File
  previewUrl: string
}

export function ImageManager({
  productId,
  images,
  pending,
  onPendingChange,
}: {
  productId: string | null
  images: ProductImageRow[]
  pending: PendingImage[]
  onPendingChange: (next: PendingImage[]) => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [, startTransition] = useTransition()

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const next = Array.from(fileList)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }))

    onPendingChange([...pending, ...next])
  }

  function runAction(label: string, action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error?.message ?? 'Алдаа гарлаа')
        return
      }
      toast.success(label)
      router.refresh()
    })
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (!productId || target < 0 || target >= images.length) return

    const ordered = [...images]
    const [moved] = ordered.splice(index, 1)
    if (!moved) return
    ordered.splice(target, 0, moved)

    runAction('Дараалал шинэчлэгдлээ', () =>
      reorderImages(
        productId,
        ordered.map((image) => image.id),
      ),
    )
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          addFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center',
          isDragging ? 'border-primary bg-primary/5' : 'bg-muted/30',
        )}
      >
        <ImagePlus className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Зургаа энд чирж оруулах эсвэл сонгоно уу. 2000px-ээс их бол автоматаар багасгана.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="size-3.5" />
          Зураг сонгох
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {pending.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Хадгалахад нэмэгдэх зургууд ({pending.length})</p>
          <div className="flex flex-wrap gap-3">
            {pending.map((image) => (
              <div key={image.key} className="relative">
                {/* Local object URL preview. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt={image.file.name}
                  className="size-24 rounded-md border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  className="absolute -top-2 -right-2"
                  aria-label="Хасах"
                  onClick={() => {
                    URL.revokeObjectURL(image.previewUrl)
                    onPendingChange(pending.filter((item) => item.key !== image.key))
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {productId && images.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Хадгалсан зургууд ({images.length})</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <div key={image.id} className="space-y-2 rounded-lg border p-2">
                {/* Supabase Storage host is not registered with next/image in the MVP. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="h-32 w-full rounded-md border object-contain"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Урагшлуулах"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowLeft className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Хойшлуулах"
                      disabled={index === images.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Зураг устгах"
                    onClick={() => runAction('Зураг устлаа', () => deleteImage(image.id))}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <Label className="flex items-center gap-2 text-xs font-normal">
                  <Checkbox
                    checked={image.is_primary}
                    onCheckedChange={(checked) => {
                      if (checked !== true) return
                      runAction('Үндсэн зураг солигдлоо', () =>
                        setPrimaryImage(productId, image.id),
                      )
                    }}
                  />
                  Үндсэн
                </Label>
                <Label className="flex items-center gap-2 text-xs font-normal">
                  <Checkbox
                    checked={image.is_transparent}
                    onCheckedChange={(checked) =>
                      runAction('Хадгаллаа', () => setImageTransparent(image.id, checked === true))
                    }
                  />
                  Ил тод дэвсгэртэй (poster-т)
                </Label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!productId ? (
        <p className="text-xs text-muted-foreground">
          Зургууд барааг хадгалсны дараа Storage руу ачаалагдана.
        </p>
      ) : null}
    </div>
  )
}
