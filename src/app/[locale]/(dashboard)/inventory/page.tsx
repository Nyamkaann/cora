import { and, eq, ilike, or } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductTable } from "@/components/inventory/ProductTable";
import { NewProductPanel } from "@/components/inventory/NewProductPanel";
import { QuickAddCategoryBrand } from "@/components/inventory/QuickAddCategoryBrand";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; brand?: string }>;
}) {
  const { q, category, brand } = await searchParams;
  const t = await getTranslations("Inventory");
  const user = await requireUser();
  const canManage = user.role === "admin" || user.role === "warehouse";

  const conditions = [
    q ? or(ilike(products.name, `%${q}%`), ilike(products.sku, `%${q}%`)) : undefined,
    category ? eq(products.categoryId, Number(category)) : undefined,
    brand ? eq(products.brandId, Number(brand)) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const [productList, categoryList, brandList] = await Promise.all([
    db.query.products.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { category: true, brand: true },
      orderBy: (p, { asc }) => [asc(p.name)],
    }),
    db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] }),
    db.query.brands.findMany({ orderBy: (b, { asc }) => [asc(b.name)] }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {canManage && (
        <div className="space-y-3">
          <NewProductPanel categories={categoryList} brands={brandList} />
          <QuickAddCategoryBrand />
        </div>
      )}

      <InventoryFilters categories={categoryList} brands={brandList} />

      <ProductTable
        products={productList}
        categories={categoryList}
        brands={brandList}
        canManage={canManage}
      />
    </div>
  );
}
