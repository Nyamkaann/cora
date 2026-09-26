'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, RotateCw, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/admin/empty-state'
import { utcToUlaanbaatarFields } from '@/lib/social/schedule'
import { cancelPost, retryPost } from '@/server/actions/posts'
import type { PostListRow, PostStatus } from '@/server/queries/posts'

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Ноорог',
  queued: 'Товлосон',
  publishing: 'Илгээж байна',
  published: 'Нийтлэгдсэн',
  partial: 'Хэсэгчилсэн',
  failed: 'Амжилтгүй',
  cancelled: 'Цуцалсан',
}

const STATUS_TONE: Record<PostStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  queued: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  publishing: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  partial: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  failed: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
}

const PLATFORM_LABELS = { facebook: 'Facebook', instagram: 'Instagram' } as const

function whenLabel(row: PostListRow): string {
  const source = row.scheduledAt ?? row.createdAt
  const { date, time } = utcToUlaanbaatarFields(source)
  return `${date} ${time}`
}

/** Groups the rows by the day they are meant to go out. */
function byDay(rows: PostListRow[]): [string, PostListRow[]][] {
  const groups = new Map<string, PostListRow[]>()

  for (const row of rows) {
    const { date } = utcToUlaanbaatarFields(row.scheduledAt ?? row.createdAt)
    const bucket = groups.get(date)
    if (bucket) bucket.push(row)
    else groups.set(date, [row])
  }

  return [...groups.entries()]
}

export function PostsList({ posts }: { posts: PostListRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function run(id: string, label: string, action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setBusyId(id)
    startTransition(async () => {
      const result = await action()
      setBusyId(null)

      if (!result.ok) {
        toast.error(result.error?.message ?? 'Алдаа гарлаа')
        return
      }

      toast.success(label)
      router.refresh()
    })
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Нийтлэл алга"
        description="Барааны хуудаснаас «Постлох» товчоор эхний нийтлэлээ үүсгэнэ үү."
      />
    )
  }

  return (
    <div className="space-y-6">
      {byDay(posts).map(([day, rows]) => (
        <div key={day} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{day}</h2>

          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-start gap-3">
                  {row.posterUrl ? (
                    // Poster already rendered for this post.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.posterUrl}
                      alt=""
                      className="h-20 w-16 shrink-0 rounded border object-cover"
                    />
                  ) : (
                    <div className="h-20 w-16 shrink-0 rounded border border-dashed" />
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/products/${row.productId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {row.productName}
                      </Link>
                      {row.variantLabel ? (
                        <span className="text-sm text-muted-foreground">· {row.variantLabel}</span>
                      ) : null}
                      <Badge className={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {whenLabel(row)} ·{' '}
                      {row.platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ')}
                      {row.attempts > 1 ? ` · ${row.attempts} оролдлого` : ''}
                    </p>

                    {row.caption ? (
                      <p className="line-clamp-2 text-sm">{row.caption}</p>
                    ) : null}

                    {row.results.length > 0 ? (
                      <div className="flex flex-wrap gap-3 pt-1 text-sm">
                        {row.results.map((result) => (
                          <span key={result.platform} className="inline-flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {PLATFORM_LABELS[result.platform]}:
                            </span>
                            {result.permalink ? (
                              <a
                                href={result.permalink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                              >
                                харах
                                <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <span
                                className={
                                  result.status === 'failed' ? 'text-destructive' : undefined
                                }
                              >
                                {result.status === 'published' ? 'нийтлэгдсэн' : result.status === 'failed' ? 'алдаа' : 'хүлээгдэж байна'}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {row.lastError ? (
                      <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">
                        {row.lastError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {row.status === 'queued' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending && busyId === row.id}
                        onClick={() => run(row.id, 'Цуцаллаа', () => cancelPost(row.id))}
                      >
                        <X className="size-3.5" />
                        Цуцлах
                      </Button>
                    ) : null}

                    {row.status === 'failed' || row.status === 'partial' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending && busyId === row.id}
                        onClick={() => run(row.id, 'Дахин илгээлээ', () => retryPost(row.id))}
                      >
                        <RotateCw className="size-3.5" />
                        Дахин
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
