'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { deletePosterTemplate, setDefaultPosterTemplate } from '@/server/actions/posters'
import type { PosterTemplate } from '@/server/queries/posters'

export function TemplateList({
  templates,
  selectedId,
  onSelect,
}: {
  templates: PosterTemplate[]
  selectedId: string | null
  onSelect: (templateId: string | null) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function run(label: string, action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
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

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card
          key={template.id}
          className={selectedId === template.id ? 'border-primary' : undefined}
        >
          <CardContent className="space-y-3 p-3">
            {template.backgroundUrl ? (
              // Storage host is not registered with next/image in the MVP.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.backgroundUrl}
                alt=""
                className="h-28 w-full rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                Дэвсгэргүй
              </div>
            )}

            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-medium">{template.name}</p>
              {template.isDefault ? <Badge variant="secondary">Үндсэн</Badge> : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={() => onSelect(template.id)}>
                Засах
              </Button>
              {template.isDefault ? null : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      run('Үндсэн загвар боллоо', () => setDefaultPosterTemplate(template.id))
                    }
                  >
                    <Star className="size-3.5" />
                    Үндсэн
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Загвар устгах"
                    disabled={isPending}
                    onClick={() => run('Устлаа', () => deletePosterTemplate(template.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
