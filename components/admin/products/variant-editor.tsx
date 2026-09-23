'use client'

import { Copy, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/admin/money-input'
import { MarginBadge } from '@/components/admin/products/margin-badge'
import { marginPct, parseMoney } from '@/lib/money'

export const SIZE_VALUES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export type VariantDraft = {
  key: string
  id?: string
  attributes: Record<string, string>
  sku: string
  costPrice: string
  salePrice: string
  initialStock: string
  isActive: boolean
  currentStock: number | null
}

export function variantLabel(attributes: Record<string, string>): string {
  const values = Object.values(attributes)
  return values.length > 0 ? values.join(' / ') : 'Үндсэн'
}

export function VariantEditor({
  variants,
  onChange,
  onRemove,
}: {
  variants: VariantDraft[]
  onChange: (key: string, patch: Partial<VariantDraft>) => void
  onRemove: (variant: VariantDraft) => void
}) {
  const first = variants[0]

  function copyFirstPrices() {
    if (!first) return
    for (const variant of variants) {
      if (variant.key === first.key) continue
      onChange(variant.key, { costPrice: first.costPrice, salePrice: first.salePrice })
    }
  }

  if (variants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Дээрээс сонголтоо хийвэл хувилбарууд автоматаар үүснэ.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {variants.length > 1 ? (
        <Button type="button" variant="outline" size="sm" onClick={copyFirstPrices}>
          <Copy className="size-3.5" />
          Эхний мөрийн үнийг бүгдэд хуулах
        </Button>
      ) : null}

      <div className="space-y-3">
        {variants.map((variant) => {
          const cost = parseMoney(variant.costPrice)
          const sale = parseMoney(variant.salePrice)
          const margin = marginPct(cost, sale).toNumber()
          const belowCost = !sale.isZero() && sale.lessThan(cost)

          return (
            <div key={variant.key} className="rounded-lg border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{variantLabel(variant.attributes)}</Badge>
                  {variant.currentStock !== null ? (
                    <span className="text-xs text-muted-foreground">
                      Нөөц: {variant.currentStock}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <MarginBadge value={margin} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Хувилбар устгах"
                    onClick={() => onRemove(variant)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5 lg:col-span-2">
                  <Label htmlFor={`sku-${variant.key}`} className="text-xs">
                    SKU
                  </Label>
                  <Input
                    id={`sku-${variant.key}`}
                    value={variant.sku}
                    onChange={(event) => onChange(variant.key, { sku: event.target.value })}
                    placeholder="CORA-..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`cost-${variant.key}`} className="text-xs">
                    Өртөг
                  </Label>
                  <MoneyInput
                    id={`cost-${variant.key}`}
                    value={variant.costPrice}
                    onChange={(value) => onChange(variant.key, { costPrice: value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`sale-${variant.key}`} className="text-xs">
                    Зарах үнэ
                  </Label>
                  <MoneyInput
                    id={`sale-${variant.key}`}
                    value={variant.salePrice}
                    onChange={(value) => onChange(variant.key, { salePrice: value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`stock-${variant.key}`} className="text-xs">
                    {variant.id ? 'Одоогийн нөөц' : 'Эхний нөөц'}
                  </Label>
                  {variant.id ? (
                    <Input value={variant.currentStock ?? 0} disabled />
                  ) : (
                    <Input
                      id={`stock-${variant.key}`}
                      inputMode="numeric"
                      value={variant.initialStock}
                      onChange={(event) =>
                        onChange(variant.key, {
                          initialStock: event.target.value.replace(/[^\d]/g, ''),
                        })
                      }
                      placeholder="0"
                    />
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={variant.isActive}
                    onCheckedChange={(checked) =>
                      onChange(variant.key, { isActive: checked === true })
                    }
                  />
                  Идэвхтэй
                </Label>
                {belowCost ? (
                  <p className="text-xs font-medium text-destructive">
                    Анхаар: зарах үнэ өртгөөс бага байна.
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
