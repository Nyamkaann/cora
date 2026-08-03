import * as XLSX from "xlsx";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth-guard";

const SAMPLE_ROWS: Record<string, (string | number)[][]> = {
  mn: [["Жишээ бүтээгдэхүүн", "SKU-001", "Үнэртэй ус", "Adopt", "ширхэг", 10000, 15000, 20]],
  en: [["Sample product", "SKU-001", "Perfume", "Adopt", "pcs", 10000, 15000, 20]],
};

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  await requireRole("admin");
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Import" });

  const headers = [
    t("fieldName"),
    t("fieldSku"),
    t("fieldCategory"),
    t("fieldBrand"),
    t("fieldUnit"),
    t("fieldCostPrice"),
    t("fieldSellPrice"),
    t("fieldStockQty"),
  ];

  const sampleRows = SAMPLE_ROWS[locale] ?? SAMPLE_ROWS.en;
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  sheet["!cols"] = headers.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
    },
  });
}
