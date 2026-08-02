"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductForm } from "./ProductForm";
import { DeleteProductButton } from "./DeleteProductButton";
import { formatCurrency } from "@/lib/format";
import type { Category, Brand, Product } from "@/db/schema";

export type ProductWithRelations = Product & {
  category: Category | null;
  brand: Brand | null;
};

export function ProductTable({
  products,
  categories,
  brands,
  canManage,
}: {
  products: ProductWithRelations[];
  categories: Category[];
  brands: Brand[];
  canManage: boolean;
}) {
  const t = useTranslations("Inventory");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>{t("name")}</Th>
          <Th>{t("sku")}</Th>
          <Th>{t("category")}</Th>
          <Th>{t("brand")}</Th>
          <Th>{t("costPrice")}</Th>
          <Th>{t("sellPrice")}</Th>
          <Th>{t("stockQty")}</Th>
          {canManage && <Th>{tCommon("actions")}</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {products.length === 0 && (
          <Tr>
            <Td colSpan={canManage ? 8 : 7} className="text-center text-neutral-400">
              {tCommon("noResults")}
            </Td>
          </Tr>
        )}
        {products.map((product) =>
          editingId === product.id ? (
            <Tr key={product.id}>
              <Td colSpan={canManage ? 8 : 7}>
                <ProductForm
                  product={product}
                  categories={categories}
                  brands={brands}
                  onDone={() => setEditingId(null)}
                />
              </Td>
            </Tr>
          ) : (
            <Tr key={product.id}>
              <Td>{product.name}</Td>
              <Td>{product.sku ?? "—"}</Td>
              <Td>{product.category?.name ?? "—"}</Td>
              <Td>{product.brand?.name ?? "—"}</Td>
              <Td>{formatCurrency(product.costPrice, locale)}</Td>
              <Td>{formatCurrency(product.sellPrice, locale)}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  {product.stockQty}
                  {product.stockQty <= product.lowStockThreshold && (
                    <Badge variant="warning">{t("lowStock")}</Badge>
                  )}
                </div>
              </Td>
              {canManage && (
                <Td>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => setEditingId(product.id)}
                    >
                      {tCommon("edit")}
                    </Button>
                    <DeleteProductButton id={product.id} />
                  </div>
                </Td>
              )}
            </Tr>
          )
        )}
      </Tbody>
    </Table>
  );
}
