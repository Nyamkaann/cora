"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

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
    <div className="flex items-center gap-1 rounded-md border border-neutral-300 p-0.5 text-xs font-medium">
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchTo("mn")}
        className={`rounded px-2 py-1 ${locale === "mn" ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
      >
        MN
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchTo("en")}
        className={`rounded px-2 py-1 ${locale === "en" ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
      >
        EN
      </button>
    </div>
  );
}
