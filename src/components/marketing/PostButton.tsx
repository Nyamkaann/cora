"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { postProductImage, type PostResult } from "@/lib/actions/marketing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_VARIANT = {
  posted: "success",
  failed: "danger",
  skipped: "warning",
} as const;

export function PostStatusBadge({ status }: { status: "posted" | "failed" | "skipped" }) {
  const t = useTranslations("Marketing");
  const labelKey = status === "posted" ? "postStatusPosted" : status === "failed" ? "postStatusFailed" : "postStatusSkipped";
  return <Badge variant={STATUS_VARIANT[status]}>{t(labelKey)}</Badge>;
}

export function PostButton({
  productImageId,
  initialResults,
}: {
  productImageId: number;
  initialResults: PostResult[];
}) {
  const t = useTranslations("Marketing");
  const [results, setResults] = useState<PostResult[]>(initialResults);
  const [isPending, startTransition] = useTransition();

  const alreadyPosted = results.some((r) => r.status === "posted");

  function handleClick() {
    startTransition(async () => {
      const response = await postProductImage(productImageId);
      if (response && "results" in response) {
        setResults(response.results);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleClick} disabled={isPending || alreadyPosted} variant="secondary">
          {isPending ? t("posting") : alreadyPosted ? t("alreadyPosted") : t("postButton")}
        </Button>
        {results.map((r) => (
          <div key={r.platform} className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span>{r.platform === "facebook" ? t("facebookStatus") : t("instagramStatus")}</span>
            <PostStatusBadge status={r.status} />
          </div>
        ))}
      </div>
      {results
        .filter((r) => r.message)
        .map((r) => (
          <p key={r.platform} className="text-xs text-neutral-500">
            {r.message === "missing_credentials" ? t("reasonMissingCredentials") : r.message}
          </p>
        ))}
    </div>
  );
}
