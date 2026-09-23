'use client'

import { useQueryState } from 'nuqs'

import { Input } from '@/components/ui/input'

export function InventorySearchField() {
  const [search, setSearch] = useQueryState('q', {
    defaultValue: '',
    shallow: false,
    throttleMs: 300,
  })

  return (
    <Input
      value={search}
      onChange={(event) => setSearch(event.target.value || null)}
      placeholder="Бараа, SKU-гаар хайх…"
      className="sm:max-w-xs"
    />
  )
}
