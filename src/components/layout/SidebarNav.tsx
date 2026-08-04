"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/next-auth";
import {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Upload,
  Megaphone,
} from "lucide-react";

export const NAV_ITEMS: {
  href: string;
  labelKey: "finance" | "inventory" | "sales" | "users" | "import" | "marketing";
  roles: UserRole[];
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/finance", labelKey: "finance", roles: ["admin"], icon: DollarSign },
  { href: "/inventory", labelKey: "inventory", roles: ["admin", "warehouse", "sales"], icon: Package },
  { href: "/sales", labelKey: "sales", roles: ["admin", "warehouse", "sales"], icon: ShoppingCart },
  { href: "/users", labelKey: "users", roles: ["admin"], icon: Users },
  { href: "/import", labelKey: "import", roles: ["admin"], icon: Upload },
  { href: "/marketing", labelKey: "marketing", roles: ["admin"], icon: Megaphone },
];

export function SidebarNav({
  role,
  onNavigate,
  className,
}: {
  role: UserRole;
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {visible.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
