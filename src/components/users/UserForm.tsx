"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createUser, ActionState } from "@/lib/actions/users";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function UserForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("Users");
  const tRoles = useTranslations("Roles");
  const tCommon = useTranslations("Common");
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createUser, undefined);

  useEffect(() => {
    if (state?.success) {
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("name")}</label>
        <Input name="name" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("email")}</label>
        <Input type="email" name="email" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("role")}</label>
        <Select name="role" defaultValue="sales" required>
          <option value="admin">{tRoles("admin")}</option>
          <option value="warehouse">{tRoles("warehouse")}</option>
          <option value="sales">{tRoles("sales")}</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("tempPassword")}</label>
        <Input type="text" name="password" required minLength={8} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={isPending}>
          {tCommon("save")}
        </Button>
        {onDone && (
          <Button type="button" variant="secondary" onClick={onDone}>
            {tCommon("cancel")}
          </Button>
        )}
      </div>
      {state?.error === "email_taken" && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{t("emailTaken")}</p>
      )}
      {state?.error && state.error !== "email_taken" && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{tCommon("error")}</p>
      )}
    </form>
  );
}
