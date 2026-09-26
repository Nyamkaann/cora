'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { CalendarClock, CheckCircle2, ExternalLink, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { utcToUlaanbaatarFields } from '@/lib/social/schedule'
import { publishProductPost, type PublishResult } from '@/server/actions/posts'

export type PostVariantOption = { id: string; label: string }
export type PostTemplateOption = { id: string; name: string }

export type PostTarget = {
  productId: string
  productName: string
  variants: PostVariantOption[]
  templates: PostTemplateOption[]
  facebookName: string | null
  instagramName: string | null
}

const ALL_VARIANTS = '__all__'

const PLATFORM_LABELS = { facebook: 'Facebook', instagram: 'Instagram' } as const

function splitHashtags(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

/** Composes one product post and sends it, now or on a schedule. */
export function PostDialog({ target, onClose }: { target: PostTarget | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()

  const [variantId, setVariantId] = useState(ALL_VARIANTS)
  const [templateId, setTemplateId] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [toFacebook, setToFacebook] = useState(false)
  const [toInstagram, setToInstagram] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [summary, setSummary] = useState<PublishResult | null>(null)

  const open = target !== null
  const hasConnection = Boolean(target?.facebookName || target?.instagramName)

  // Fresh form every time the dialog opens — on the open itself, not on every
  // new target object. Publishing revalidates the page, which hands down a new
  // target and would otherwise wipe the result the admin is reading.
  const wasOpen = useRef(false)

  useEffect(() => {
    const isOpen = target !== null

    if (isOpen && !wasOpen.current) {
      setVariantId(ALL_VARIANTS)
      setTemplateId(target.templates[0]?.id ?? '')
      setCaption('')
      setHashtags('')
      setToFacebook(Boolean(target.facebookName))
      setToInstagram(Boolean(target.instagramName))
      setScheduled(false)
      setDate('')
      setTime('')
      setSummary(null)
    }

    wasOpen.current = isOpen
  }, [target])

  // Re-render the poster whenever what it shows changes. Keyed on the product
  // id rather than the target object, so a revalidation does not refetch it.
  const productId = target?.productId ?? null

  useEffect(() => {
    if (!productId || !templateId) return

    let active = true
    let createdUrl: string | null = null
    setPreviewing(true)
    setPreviewUrl(null)

    void (async () => {
      try {
        const response = await fetch('/api/poster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            variantId: variantId === ALL_VARIANTS ? null : variantId,
            templateId,
          }),
        })

        if (!response.ok) return

        const blob = await response.blob()
        if (!active) return
        createdUrl = URL.createObjectURL(blob)
        setPreviewUrl(createdUrl)
      } finally {
        if (active) setPreviewing(false)
      }
    })()

    return () => {
      active = false
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [productId, variantId, templateId])

  const platforms = [
    ...(toFacebook ? (['facebook'] as const) : []),
    ...(toInstagram ? (['instagram'] as const) : []),
  ]

  const canSubmit =
    platforms.length > 0 && templateId !== '' && (!scheduled || (date !== '' && time !== ''))

  function submit() {
    if (!target || !canSubmit) return

    startTransition(async () => {
      const result = await publishProductPost({
        productId: target.productId,
        variantId: variantId === ALL_VARIANTS ? null : variantId,
        templateId,
        caption,
        hashtags: splitHashtags(hashtags),
        platforms,
        scheduledDate: scheduled ? date : null,
        scheduledTime: scheduled ? time : null,
      })

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }

      setSummary(result.data)

      if (result.data.kind === 'queued') toast.success('Товлолоо')
      else if (result.data.summary.status === 'failed') toast.error('Нийтлэх амжилтгүй боллоо')
      else if (result.data.summary.status === 'partial') toast.warning('Зарим суваг амжилтгүй боллоо')
      else toast.success('Нийтэллээ')
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      {/* sm:max-w-sm is the Dialog default, so the wider cap needs the same variant. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Facebook/Instagram-д нийтлэх</DialogTitle>
          <DialogDescription>{target?.productName ?? ''}</DialogDescription>
        </DialogHeader>

        {summary ? (
          summary.kind === 'queued' ? (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Товлогдлоо</p>
                <p className="text-muted-foreground">
                  {(() => {
                    const when = utcToUlaanbaatarFields(summary.queued.scheduledAt)
                    return `${when.date} ${when.time}`
                  })()}{' '}
                  — Cora цагт нь өөрөө илгээнэ.
                </p>
              </div>
            </div>
          ) : (
          <div className="space-y-2">
            {summary.summary.results.map((result) => (
              <div
                key={result.platform}
                className="flex items-start gap-2 rounded-lg border p-3 text-sm"
              >
                {result.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <div className="space-y-1">
                  <p className="font-medium">
                    {PLATFORM_LABELS[result.platform]}
                    {result.ok ? ' — нийтлэгдлээ' : ' — алдаа'}
                  </p>
                  {result.error ? (
                    <p className="text-muted-foreground">{result.error}</p>
                  ) : result.permalink ? (
                    <a
                      href={result.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                    >
                      Постыг харах
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              {previewing ? (
                <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  Үүсгэж байна…
                </div>
              ) : previewUrl ? (
                // Blob preview of the poster that will be posted.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Постер" className="w-full rounded-lg border" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed p-2 text-center text-xs text-muted-foreground">
                  Постер үүсгэж чадсангүй
                </div>
              )}
            </div>

            <div className="space-y-4">
              {target && target.variants.length > 0 ? (
                <div className="space-y-1.5">
                  <Label htmlFor="post-variant">Хувилбар</Label>
                  <Select
                    value={variantId}
                    onValueChange={(value) => setVariantId(String(value))}
                    items={{
                      [ALL_VARIANTS]: 'Бүх хувилбар (хамгийн хямд үнэ)',
                      ...Object.fromEntries(
                        target.variants.map((variant) => [variant.id, variant.label]),
                      ),
                    }}
                  >
                    <SelectTrigger id="post-variant" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VARIANTS}>Бүх хувилбар (хамгийн хямд үнэ)</SelectItem>
                      {target.variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {target && target.templates.length > 0 ? (
                <div className="space-y-1.5">
                  <Label htmlFor="post-template">Постер загвар</Label>
                  <Select
                    value={templateId}
                    onValueChange={(value) => setTemplateId(String(value))}
                    items={Object.fromEntries(
                      target.templates.map((template) => [template.id, template.name]),
                    )}
                  >
                    <SelectTrigger id="post-template" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {target.templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Постер загвар байхгүй байна. Постер хэсгээс эхлээд загвар үүсгэнэ үү.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="post-caption">Тайлбар</Label>
                <Textarea
                  id="post-caption"
                  rows={4}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Захиалга авч байна…"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-hashtags">Hashtag</Label>
                <Input
                  id="post-hashtags"
                  value={hashtags}
                  onChange={(event) => setHashtags(event.target.value)}
                  placeholder="кашемир ороолт бэлэг"
                />
                <p className="text-xs text-muted-foreground">
                  Зайгаар тусгаарлана. # тэмдгийг өөрөө нэмнэ.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Платформ</Label>
                {hasConnection ? (
                  <div className="flex flex-col gap-2">
                    <Label className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={toFacebook}
                        disabled={!target?.facebookName}
                        onCheckedChange={(checked) => setToFacebook(checked === true)}
                      />
                      Facebook
                      {target?.facebookName ? (
                        <span className="text-xs text-muted-foreground">
                          · {target.facebookName}
                        </span>
                      ) : null}
                    </Label>
                    <Label className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={toInstagram}
                        disabled={!target?.instagramName}
                        onCheckedChange={(checked) => setToInstagram(checked === true)}
                      />
                      Instagram
                      {target?.instagramName ? (
                        <span className="text-xs text-muted-foreground">
                          · {target.instagramName}
                        </span>
                      ) : null}
                    </Label>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Сошиал холболт хийгдээгүй байна. Тохиргоо → Сошиал холболт хэсгээс Facebook
                      хуудсаа холбоно уу.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label>Хэзээ</Label>
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={!scheduled}
                      onCheckedChange={(checked) => setScheduled(checked !== true)}
                    />
                    Одоо нийтлэх
                  </Label>
                  <Label className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={scheduled}
                      onCheckedChange={(checked) => setScheduled(checked === true)}
                    />
                    Товлох
                  </Label>
                </div>

                {scheduled ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        aria-label="Огноо"
                      />
                      <Input
                        type="time"
                        value={time}
                        onChange={(event) => setTime(event.target.value)}
                        aria-label="Цаг"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Улаанбаатарын цагаар. Хамгийн багадаа 10 минутын дараа. Товлосон постыг
                      Cora өөрөө цагт нь илгээнэ.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {summary ? 'Хаах' : 'Болих'}
          </Button>
          {summary ? null : (
            <Button type="button" onClick={submit} disabled={!canSubmit || isPending}>
              <Send className="size-4" />
              {isPending ? 'Илгээж байна…' : scheduled ? 'Товлох' : 'Нийтлэх'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Standalone button for the product page header. */
export function PostButton({ target }: { target: PostTarget }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Send className="size-4" />
        Постлох
      </Button>
      <PostDialog target={open ? target : null} onClose={() => setOpen(false)} />
    </>
  )
}
