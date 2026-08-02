import { useTranslations } from "next-intl";
import { LocaleToggle } from "./LocaleToggle";
import { logoutAction } from "@/lib/actions/auth";
import type { UserRole } from "@/types/next-auth";

export function Topbar({ name, role }: { name: string; role: UserRole }) {
  const t = useTranslations("Common");
  const tRoles = useTranslations("Roles");

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <span className="text-sm font-semibold text-neutral-900">{t("appName")}</span>
      <div className="flex items-center gap-4">
        <LocaleToggle />
        <span className="text-sm text-neutral-600">
          {name} · {tRoles(role)}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {t("logout")}
          </button>
        </form>
      </div>
    </header>
  );
}
