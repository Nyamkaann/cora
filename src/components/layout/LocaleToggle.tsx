"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function LocaleToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: "mn" | "en") {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 text-xs font-medium">
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchTo("mn")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          locale === "mn"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        MN
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchTo("en")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          locale === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
    </div>
  );
}
