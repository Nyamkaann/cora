"use client";

import { useTranslations } from "next-intl";
import { deleteProduct } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/Button";

export function DeleteProductButton({ id }: { id: number }) {
  const t = useTranslations("Common");

  return (
    <Button
      type="button"
      variant="danger"
      className="px-2 py-1 text-xs"
      onClick={() => {
        if (window.confirm(t("confirmDelete"))) {
          deleteProduct(id);
        }
      }}
    >
      {t("delete")}
    </Button>
  );
}
