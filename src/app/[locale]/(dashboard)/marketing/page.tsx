import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { requireRole } from "@/lib/auth-guard";
import { ProductPicker } from "@/components/marketing/ProductPicker";
import { GenerateForm } from "@/components/marketing/GenerateForm";
import { ImageHistoryList } from "@/components/marketing/ImageHistoryList";

export default async function MarketingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ productId?: string }>;
}) {
  const { locale } = await params;
  const { productId: productIdParam } = await searchParams;
  await requireRole("admin");
  const t = await getTranslations("Marketing");

  const productId = productIdParam ? Number(productIdParam) : undefined;

  const [productList, images] = await Promise.all([
    db.query.products.findMany({ orderBy: (p, { asc }) => [asc(p.name)] }),
    productId
      ? db.query.productImages.findMany({
          where: (pi, { eq }) => eq(pi.productId, productId),
          orderBy: (pi, { desc }) => [desc(pi.createdAt)],
          with: { posts: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <ProductPicker products={productList} />

      {productId && (
        <>
          <GenerateForm productId={productId} />
          <ImageHistoryList images={images} locale={locale} />
        </>
      )}
    </div>
  );
}
