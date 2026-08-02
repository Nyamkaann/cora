"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";
import type { Product } from "@/db/schema";

export function ProductPicker({ products }: { products: Product[] }) {
  const t = useTranslations("Marketing");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectProduct(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("productId", value);
    } else {
      params.delete("productId");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="max-w-sm">
      <label className="mb-1 block text-xs font-medium text-neutral-600">{t("selectProduct")}</label>
      <Select defaultValue={searchParams.get("productId") ?? ""} onChange={(e) => selectProduct(e.target.value)}>
        <option value="">{t("productPlaceholder")}</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
