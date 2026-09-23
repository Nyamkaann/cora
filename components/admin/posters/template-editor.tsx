'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Save, Upload } from 'lucide-react'
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
import { LayoutCanvas } from '@/components/admin/posters/layout-canvas'
import { prepareImage } from '@/lib/images'
import { DEFAULT_LAYOUT, type PosterLayout } from '@/lib/poster/layout'
import { createClient } from '@/lib/supabase/client'
import { createPosterTemplate, updatePosterTemplate } from '@/server/actions/posters'
import type { PosterProductOption, PosterTemplate } from '@/server/queries/posters'

const POSTERS_BUCKET = 'posters'

type BoxKey = 'product' | 'title' | 'price' | 'logo'

export function TemplateEditor({
  template,
  products,
}: {
  template: PosterTemplate | null
  products: PosterProductOption[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(template?.name ?? 'Шинэ загвар')
  const [layout, setLayout] = useState<PosterLayout>(template?.layout ?? DEFAULT_LAYOUT)
  const [backgroundPath, setBackgroundPath] = useState(template?.backgroundPath ?? null)
  const [backgroundUrl, setBackgroundUrl] = useState(template?.backgroundUrl ?? null)
  const [selected, setSelected] = useState<BoxKey>('product')
  const [previewProductId, setPreviewProductId] = useState(products[0]?.id ?? '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)

  async function uploadBackground(file: File) {
    const supabase = createClient()
    const prepared = await prepareImage(file)
    const path = `templates/${crypto.randomUUID()}.${prepared.extension}`

    const { error } = await supabase.storage
      .from(POSTERS_BUCKET)
      .upload(path, prepared.blob, { contentType: prepared.blob.type || undefined })

    if (error) {
      toast.error(`Дэвсгэр ачаалахад алдаа гарлаа: ${error.message}`)
      return
    }

    const { data } = supabase.storage.from(POSTERS_BUCKET).getPublicUrl(path)
    setBackgroundPath(path)
    setBackgroundUrl(data.publicUrl)
    toast.success('Дэвсгэр ачаалагдлаа')
  }

  function save() {
    startTransition(async () => {
      const payload = {
        name,
        background_path: backgroundPath,
        layout,
        is_active: true,
      }

      const result = template
        ? await updatePosterTemplate(template.id, payload)
        : await createPosterTemplate(payload)

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }

      toast.success('Хадгаллаа')
      router.refresh()
    })
  }

  async function renderPreview() {
    if (!previewProductId) {
      toast.error('Урьдчилан харах бараагаа сонгоно уу')
      return
    }

    setIsRendering(true)
    try {
      const response = await fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: previewProductId,
          templateId: template?.id ?? null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Алдаа гарлаа' }))
        toast.error(payload.error ?? 'Постер үүсгэж чадсангүй')
        return
      }

      const blob = await response.blob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
    } finally {
      setIsRendering(false)
    }
  }

  function patchLayout(patch: Partial<PosterLayout>) {
    setLayout((previous) => ({ ...previous, ...patch }))
  }

  function moveBox(key: BoxKey, x: number, y: number) {
    if (key === 'product') patchLayout({ product: { ...layout.product, x, y } })
    else if (key === 'title') patchLayout({ title: { ...layout.title, x, y } })
    else if (key === 'price') patchLayout({ price: { ...layout.price, x, y } })
    else patchLayout({ logo: { ...layout.logo, x, y } })
  }

  const textBox = selected === 'price' ? layout.price : layout.title

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {template ? 'Загвар засах' : 'Шинэ загвар'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Нэр</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" />
                Дэвсгэр зураг
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadBackground(file)
                  event.target.value = ''
                }}
              />
              <Button type="button" onClick={save} disabled={isPending}>
                <Save className="size-4" />
                {isPending ? 'Хадгалж байна…' : 'Хадгалах'}
              </Button>
            </div>

            <LayoutCanvas
              layout={layout}
              backgroundUrl={backgroundUrl}
              selected={selected}
              onSelect={setSelected}
              onMove={moveBox}
              onResizeProduct={(w, h) => patchLayout({ product: { ...layout.product, w, h } })}
            />
            <p className="text-xs text-muted-foreground">
              Хайрцгуудыг чирж байрлуулна. Барааны хайрцгийн булангаас хэмжээг өөрчилнө.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Сонгосон хайрцаг</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {(['product', 'title', 'price', 'logo'] as BoxKey[]).map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={selected === key ? 'default' : 'outline'}
                  onClick={() => setSelected(key)}
                >
                  {key === 'product'
                    ? 'Бараа'
                    : key === 'title'
                      ? 'Нэр'
                      : key === 'price'
                        ? 'Үнэ'
                        : 'Лого'}
                </Button>
              ))}
            </div>

            {selected === 'product' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['x', 'y', 'w', 'h'] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`product-${field}`} className="text-xs uppercase">
                      {field}
                    </Label>
                    <Input
                      id={`product-${field}`}
                      inputMode="numeric"
                      value={layout.product[field]}
                      onChange={(event) =>
                        patchLayout({
                          product: {
                            ...layout.product,
                            [field]: Number(event.target.value.replace(/[^\d-]/g, '') || 0),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {selected === 'logo' ? (
              <div className="grid grid-cols-3 gap-3">
                {(['x', 'y', 'w'] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`logo-${field}`} className="text-xs uppercase">
                      {field}
                    </Label>
                    <Input
                      id={`logo-${field}`}
                      inputMode="numeric"
                      value={layout.logo[field]}
                      onChange={(event) =>
                        patchLayout({
                          logo: {
                            ...layout.logo,
                            [field]: Number(event.target.value.replace(/[^\d-]/g, '') || 0),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {selected === 'title' || selected === 'price' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(['x', 'y', 'w', 'size'] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`text-${field}`} className="text-xs uppercase">
                      {field === 'size' ? 'Фонт' : field}
                    </Label>
                    <Input
                      id={`text-${field}`}
                      inputMode="numeric"
                      value={textBox[field]}
                      onChange={(event) => {
                        const value = Number(event.target.value.replace(/[^\d-]/g, '') || 0)
                        if (selected === 'title') patchLayout({ title: { ...layout.title, [field]: value } })
                        else patchLayout({ price: { ...layout.price, [field]: value } })
                      }}
                    />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <Label htmlFor="text-color" className="text-xs">
                    Өнгө
                  </Label>
                  <Input
                    id="text-color"
                    type="color"
                    className="h-8 p-1"
                    value={textBox.color}
                    onChange={(event) => {
                      const value = event.target.value
                      if (selected === 'title') patchLayout({ title: { ...layout.title, color: value } })
                      else patchLayout({ price: { ...layout.price, color: value } })
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="text-align" className="text-xs">
                    Байрлал
                  </Label>
                  <Select
                    value={textBox.align}
                    items={{ left: 'Зүүн', center: 'Төв', right: 'Баруун' }}
                    onValueChange={(value) => {
                      const align = value === 'left' || value === 'right' ? value : 'center'
                      if (selected === 'title') patchLayout({ title: { ...layout.title, align } })
                      else patchLayout({ price: { ...layout.price, align } })
                    }}
                  >
                    <SelectTrigger id="text-align" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Зүүн</SelectItem>
                      <SelectItem value="center">Төв</SelectItem>
                      <SelectItem value="right">Баруун</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="canvas-width" className="text-xs">
                  Өргөн
                </Label>
                <Input
                  id="canvas-width"
                  inputMode="numeric"
                  value={layout.canvas.width}
                  onChange={(event) =>
                    patchLayout({
                      canvas: {
                        ...layout.canvas,
                        width: Number(event.target.value.replace(/[^\d]/g, '') || 0),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canvas-height" className="text-xs">
                  Өндөр
                </Label>
                <Input
                  id="canvas-height"
                  inputMode="numeric"
                  value={layout.canvas.height}
                  onChange={(event) =>
                    patchLayout({
                      canvas: {
                        ...layout.canvas,
                        height: Number(event.target.value.replace(/[^\d]/g, '') || 0),
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-20 lg:self-start">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Урьдчилан харах</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="preview-product" className="text-xs">
                Бараа
              </Label>
              <Select
                value={previewProductId}
                onValueChange={(value) => setPreviewProductId(String(value))}
                items={Object.fromEntries(products.map((p) => [p.id, p.name]))}
              >
                <SelectTrigger id="preview-product" className="w-full">
                  <SelectValue placeholder="Бараа сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                      {product.hasTransparentImage ? '' : ' (ил тод зураггүй)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={renderPreview} disabled={isRendering}>
              <Eye className="size-4" />
              {isRendering ? 'Үүсгэж байна…' : 'Харах'}
            </Button>
          </div>

          {template ? null : (
            <p className="text-xs text-muted-foreground">
              Урьдчилан харахад одоогийн үндсэн загвар ашиглагдана. Энэ загварыг эхлээд хадгална уу.
            </p>
          )}

          {previewUrl ? (
            // Blob preview of a freshly rendered poster.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Постер" className="w-full rounded-lg border" />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Постер үүсгээд энд харна.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
