"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SaleForm } from "./SaleForm";
import type { Product } from "@/db/schema";

export function NewSalePanel({ products }: { products: Product[] }) {
  const t = useTranslations("Sales");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        {t("newSale")}
      </Button>
    );
  }

  return (
    <Card>
      <SaleForm products={products} onDone={() => setOpen(false)} />
    </Card>
  );
}
