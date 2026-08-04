"use client";

import { useTranslations } from "next-intl";
import { SidebarNav } from "./SidebarNav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import type { UserRole } from "@/types/next-auth";

export function MobileSidebar({
  role,
  open,
  onOpenChange,
}: {
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Common");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle>{t("appName")}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <SidebarNav role={role} onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
