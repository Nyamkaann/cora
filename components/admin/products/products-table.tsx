'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, MoreHorizontal, PackageX, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { LegacyColumnDef } from '@tanstack/react-table/legacy'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/admin/data-table'
import { MarginBadge } from '@/components/admin/products/margin-badge'
import { formatMNT } from '@/lib/money'
import { archiveProduct, duplicateProduct } from '@/server/actions/products'
import type { BrandOption, CategoryOption, ProductListRow } from '@/types/catalog'

const ALL = 'all'

export function ProductsTable({
  products,
  brands,
  categories,
}: {
  products: ProductListRow[]
  brands: BrandOption[]
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [brandId, setBrandId] = useState(ALL)
  const [categoryId, setCategoryId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [outOfStockOnly, setOutOfStockOnly] = useState(false)

  const rows = useMemo(
    () =>
      products.filter((product) => {
        if (brandId !== ALL && product.brandId !== brandId) return false
        if (categoryId !== ALL && product.categoryId !== categoryId) return false
        if (status !== ALL && product.status !== status) return false
        if (outOfStockOnly && product.totalStock > 0) return false
        return true
      }),
    [products, brandId, categoryId, status, outOfStockOnly],
  )

  function runAction(label: string, action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error?.message ?? 'Алдаа гарлаа')
        return
      }
      toast.success(label)
      router.refresh()
    })
  }

  const columns = useMemo<LegacyColumnDef<ProductListRow, unknown>[]>(
    () => [
      {
        id: 'image',
        header: 'Зураг',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.imageUrl ? (
            // Storage host is not configured for next/image in the MVP.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.original.imageUrl}
              alt={row.original.name}
              className="size-10 rounded-md border object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
              <PackageX className="size-4" />
            </div>
          ),
      },
      {
        accessorKey: 'name',
        header: 'Нэр',
        cell: ({ row }) => (
          <Link href={`/admin/products/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'brandName',
        header: 'Брэнд',
        cell: ({ row }) => row.original.brandName ?? '—',
      },
      {
        accessorKey: 'categoryName',
        header: 'Ангилал',
        cell: ({ row }) => row.original.categoryName ?? '—',
      },
      {
        accessorKey: 'variantCount',
        header: 'Хувилбар',
        cell: ({ row }) => <span className="tabular-nums">{row.original.variantCount}</span>,
      },
      {
        id: 'price',
        header: 'Үнэ',
        accessorFn: (row) => Number(row.minPrice),
        cell: ({ row }) => {
          const { minPrice, maxPrice } = row.original
          return (
            <span className="tabular-nums">
              {minPrice === maxPrice
                ? formatMNT(minPrice)
                : `${formatMNT(minPrice)} – ${formatMNT(maxPrice)}`}
            </span>
          )
        },
      },
      {
        accessorKey: 'totalStock',
        header: 'Нөөц',
        cell: ({ row }) => (
          <span
            className={
              row.original.totalStock <= 0
                ? 'font-medium text-destructive tabular-nums'
                : 'tabular-nums'
            }
          >
            {row.original.totalStock}
          </span>
        ),
      },
      {
        accessorKey: 'avgMarginPct',
        header: 'Ашиг %',
        cell: ({ row }) => <MarginBadge value={row.original.avgMarginPct} />,
      },
      {
        accessorKey: 'status',
        header: 'Төлөв',
        cell: ({ row }) =>
          row.original.status === 'active' ? (
            <Badge variant="secondary">Идэвхтэй</Badge>
          ) : (
            <Badge variant="outline">Архивласан</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const product = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Үйлдэл">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={`/admin/products/${product.id}`} />}>
                  <Pencil className="size-4" />
                  Засах
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => runAction('Хуулбар үүслээ', () => duplicateProduct(product.id))}
                >
                  <Copy className="size-4" />
                  Хуулбарлах
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    runAction(
                      product.status === 'active' ? 'Архивлалаа' : 'Идэвхжүүллээ',
                      () => archiveProduct(product.id, product.status === 'active'),
                    )
                  }
                >
                  <PackageX className="size-4" />
                  {product.status === 'active' ? 'Архивлах' : 'Идэвхжүүлэх'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    // runAction is stable enough for the MVP: it only closes over the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Нэрээр хайх…"
      emptyMessage="Бараа олдсонгүй."
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={brandId} onValueChange={(value) => setBrandId(String(value))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Брэнд" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Бүх брэнд</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={(value) => setCategoryId(String(value))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Ангилал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Бүх ангилал</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(value) => setStatus(String(value))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Бүх төлөв</SelectItem>
              <SelectItem value="active">Идэвхтэй</SelectItem>
              <SelectItem value="archived">Архивласан</SelectItem>
            </SelectContent>
          </Select>

          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={outOfStockOnly}
              onCheckedChange={(checked) => setOutOfStockOnly(checked === true)}
            />
            Нөөц дууссан
          </Label>
        </div>
      }
    />
  )
}
