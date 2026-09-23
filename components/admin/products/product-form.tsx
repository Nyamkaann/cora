'use client'

import { useId, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { ImageManager, type PendingImage } from '@/components/admin/products/image-manager'
import {
  SIZE_VALUES,
  VariantEditor,
  variantLabel,
  type VariantDraft,
} from '@/components/admin/products/variant-editor'
import { prepareImage } from '@/lib/images'
import { slugify, suggestSku } from '@/lib/slug'
import { createClient } from '@/lib/supabase/client'
import {
  addProductImages,
  createProduct,
  deleteVariant,
  updateProduct,
} from '@/server/actions/products'
import type { BrandOption, CategoryOption, ProductDetail } from '@/types/catalog'

const PRODUCT_IMAGES_BUCKET = 'product-images'
const NONE = 'none'

const basicSchema = z.object({
  name: z.string().trim().min(1, 'Барааны нэрээ оруулна уу'),
  slug: z.string().trim().min(1, 'Slug хоосон байна'),
  description: z.string().trim(),
  brand_id: z.string(),
  category_id: z.string(),
  status: z.enum(['active', 'archived']),
})

type BasicValues = z.infer<typeof basicSchema>

type OptionMode = 'none' | 'Size' | 'Volume' | 'custom'

function blankDraft(
  attributes: Record<string, string>,
  productSlug: string,
  key: string,
): VariantDraft {
  return {
    key,
    attributes,
    sku: suggestSku(productSlug, Object.values(attributes)),
    costPrice: '',
    salePrice: '',
    initialStock: '',
    isActive: true,
    currentStock: null,
  }
}

function initialOptionState(product?: ProductDetail): {
  mode: OptionMode
  optionName: string
  values: string[]
} {
  const optionName = product?.option_types[0] ?? ''
  if (!optionName) return { mode: 'none', optionName: '', values: [] }

  const values: string[] = []
  for (const variant of product?.variants ?? []) {
    const value = variant.attributes[optionName]
    if (value && !values.includes(value)) values.push(value)
  }

  const mode: OptionMode = optionName === 'Size' || optionName === 'Volume' ? optionName : 'custom'
  return { mode, optionName, values }
}

export function ProductForm({
  brands,
  categories,
  product,
}: {
  brands: BrandOption[]
  categories: CategoryOption[]
  product?: ProductDetail
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const initialOption = useMemo(() => initialOptionState(product), [product])

  // Keys must match between the server render and hydration, so they are
  // derived from useId rather than a random uuid.
  const keyPrefix = useId()
  const keyCounter = useRef(0)
  const nextKey = () => {
    keyCounter.current += 1
    return `${keyPrefix}-${keyCounter.current}`
  }

  const [mode, setMode] = useState<OptionMode>(initialOption.mode)
  const [optionName, setOptionName] = useState(initialOption.optionName)
  const [optionValues, setOptionValues] = useState<string[]>(initialOption.values)
  const [valueInput, setValueInput] = useState('')
  const [slugTouched, setSlugTouched] = useState(Boolean(product))
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])

  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    if (!product) return [blankDraft({}, '', `${keyPrefix}-1`)]
    return product.variants.map((variant) => ({
      key: variant.id,
      id: variant.id,
      attributes: variant.attributes,
      sku: variant.sku ?? '',
      costPrice: variant.cost_price,
      salePrice: variant.sale_price,
      initialStock: '',
      isActive: variant.is_active,
      currentStock: variant.current_stock,
    }))
  })

  if (keyCounter.current === 0) keyCounter.current = variants.length

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BasicValues>({
    resolver: zodResolver(basicSchema),
    defaultValues: {
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      description: product?.description ?? '',
      brand_id: product?.brand_id ?? NONE,
      category_id: product?.category_id ?? NONE,
      status: product?.status ?? 'active',
    },
  })

  // Base UI renders the raw value in Select.Value unless the root is given a
  // value -> label map.
  const brandItems = useMemo(
    () => ({ [NONE]: 'Сонгоогүй', ...Object.fromEntries(brands.map((b) => [b.id, b.name])) }),
    [brands],
  )
  const categoryItems = useMemo(
    () => ({ [NONE]: 'Сонгоогүй', ...Object.fromEntries(categories.map((c) => [c.id, c.name])) }),
    [categories],
  )
  const statusItems = { active: 'Идэвхтэй', archived: 'Архивласан' }

  const slug = watch('slug')
  const brandId = watch('brand_id')
  const categoryId = watch('category_id')
  const status = watch('status')

  function rebuildVariants(nextOptionName: string, nextValues: string[]) {
    setVariants((previous) => {
      if (nextOptionName === '') {
        const kept = previous[0]
        if (!kept) return [blankDraft({}, slug, nextKey())]
        return [{ ...kept, attributes: {} }]
      }

      return nextValues.map((value) => {
        const match =
          previous.find((variant) => variant.attributes[nextOptionName] === value) ??
          previous.find((variant) => Object.values(variant.attributes)[0] === value)

        const attributes = { [nextOptionName]: value }
        if (match) return { ...match, attributes }
        return blankDraft(attributes, slug, nextKey())
      })
    })
  }

  function selectMode(nextMode: OptionMode) {
    setMode(nextMode)
    if (nextMode === 'none') {
      setOptionName('')
      setOptionValues([])
      rebuildVariants('', [])
      return
    }

    const nextName = nextMode === 'custom' ? optionName || '' : nextMode
    setOptionName(nextName)
    setOptionValues([])
    if (nextName) rebuildVariants(nextName, [])
  }

  function toggleSize(size: string) {
    const next = optionValues.includes(size)
      ? optionValues.filter((value) => value !== size)
      : SIZE_VALUES.filter((value) => optionValues.includes(value) || value === size)

    setOptionValues(next)
    rebuildVariants('Size', next)
  }

  function addValue() {
    const value = valueInput.trim()
    if (!value || optionValues.includes(value) || !optionName) return

    const next = [...optionValues, value]
    setOptionValues(next)
    setValueInput('')
    rebuildVariants(optionName, next)
  }

  function removeValue(value: string) {
    const next = optionValues.filter((item) => item !== value)
    setOptionValues(next)
    rebuildVariants(optionName, next)
  }

  function patchVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((previous) =>
      previous.map((variant) => (variant.key === key ? { ...variant, ...patch } : variant)),
    )
  }

  function removeVariant(variant: VariantDraft) {
    if (!variant.id) {
      setVariants((previous) => previous.filter((item) => item.key !== variant.key))
      setOptionValues((previous) =>
        previous.filter((value) => !Object.values(variant.attributes).includes(value)),
      )
      return
    }

    startTransition(async () => {
      const result = await deleteVariant(variant.id as string)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      setVariants((previous) => previous.filter((item) => item.key !== variant.key))
      setOptionValues((previous) =>
        previous.filter((value) => !Object.values(variant.attributes).includes(value)),
      )
      toast.success(`«${variantLabel(variant.attributes)}» устлаа`)
      router.refresh()
    })
  }

  async function uploadPendingImages(productId: string): Promise<void> {
    if (pendingImages.length === 0) return

    const supabase = createClient()
    const uploaded: {
      storage_path: string
      is_primary: boolean
      is_transparent: boolean
      sort_order: number
    }[] = []

    for (const [index, image] of pendingImages.entries()) {
      const prepared = await prepareImage(image.file)
      const path = `${productId}/${crypto.randomUUID()}.${prepared.extension}`

      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, prepared.blob, { contentType: prepared.blob.type || undefined })

      if (error) {
        toast.error(`Зураг ачаалахад алдаа гарлаа: ${error.message}`)
        continue
      }

      uploaded.push({
        storage_path: path,
        is_primary: false,
        is_transparent: prepared.hasAlpha,
        sort_order: index,
      })
    }

    if (uploaded.length > 0) {
      const result = await addProductImages(productId, uploaded)
      if (!result.ok) toast.error(result.error.message)
    }

    for (const image of pendingImages) URL.revokeObjectURL(image.previewUrl)
    setPendingImages([])
  }

  function onSubmit(values: BasicValues) {
    if (variants.length === 0) {
      toast.error('Хамгийн багадаа нэг хувилбар шаардлагатай')
      return
    }

    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      brand_id: values.brand_id === NONE ? null : values.brand_id,
      category_id: values.category_id === NONE ? null : values.category_id,
      option_types: optionName ? [optionName] : [],
      status: values.status,
      is_featured: false,
      variants: variants.map((variant, index) => ({
        id: variant.id,
        sku: variant.sku.trim() || null,
        attributes: variant.attributes,
        cost_price: variant.costPrice || '0',
        sale_price: variant.salePrice || '0',
        is_active: variant.isActive,
        sort_order: index,
        initial_stock: variant.id ? 0 : Number(variant.initialStock || '0'),
      })),
    }

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload)

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }

      await uploadPendingImages(result.data.id)
      toast.success(product ? 'Хадгаллаа' : 'Бараа үүслээ')
      router.push(`/admin/products/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Үндсэн</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Нэр</Label>
            <Input
              id="name"
              {...register('name', {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) setValue('slug', slugify(event.target.value))
                },
              })}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              {...register('slug', { onChange: () => setSlugTouched(true) })}
            />
            {errors.slug ? <p className="text-sm text-destructive">{errors.slug.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Брэнд</Label>
            <Select
              value={brandId}
              onValueChange={(value) => setValue('brand_id', String(value))}
              items={brandItems}
            >
              <SelectTrigger id="brand" className="w-full">
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Сонгоогүй</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Ангилал</Label>
            <Select
              value={categoryId}
              onValueChange={(value) => setValue('category_id', String(value))}
              items={categoryItems}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Сонгоогүй</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Тайлбар</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Төлөв</Label>
            <Select
              value={status}
              onValueChange={(value) => setValue('status', value === 'archived' ? 'archived' : 'active')}
              items={statusItems}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Идэвхтэй</SelectItem>
                <SelectItem value="archived">Архивласан</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Хувилбар</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: 'none', label: 'Байхгүй' },
                { value: 'Size', label: 'Size' },
                { value: 'Volume', label: 'Volume' },
                { value: 'custom', label: 'Захиалгат' },
              ] as { value: OptionMode; label: string }[]
            ).map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={mode === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectMode(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {mode === 'Size' ? (
            <div className="flex flex-wrap gap-3">
              {SIZE_VALUES.map((size) => (
                <Label key={size} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={optionValues.includes(size)}
                    onCheckedChange={() => toggleSize(size)}
                  />
                  {size}
                </Label>
              ))}
            </div>
          ) : null}

          {mode === 'Volume' || mode === 'custom' ? (
            <div className="space-y-3">
              {mode === 'custom' ? (
                <div className="space-y-2">
                  <Label htmlFor="option-name">Сонголтын нэр</Label>
                  <Input
                    id="option-name"
                    value={optionName}
                    placeholder="Жишээ: Өнгө"
                    onChange={(event) => {
                      setOptionName(event.target.value)
                      rebuildVariants(event.target.value, optionValues)
                    }}
                    className="sm:max-w-xs"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="option-value">Утга нэмэх</Label>
                <div className="flex gap-2 sm:max-w-sm">
                  <Input
                    id="option-value"
                    value={valueInput}
                    placeholder={mode === 'Volume' ? '300ml' : 'Утга'}
                    onChange={(event) => setValueInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addValue()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addValue}>
                    <Plus className="size-4" />
                    Нэмэх
                  </Button>
                </div>
              </div>

              {optionValues.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {optionValues.map((value) => (
                    <Badge key={value} variant="secondary" className="gap-1">
                      {value}
                      <button
                        type="button"
                        aria-label={`${value} утгыг хасах`}
                        onClick={() => removeValue(value)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <VariantEditor variants={variants} onChange={patchVariant} onRemove={removeVariant} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Зураг</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageManager
            productId={product?.id ?? null}
            images={product?.images ?? []}
            pending={pendingImages}
            onPendingChange={setPendingImages}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Хадгалж байна…' : 'Хадгалах'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
          Болих
        </Button>
      </div>
    </form>
  )
}
