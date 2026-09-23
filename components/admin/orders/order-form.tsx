'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { MoneyInput } from '@/components/admin/money-input'
import { VariantCombobox } from '@/components/admin/orders/variant-combobox'
import { formatMNT } from '@/lib/money'
import { ORDER_CHANNELS, ORDER_CHANNEL_LABELS, type OrderChannel } from '@/lib/orders'
import { createOrder, previewOrderTotals, type OrderTotalsPreview } from '@/server/actions/orders'
import type { VariantOption } from '@/types/orders'

type LineDraft = {
  key: string
  variantId: string
  productName: string
  variantLabel: string
  sku: string | null
  currentStock: number
  qty: string
  unitPrice: string
}

const EMPTY_TOTALS: OrderTotalsPreview = {
  subtotal: '0',
  revenue: '0',
  cost: '0',
  grossProfit: '0',
  marginPct: 0,
  total: '0',
  unitCount: 0,
}

export function OrderForm({ options }: { options: VariantOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [channel, setChannel] = useState<OrderChannel>('facebook')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [note, setNote] = useState('')
  const [discount, setDiscount] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [confirmNow, setConfirmNow] = useState(false)
  const [lines, setLines] = useState<LineDraft[]>([])
  const [totals, setTotals] = useState<OrderTotalsPreview>(EMPTY_TOTALS)

  const payload = useMemo(
    () => ({
      items: lines
        .filter((line) => Number(line.qty) > 0)
        .map((line) => ({
          variant_id: line.variantId,
          qty: Number(line.qty),
          unit_price: line.unitPrice || '0',
        })),
      discount_amount: discount || '0',
      delivery_fee: deliveryFee || '0',
    }),
    [lines, discount, deliveryFee],
  )

  // Totals are always recomputed on the server: costs never reach the browser.
  useEffect(() => {
    if (payload.items.length === 0) {
      setTotals(EMPTY_TOTALS)
      return
    }

    let active = true
    const timer = setTimeout(async () => {
      const result = await previewOrderTotals(payload)
      if (!active) return
      if (result.ok) setTotals(result.data)
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [payload])

  function addLine(option: VariantOption) {
    setLines((previous) => {
      const existing = previous.find((line) => line.variantId === option.variantId)
      if (existing) {
        return previous.map((line) =>
          line.variantId === option.variantId
            ? { ...line, qty: String(Number(line.qty || '0') + 1) }
            : line,
        )
      }

      return [
        ...previous,
        {
          key: crypto.randomUUID(),
          variantId: option.variantId,
          productName: option.productName,
          variantLabel: option.variantLabel,
          sku: option.sku,
          currentStock: option.currentStock,
          qty: '1',
          unitPrice: option.salePrice,
        },
      ]
    })
  }

  function patchLine(key: string, patch: Partial<LineDraft>) {
    setLines((previous) => previous.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function submit() {
    if (payload.items.length === 0) {
      toast.error('Хамгийн багадаа нэг бараа нэмнэ үү')
      return
    }

    startTransition(async () => {
      const result = await createOrder({
        channel,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_address: deliveryAddress || null,
        note: note || null,
        delivery_fee: deliveryFee || '0',
        discount_amount: discount || '0',
        status: confirmNow ? 'confirmed' : 'pending',
        items: payload.items,
      })

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }

      toast.success('Захиалга бүртгэгдлээ')
      router.push(`/admin/orders/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Захиалга</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="channel">Суваг</Label>
              <Select
                value={channel}
                onValueChange={(value) => setChannel(String(value) as OrderChannel)}
                items={ORDER_CHANNEL_LABELS}
              >
                <SelectTrigger id="channel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_CHANNELS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ORDER_CHANNEL_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-name">Харилцагчийн нэр</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Утас</Label>
              <Input
                id="customer-phone"
                inputMode="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Хүргэлтийн хаяг</Label>
              <Input
                id="address"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Тэмдэглэл</Label>
              <Textarea
                id="note"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Бараа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <VariantCombobox options={options} onSelect={addLine} />

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Бараа нэмээгүй байна.
              </p>
            ) : (
              <div className="space-y-3">
                {lines.map((line) => {
                  const qty = Number(line.qty || '0')
                  const short = qty > line.currentStock

                  return (
                    <div key={line.key} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {line.productName}
                            {line.variantLabel ? ` · ${line.variantLabel}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {line.sku ?? 'SKU байхгүй'} · Нөөц: {line.currentStock}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Мөр хасах"
                          onClick={() =>
                            setLines((previous) => previous.filter((item) => item.key !== line.key))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`qty-${line.key}`} className="text-xs">
                            Тоо ширхэг
                          </Label>
                          <Input
                            id={`qty-${line.key}`}
                            inputMode="numeric"
                            value={line.qty}
                            onChange={(event) =>
                              patchLine(line.key, { qty: event.target.value.replace(/[^\d]/g, '') })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`price-${line.key}`} className="text-xs">
                            Нэгжийн үнэ
                          </Label>
                          <MoneyInput
                            id={`price-${line.key}`}
                            value={line.unitPrice}
                            onChange={(value) => patchLine(line.key, { unitPrice: value })}
                          />
                        </div>
                      </div>

                      {short ? (
                        <p className="mt-2 text-xs font-medium text-destructive">
                          Нөөц хүрэхгүй байна: үлдэгдэл {line.currentStock}.
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Тооцоо</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Хөнгөлөлт</Label>
              <MoneyInput id="discount" value={discount} onChange={setDiscount} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery">Хүргэлтийн төлбөр</Label>
              <MoneyInput id="delivery" value={deliveryFee} onChange={setDeliveryFee} />
            </div>

            <dl className="space-y-2 border-t pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Нийт борлуулалт</dt>
                <dd className="font-medium tabular-nums">{formatMNT(totals.revenue)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Нийт өртөг</dt>
                <dd className="tabular-nums">{formatMNT(totals.cost)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Бохир ашиг</dt>
                <dd className="font-medium tabular-nums">{formatMNT(totals.grossProfit)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Ашгийн %</dt>
                <dd className="tabular-nums">{totals.marginPct.toFixed(1)}%</dd>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <dt className="text-muted-foreground">Төлөх дүн</dt>
                <dd className="font-semibold tabular-nums">{formatMNT(totals.total)}</dd>
              </div>
            </dl>

            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={confirmNow}
                onCheckedChange={(checked) => setConfirmNow(checked === true)}
              />
              Шууд баталгаажуулах (нөөцөөс хасна)
            </Label>

            <div className="flex flex-col gap-2">
              <Button type="button" onClick={submit} disabled={isPending}>
                {isPending ? 'Хадгалж байна…' : 'Захиалга хадгалах'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/orders')}>
                Болих
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
