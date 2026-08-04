"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MenuIcon, LogOutIcon } from "lucide-react";
import { LocaleToggle } from "./LocaleToggle";
import { MobileSidebar } from "./MobileSidebar";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import type { UserRole } from "@/types/next-auth";

export function Topbar({ name, role }: { name: string; role: UserRole }) {
  const t = useTranslations("Common");
  const tRoles = useTranslations("Roles");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <MobileSidebar role={role} open={mobileOpen} onOpenChange={setMobileOpen} />
          <span className="truncate text-sm font-semibold sm:text-base">{t("appName")}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <LocaleToggle />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <span className="hidden max-w-[140px] truncate text-sm text-muted-foreground sm:block lg:max-w-[200px]">
            {name}
          </span>
          <span className="hidden rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground md:inline-flex">
            {tRoles(role)}
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
              <LogOutIcon className="size-4" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
