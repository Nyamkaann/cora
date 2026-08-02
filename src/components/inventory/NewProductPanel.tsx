"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductForm } from "./ProductForm";
import type { Category, Brand } from "@/db/schema";

export function NewProductPanel({ categories, brands }: { categories: Category[]; brands: Brand[] }) {
  const t = useTranslations("Inventory");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        {t("newProduct")}
      </Button>
    );
  }

  return (
    <Card>
      <ProductForm categories={categories} brands={brands} onDone={() => setOpen(false)} />
    </Card>
  );
}
