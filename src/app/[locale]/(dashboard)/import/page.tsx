import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth-guard";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportWizard } from "@/components/import/ImportWizard";

export default async function ImportPage() {
  await requireRole("admin");
  const t = await getTranslations("Import");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <ImportWizard />
    </div>
  );
}
