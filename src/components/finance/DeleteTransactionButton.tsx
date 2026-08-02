"use client";

import { useTranslations } from "next-intl";
import { deleteTransaction } from "@/lib/actions/finance";
import { Button } from "@/components/ui/Button";

export function DeleteTransactionButton({ id }: { id: number }) {
  const t = useTranslations("Common");

  return (
    <Button
      type="button"
      variant="danger"
      className="px-2 py-1 text-xs"
      onClick={() => {
        if (window.confirm(t("confirmDelete"))) {
          deleteTransaction(id);
        }
      }}
    >
      {t("delete")}
    </Button>
  );
}
