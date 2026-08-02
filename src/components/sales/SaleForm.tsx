"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createSale, ActionState } from "@/lib/actions/sales";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Product } from "@/db/schema";

export function SaleForm({ products, onDone }: { products: Product[]; onDone?: () => void }) {
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createSale, undefined);
  const [productId, setProductId] = useState<number | string>(products[0]?.id ?? "");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === Number(productId)),
    [products, productId]
  );

  useEffect(() => {
    if (state?.success) {
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("product")}</label>
        <Select name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.stockQty})
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("quantity")}</label>
        <Input type="number" min="1" name="quantity" required defaultValue={1} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("unitPrice")}</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          name="unitPrice"
          required
          key={selectedProduct?.id}
          defaultValue={selectedProduct?.sellPrice ?? 0}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("channel")}</label>
        <Select name="channel" defaultValue="in_store" required>
          <option value="in_store">{t("inStore")}</option>
          <option value="social">{t("social")}</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("soldAt")}</label>
        <Input type="date" name="soldAt" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit" disabled={isPending}>
          {tCommon("save")}
        </Button>
        {onDone && (
          <Button type="button" variant="secondary" onClick={onDone}>
            {tCommon("cancel")}
          </Button>
        )}
      </div>
      {state?.error === "insufficient_stock" && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">{t("insufficientStock")}</p>
      )}
      {state?.error && state.error !== "insufficient_stock" && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">{tCommon("error")}</p>
      )}
    </form>
  );
}
