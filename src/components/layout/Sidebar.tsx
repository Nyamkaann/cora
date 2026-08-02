import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { UserRole } from "@/types/next-auth";

const ITEMS: {
  href: string;
  labelKey: "finance" | "inventory" | "sales" | "users" | "import" | "marketing";
  roles: UserRole[];
}[] = [
  { href: "/finance", labelKey: "finance", roles: ["admin"] },
  { href: "/inventory", labelKey: "inventory", roles: ["admin", "warehouse", "sales"] },
  { href: "/sales", labelKey: "sales", roles: ["admin", "warehouse", "sales"] },
  { href: "/users", labelKey: "users", roles: ["admin"] },
  { href: "/import", labelKey: "import", roles: ["admin"] },
  { href: "/marketing", labelKey: "marketing", roles: ["admin"] },
];

export function Sidebar({ role }: { role: UserRole }) {
  const t = useTranslations("Nav");
  const visible = ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white p-4 md:block">
      <nav className="flex flex-col gap-1">
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
