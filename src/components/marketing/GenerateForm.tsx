"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { generateProductImage, type GenerateState } from "@/lib/actions/marketing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const ERROR_KEYS: Record<string, string> = {
  no_file: "errorNoFile",
  invalid_file_type: "errorInvalidFileType",
  product_not_found: "errorProductNotFound",
};

export function GenerateForm({ productId }: { productId: number }) {
  const t = useTranslations("Marketing");
  const tCommon = useTranslations("Common");
  const action = generateProductImage.bind(null, productId);
  const [state, formAction, isPending] = useActionState<GenerateState, FormData>(action, undefined);

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">{t("uploadTitle")}</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">{t("chooseFile")}</label>
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="block text-sm text-neutral-700"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("generating") : t("generate")}
        </Button>
      </form>
      {isPending && <p className="text-xs text-neutral-500">{t("generatingHint")}</p>}
      {state?.error && <p className="text-sm text-red-600">{t(ERROR_KEYS[state.error] ?? "errorProductNotFound") || tCommon("error")}</p>}
    </Card>
  );
}
