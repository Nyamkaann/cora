'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { MoneyInput } from '@/components/admin/money-input'
import { addStock, adjustStock } from '@/server/actions/inventory'

type Target = { variantId: string; label: string }

/** Stock intake. A different unit cost moves the variant to a weighted average. */
export function AddStockDialog({ target }: { target: Target }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    const quantity = Number(qty || '0')
    if (quantity < 1) {
      toast.error('Тоо ширхэгээ оруулна уу')
      return
    }

    startTransition(async () => {
      const result = await addStock({
        variant_id: target.variantId,
        qty: quantity,
        unit_cost: unitCost || '0',
        note: note || null,
      })

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }

      toast.success('Нөөц нэмэгдлээ')
      setOpen(false)
      setQty('')
      setUnitCost('')
      setNote('')
      router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Нөөц нэмэх"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нөөц нэмэх</DialogTitle>
            <DialogDescription>{target.label}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-qty">Тоо ширхэг</Label>
              <Input
                id="add-qty"
                inputMode="numeric"
                value={qty}
                onChange={(event) => setQty(event.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-cost">Нэгжийн өртөг</Label>
              <MoneyInput id="add-cost" value={unitCost} onChange={setUnitCost} />
              <p className="text-xs text-muted-foreground">
                Өртөг өөр байвал барааны өртөг жигнэсэн дундажаар шинэчлэгдэнэ.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-note">Тэмдэглэл</Label>
              <Textarea
                id="add-note"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Болих
            </Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? 'Хадгалж байна…' : 'Нэмэх'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const ADJUST_REASONS = [
  { value: 'adjustment', label: 'Тоолго / алдаа засах' },
  { value: 'damage', label: 'Гэмтэл' },
] as const

/** Manual correction: positive or negative. */
export function AdjustStockDialog({ target }: { target: Target }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState<'adjustment' | 'damage'>('adjustment')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    const quantity = Number(qty || '0')
    if (!Number.isInteger(quantity) || quantity === 0) {
      toast.error('Тоо ширхэг 0-ээс ялгаатай бүхэл тоо байх ёстой')
      return
    }

    startTransition(async () => {
      const result = await adjustStock({
        variant_id: target.variantId,
        qty: quantity,
        reason,
        note: note || null,
      })

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }

      toast.success('Тохируулга бүртгэгдлээ')
      setOpen(false)
      setQty('')
      setNote('')
      router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Нөөц тохируулах"
        onClick={() => setOpen(true)}
      >
        <Minus className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нөөц тохируулах</DialogTitle>
            <DialogDescription>{target.label}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Шалтгаан</Label>
              <Select
                value={reason}
                onValueChange={(value) => setReason(value === 'damage' ? 'damage' : 'adjustment')}
              >
                <SelectTrigger id="adjust-reason" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUST_REASONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-qty">Тоо ширхэг</Label>
              <Input
                id="adjust-qty"
                inputMode="numeric"
                placeholder="-2 эсвэл 5"
                value={qty}
                onChange={(event) => setQty(event.target.value.replace(/[^\d-]/g, ''))}
              />
              <p className="text-xs text-muted-foreground">
                Хасах бол сөрөг тоо бичнэ (жишээ: −2).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-note">Тэмдэглэл</Label>
              <Textarea
                id="adjust-note"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Болих
            </Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? 'Хадгалж байна…' : 'Хадгалах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
