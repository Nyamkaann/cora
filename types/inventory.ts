export type InventoryRow = {
  variantId: string
  productId: string
  productName: string
  variantLabel: string
  sku: string | null
  currentStock: number
  costPrice: string
  /** currentStock x costPrice, computed on the server. */
  stockValue: string
  lastMovementAt: string | null
}

export type MovementRow = {
  id: string
  createdAt: string
  qty: number
  reason: string
  unitCost: string | null
  note: string | null
}

export const MOVEMENT_REASON_LABELS: Record<string, string> = {
  stock_in: 'Нөөц нэмсэн',
  sale: 'Борлуулалт',
  return: 'Буцаалт',
  adjustment: 'Тохируулга',
  damage: 'Гэмтэл',
}
