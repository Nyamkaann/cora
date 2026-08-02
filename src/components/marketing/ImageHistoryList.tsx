import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PostButton } from "./PostButton";
import { formatDate } from "@/lib/format";
import { publicImageUrl } from "@/lib/images/storage";
import type { ProductImage, SocialPost } from "@/db/schema";
import type { PostResult } from "@/lib/actions/marketing";

type ImageWithPosts = ProductImage & { posts: SocialPost[] };

const STATUS_VARIANT = {
  processing: "neutral",
  ready: "success",
  failed: "danger",
} as const;

function latestResultsFromPosts(posts: SocialPost[]): PostResult[] {
  const byPlatform = new Map<string, SocialPost>();
  for (const post of posts) {
    const existing = byPlatform.get(post.platform);
    if (!existing || post.createdAt > existing.createdAt) {
      byPlatform.set(post.platform, post);
    }
  }
  return Array.from(byPlatform.values()).map((post) => ({
    platform: post.platform,
    status: post.status,
    message: post.errorMessage ?? undefined,
  }));
}

export async function ImageHistoryList({ images, locale }: { images: ImageWithPosts[]; locale: string }) {
  const t = await getTranslations("Marketing");
  const tCommon = await getTranslations("Common");

  if (images.length === 0) {
    return <p className="text-sm text-neutral-400">{tCommon("noResults")}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-neutral-700">{t("historyTitle")}</h2>
      {images.map((image) => (
        <Card key={image.id} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600">{formatDate(image.createdAt, locale)}</span>
            <Badge variant={STATUS_VARIANT[image.status]}>
              {image.status === "ready"
                ? t("statusReady")
                : image.status === "failed"
                  ? t("statusFailed")
                  : t("statusProcessing")}
            </Badge>
          </div>

          {image.status === "failed" && image.errorMessage && (
            <p className="text-sm text-red-600">{image.errorMessage}</p>
          )}

          {image.status === "ready" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs text-neutral-500">{t("previewIgSquare")}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicImageUrl(image.igSquarePath!)}
                    alt={t("previewIgSquare")}
                    className="w-full rounded-md border border-neutral-200"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-neutral-500">{t("previewIgPortrait")}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicImageUrl(image.igPortraitPath!)}
                    alt={t("previewIgPortrait")}
                    className="w-full rounded-md border border-neutral-200"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-neutral-500">{t("previewFacebook")}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicImageUrl(image.facebookPath!)}
                    alt={t("previewFacebook")}
                    className="w-full rounded-md border border-neutral-200"
                  />
                </div>
              </div>

              <PostButton productImageId={image.id} initialResults={latestResultsFromPosts(image.posts)} />
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
