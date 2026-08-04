"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, isPending] = useActionState(
    loginAction.bind(null, `/${locale}/finance`),
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" name="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{t("invalidCredentials")}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-full" variant="primary">
        {t("loginButton")}
      </Button>
    </form>
  );
}
