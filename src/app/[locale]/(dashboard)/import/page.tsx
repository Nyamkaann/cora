import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth-guard";
import { ImportWizard } from "@/components/import/ImportWizard";

export default async function ImportPage() {
  await requireRole("admin");
  const t = await getTranslations("Import");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <ImportWizard />
    </div>
  );
}
