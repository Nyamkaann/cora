"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, isPending] = useActionState(
    loginAction.bind(null, `/${locale}/finance`),
    undefined
  );

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          {t("email")}
        </label>
        <Input type="email" name="email" required autoComplete="email" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          {t("password")}
        </label>
        <Input type="password" name="password" required autoComplete="current-password" />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600">{t("invalidCredentials")}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {t("loginButton")}
      </Button>
    </form>
  );
}
