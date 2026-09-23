'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Link2, Plug, RefreshCw, Unplug } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  connectMetaPage,
  disconnectMetaAccounts,
  listMetaPages,
  startMetaOAuth,
  testMetaConnection,
  type PageChoice,
} from '@/server/actions/social'
import type { ConnectedAccount } from '@/server/social/accounts'

export function ConnectPanel({
  accounts,
  justConnected,
  oauthError,
  appConfigured,
}: {
  accounts: ConnectedAccount[]
  justConnected: boolean
  oauthError: string | null
  appConfigured: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pages, setPages] = useState<PageChoice[]>([])
  const [checking, setChecking] = useState(false)

  const facebook = accounts.find((account) => account.platform === 'facebook' && account.isActive)
  const instagram = accounts.find((account) => account.platform === 'instagram' && account.isActive)

  // Coming back from Meta: offer the pages this user administers.
  useEffect(() => {
    if (!justConnected) return

    let active = true
    void (async () => {
      const result = await listMetaPages()
      if (!active) return
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      setPages(result.data.pages)
    })()

    return () => {
      active = false
    }
  }, [justConnected])

  function connect() {
    startTransition(async () => {
      const result = await startMetaOAuth()
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      window.location.href = result.data.url
    })
  }

  function choosePage(pageId: string) {
    startTransition(async () => {
      const result = await connectMetaPage(pageId)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success(
        result.data.instagram
          ? 'Facebook Page болон Instagram холбогдлоо'
          : 'Facebook Page холбогдлоо. Instagram Business бүртгэл олдсонгүй.',
      )
      setPages([])
      router.replace('/admin/settings/social')
      router.refresh()
    })
  }

  async function check() {
    setChecking(true)
    try {
      const result = await testMetaConnection()
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success(
        `${result.data.name}${result.data.fanCount === null ? '' : ` · ${result.data.fanCount} дагагч`}${
          result.data.instagram ? ` · IG @${result.data.instagram}` : ''
        }`,
      )
    } finally {
      setChecking(false)
    }
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectMetaAccounts()
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success('Салгалаа')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {oauthError ? (
        <Alert variant="destructive">
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      ) : null}

      {!appConfigured ? (
        <Alert>
          <AlertDescription>
            <span className="font-medium">Meta app тохируулаагүй байна.</span> `META_APP_ID` болон
            `META_APP_SECRET`-ийг тохируулсны дараа холболт хийх боломжтой болно.
          </AlertDescription>
        </Alert>
      ) : null}

      {pages.length > 0 ? (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Аль Page-ийг холбох вэ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{page.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{page.id}</p>
                </div>
                <Button size="sm" disabled={isPending} onClick={() => choosePage(page.id)}>
                  Холбох
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Холбогдсон бүртгэл</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {facebook ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="font-medium">{facebook.name ?? 'Facebook Page'}</span>
                <Badge variant="secondary">Facebook</Badge>
                <span className="text-xs text-muted-foreground">{facebook.externalId}</span>
              </div>

              {instagram ? (
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="font-medium">@{instagram.name ?? 'instagram'}</span>
                  <Badge variant="secondary">Instagram</Badge>
                  <span className="text-xs text-muted-foreground">{instagram.externalId}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Instagram Business бүртгэл олдсонгүй. Instagram-аа Business/Creator болгож
                  Page-тэйгээ холбоно уу.
                </p>
              )}

              {facebook.expiresSoon ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    Token удахгүй дуусна. Дахин холбож шинэчилнэ үү.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={checking} onClick={check}>
                  <RefreshCw className="size-3.5" />
                  Холболт шалгах
                </Button>
                <Button variant="outline" size="sm" disabled={isPending} onClick={connect}>
                  <Link2 className="size-3.5" />
                  Дахин холбох
                </Button>
                <Button variant="ghost" size="sm" disabled={isPending} onClick={disconnect}>
                  <Unplug className="size-3.5" />
                  Салгах
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Facebook Page болон Instagram руу нийтлэхийн тулд эхлээд холбоно уу.
              </p>
              <Button disabled={isPending || !appConfigured} onClick={connect}>
                <Plug className="size-4" />
                Facebook холбох
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
