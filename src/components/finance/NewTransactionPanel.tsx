"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TransactionForm } from "./TransactionForm";

export function NewTransactionPanel() {
  const t = useTranslations("Finance");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        {t("newTransaction")}
      </Button>
    );
  }

  return (
    <Card>
      <TransactionForm onDone={() => setOpen(false)} />
    </Card>
  );
}
