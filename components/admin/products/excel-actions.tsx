'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ActionResult } from '@/lib/action-result'
import {
  downloadProductTemplate,
  exportProductsXlsx,
  importProductsXlsx,
  type ImportSummary,
  type XlsxPayload,
} from '@/server/actions/products-excel'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function saveWorkbook(payload: XlsxPayload) {
  const bytes = Uint8Array.from(atob(payload.base64), (character) => character.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_MIME }))
  const link = document.createElement('a')
  link.href = url
  link.download = payload.filename
  link.click()
  URL.revokeObjectURL(url)
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Файл уншигдсангүй'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(file)
  })
}

export function ExcelActions() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  function download(label: string, action: () => Promise<ActionResult<XlsxPayload>>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      saveWorkbook(result.data)
      toast.success(label)
    })
  }

  function importFile(file: File) {
    startTransition(async () => {
      try {
        const base64 = await readAsBase64(file)
        const result = await importProductsXlsx({ base64 })

        if (!result.ok) {
          toast.error(result.error.message)
          return
        }

        setSummary(result.data)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Импорт амжилтгүй боллоо')
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => download('Загвар татагдлаа', downloadProductTemplate)}
      >
        <FileSpreadsheet className="size-4" />
        Загвар татах
      </Button>

      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => download('Excel татагдлаа', exportProductsXlsx)}
      >
        <Download className="size-4" />
        Excel татах
      </Button>

      <Button variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" />
        {isPending ? 'Ажиллаж байна…' : 'Excel оруулах'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) importFile(file)
          event.target.value = ''
        }}
      />

      <Dialog open={summary !== null} onOpenChange={(open) => (open ? undefined : setSummary(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Импортын үр дүн</DialogTitle>
            <DialogDescription>
              Эхний нөөц зөвхөн шинэ хувилбарт бүртгэгдсэн — давхар нэмэгдээгүй.
            </DialogDescription>
          </DialogHeader>

          {summary ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Үйлдэл</TableHead>
                    <TableHead className="text-right">Тоо</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Шинэ бараа</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.createdProducts}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Шинэчилсэн бараа</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.updatedProducts}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Шинэ хувилбар</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.createdVariants}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Шинэчилсэн хувилбар</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.updatedVariants}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Нөөцийн бичилт</TableCell>
                    <TableCell className="text-right tabular-nums">{summary.stockRows}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {summary.issues.length > 0 ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="mb-2 font-medium">
                      Алгассан мөр: {summary.issues.length}
                    </p>
                    <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                      {summary.issues.map((issue, index) => (
                        <li key={`${issue.row}-${index}`}>
                          {issue.row > 0 ? `${issue.row}-р мөр: ` : ''}
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-muted-foreground">Алдаатай мөр гараагүй.</p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" onClick={() => setSummary(null)}>
              Хаах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
