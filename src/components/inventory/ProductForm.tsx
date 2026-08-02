"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createProduct, updateProduct, ActionState } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Category, Brand, Product } from "@/db/schema";

export function ProductForm({
  categories,
  brands,
  product,
  onDone,
}: {
  categories: Category[];
  brands: Brand[];
  product?: Product;
  onDone?: () => void;
}) {
  const t = useTranslations("Inventory");
  const tCommon = useTranslations("Common");
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("name")}</label>
        <Input name="name" required defaultValue={product?.name} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("sku")}</label>
        <Input name="sku" defaultValue={product?.sku ?? ""} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("category")}</label>
        <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("brand")}</label>
        <Select name="brandId" defaultValue={product?.brandId ?? ""}>
          <option value="">—</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("unit")}</label>
        <Input name="unit" defaultValue={product?.unit ?? ""} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("costPrice")}</label>
        <Input type="number" step="0.01" min="0" name="costPrice" required defaultValue={product?.costPrice ?? 0} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("sellPrice")}</label>
        <Input type="number" step="0.01" min="0" name="sellPrice" required defaultValue={product?.sellPrice ?? 0} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("stockQty")}</label>
        <Input type="number" min="0" name="stockQty" required defaultValue={product?.stockQty ?? 0} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">
          {t("lowStockThreshold")}
        </label>
        <Input
          type="number"
          min="0"
          name="lowStockThreshold"
          required
          defaultValue={product?.lowStockThreshold ?? 5}
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={isPending}>
          {tCommon("save")}
        </Button>
        {onDone && (
          <Button type="button" variant="secondary" onClick={onDone}>
            {tCommon("cancel")}
          </Button>
        )}
      </div>
      {state?.error && <p className="text-sm text-red-600">{tCommon("error")}</p>}
    </form>
  );
}
