"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productImages, socialPosts, products } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { removeImageBackground } from "@/lib/images/background-removal";
import { renderProductTemplates } from "@/lib/images/template";
import {
  buildRelativePath,
  saveProductImageFile,
  readProductImageFile,
  publicImageUrl,
} from "@/lib/images/storage";
import { getMetaConfig, postPhotoToFacebookPage, postImageToInstagram } from "@/lib/meta";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type GenerateState = { error?: string; productImageId?: number } | undefined;

export async function generateProductImage(
  productId: number,
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const user = await requireRole("admin");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "no_file" };
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { error: "invalid_file_type" };
  }

  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) {
    return { error: "product_not_found" };
  }

  const sourceExt = file.type.split("/")[1];
  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const sourceRelPath = buildRelativePath(productId, "source", sourceExt);
  await saveProductImageFile(sourceRelPath, sourceBuffer);

  const [imageRow] = await db
    .insert(productImages)
    .values({
      productId,
      sourceImagePath: sourceRelPath,
      status: "processing",
      createdBy: Number(user.id),
    })
    .returning();

  try {
    const cutout = await removeImageBackground(sourceBuffer, file.type);
    const cutoutRelPath = buildRelativePath(productId, "cutout", "png");
    await saveProductImageFile(cutoutRelPath, cutout);

    const templates = await renderProductTemplates(cutout, product.name, product.sellPrice);
    const igSquareRelPath = buildRelativePath(productId, "ig-square", "png");
    const igPortraitRelPath = buildRelativePath(productId, "ig-portrait", "png");
    const facebookRelPath = buildRelativePath(productId, "facebook", "png");

    await Promise.all([
      saveProductImageFile(igSquareRelPath, templates.igSquare),
      saveProductImageFile(igPortraitRelPath, templates.igPortrait),
      saveProductImageFile(facebookRelPath, templates.facebook),
    ]);

    await db
      .update(productImages)
      .set({
        cutoutImagePath: cutoutRelPath,
        igSquarePath: igSquareRelPath,
        igPortraitPath: igPortraitRelPath,
        facebookPath: facebookRelPath,
        status: "ready",
      })
      .where(eq(productImages.id, imageRow.id));
  } catch (error) {
    await db
      .update(productImages)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      })
      .where(eq(productImages.id, imageRow.id));
  }

  revalidatePath("/[locale]/(dashboard)/marketing", "page");
  return { productImageId: imageRow.id };
}

export type PostResult = {
  platform: "facebook" | "instagram";
  status: "posted" | "failed" | "skipped";
  message?: string;
};
export type PostState = { results: PostResult[] } | { error: string } | undefined;

export async function postProductImage(productImageId: number): Promise<PostState> {
  await requireRole("admin");

  const imageRow = await db.query.productImages.findFirst({
    where: eq(productImages.id, productImageId),
    with: { product: true },
  });

  if (!imageRow || imageRow.status !== "ready") {
    return { error: "not_ready" };
  }

  const config = getMetaConfig();

  if (!config) {
    const skipped: PostResult[] = [
      { platform: "facebook", status: "skipped", message: "missing_credentials" },
      { platform: "instagram", status: "skipped", message: "missing_credentials" },
    ];
    await db.insert(socialPosts).values(
      skipped.map((r) => ({
        productImageId,
        platform: r.platform,
        status: "skipped" as const,
        errorMessage: r.message,
      }))
    );
    revalidatePath("/[locale]/(dashboard)/marketing", "page");
    return { results: skipped };
  }

  const caption = `${imageRow.product.name} — ${new Intl.NumberFormat("mn-MN").format(
    Number(imageRow.product.sellPrice)
  )}₮`;
  const results: PostResult[] = [];

  // Facebook: direct binary upload, works from any environment (including localhost).
  try {
    const fbBuffer = await readProductImageFile(imageRow.facebookPath!);
    const postId = await postPhotoToFacebookPage(config, fbBuffer, caption);
    await db.insert(socialPosts).values({
      productImageId,
      platform: "facebook",
      status: "posted",
      externalPostId: postId,
      postedAt: new Date(),
    });
    results.push({ platform: "facebook", status: "posted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    await db.insert(socialPosts).values({
      productImageId,
      platform: "facebook",
      status: "failed",
      errorMessage: message,
    });
    results.push({ platform: "facebook", status: "failed", message });
  }

  // Instagram: requires a publicly reachable image_url that Meta's servers fetch —
  // will fail in local dev since Meta cannot reach localhost.
  try {
    const imageUrl = publicImageUrl(imageRow.igSquarePath!);
    const mediaId = await postImageToInstagram(config, imageUrl, caption);
    await db.insert(socialPosts).values({
      productImageId,
      platform: "instagram",
      status: "posted",
      externalPostId: mediaId,
      postedAt: new Date(),
    });
    results.push({ platform: "instagram", status: "posted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    await db.insert(socialPosts).values({
      productImageId,
      platform: "instagram",
      status: "failed",
      errorMessage: message,
    });
    results.push({ platform: "instagram", status: "failed", message });
  }

  revalidatePath("/[locale]/(dashboard)/marketing", "page");
  return { results };
}
