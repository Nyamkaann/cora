"use client";

import { useTranslations } from "next-intl";
import { deleteSale } from "@/lib/actions/sales";
import { Button } from "@/components/ui/Button";

export function DeleteSaleButton({ id }: { id: number }) {
  const t = useTranslations("Common");

  return (
    <Button
      type="button"
      variant="danger"
      className="px-2 py-1 text-xs"
      onClick={() => {
        if (window.confirm(t("confirmDelete"))) {
          deleteSale(id);
        }
      }}
    >
      {t("delete")}
    </Button>
  );
}
