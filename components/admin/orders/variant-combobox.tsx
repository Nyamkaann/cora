'use client'

import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatMNT } from '@/lib/money'
import type { VariantOption } from '@/types/orders'

/** Search by product name or SKU, with the stock on hand next to each row. */
export function VariantCombobox({
  options,
  onSelect,
}: {
  options: VariantOption[]
  onSelect: (option: VariantOption) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-between">
            Бараа нэмэх
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[min(32rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Нэр эсвэл SKU-гаар хайх…" />
          <CommandList>
            <CommandEmpty>Бараа олдсонгүй.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.variantId}
                  value={`${option.productName} ${option.variantLabel} ${option.sku ?? ''}`}
                  onSelect={() => {
                    onSelect(option)
                    setOpen(false)
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {option.productName}
                        {option.variantLabel ? ` · ${option.variantLabel}` : ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {option.sku ?? 'SKU байхгүй'} · {formatMNT(option.salePrice)}
                      </p>
                    </div>
                    <span
                      className={
                        option.currentStock <= 0
                          ? 'shrink-0 text-xs font-medium text-destructive'
                          : 'shrink-0 text-xs text-muted-foreground'
                      }
                    >
                      Нөөц: {option.currentStock}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
