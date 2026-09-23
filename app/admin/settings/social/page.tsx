import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/admin/page-header'
import { ConnectPanel } from '@/components/admin/social/connect-panel'
import { listApiLog, listConnectedAccounts } from '@/server/social/accounts'

export const metadata = { title: 'Сошиал холболт — Cora' }

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('mn-MN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SocialSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const params = await searchParams
  const [accounts, log] = await Promise.all([listConnectedAccounts(), listApiLog(50)])

  return (
    <>
      <PageHeader
        title="Сошиал холболт"
        description="Facebook Page болон Instagram Business бүртгэлээ холбоно."
      />

      <ConnectPanel
        accounts={accounts}
        justConnected={params.connected === '1'}
        oauthError={params.error ?? null}
        appConfigured={Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET)}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Сүүлийн 50 API дуудлага</CardTitle>
          <p className="text-xs text-muted-foreground">
            Token нь хэсэглэн нуугдсан байна — бүтэн утга хэзээ ч бүртгэгддэггүй.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Огноо</TableHead>
                <TableHead>Платформ</TableHead>
                <TableHead>Дуудлага</TableHead>
                <TableHead className="text-right">Статус</TableHead>
                <TableHead className="text-right">Хугацаа</TableHead>
                <TableHead>Алдаа</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    Дуудлага бүртгэгдээгүй.
                  </TableCell>
                </TableRow>
              ) : (
                log.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>{row.platform}</TableCell>
                    <TableCell className="max-w-64 truncate font-mono text-xs">
                      {row.method} {row.endpoint}
                    </TableCell>
                    <TableCell
                      className={
                        row.statusCode && row.statusCode >= 400
                          ? 'text-right font-medium text-destructive tabular-nums'
                          : 'text-right tabular-nums'
                      }
                    >
                      {row.statusCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.durationMs === null ? '—' : `${row.durationMs}ms`}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-destructive">
                      {row.error ?? ''}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
