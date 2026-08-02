import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { requireUser } from "@/lib/auth-guard";
import { NewSalePanel } from "@/components/sales/NewSalePanel";
import { SalesTable } from "@/components/sales/SalesTable";

export default async function SalesPage() {
  const t = await getTranslations("Sales");
  const user = await requireUser();
  const canCreate = user.role === "admin" || user.role === "sales";
  const canDelete = user.role === "admin";

  const [sales, products] = await Promise.all([
    db.query.salesLog.findMany({
      with: { product: true },
      orderBy: (s, { desc }) => [desc(s.soldAt), desc(s.id)],
      limit: 200,
    }),
    db.query.products.findMany({
      orderBy: (p, { asc }) => [asc(p.name)],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      {canCreate && <NewSalePanel products={products} />}

      <SalesTable sales={sales} canDelete={canDelete} />
    </div>
  );
}
