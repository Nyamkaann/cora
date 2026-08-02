"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Category, Brand } from "@/db/schema";

export function InventoryFilters({ categories, brands }: { categories: Category[]; brands: Brand[] }) {
  const t = useTranslations("Inventory");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Input
        placeholder={t("searchPlaceholder")}
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
      />
      <Select
        defaultValue={searchParams.get("category") ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
      >
        <option value="">{tCommon("all")} — {t("filterByCategory")}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={searchParams.get("brand") ?? ""}
        onChange={(e) => updateParam("brand", e.target.value)}
      >
        <option value="">{tCommon("all")} — {t("filterByBrand")}</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
