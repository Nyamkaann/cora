"use client";

import { useActionState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createCategory, createBrand, ActionState } from "@/lib/actions/inventory";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function QuickAddForm({
  action,
  placeholder,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  placeholder: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <Input name="name" placeholder={placeholder} required className="w-40" />
      <Button type="submit" variant="secondary" disabled={isPending} className="px-2.5 py-1 text-xs">
        +
      </Button>
    </form>
  );
}

export function QuickAddCategoryBrand() {
  const t = useTranslations("Inventory");

  return (
    <div className="flex flex-wrap gap-3">
      <QuickAddForm action={createCategory} placeholder={t("category")} />
      <QuickAddForm action={createBrand} placeholder={t("brand")} />
    </div>
  );
}
