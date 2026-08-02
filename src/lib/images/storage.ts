import "server-only";
import { supabaseAdmin, PRODUCT_IMAGES_BUCKET } from "@/lib/supabase-admin";

export type ImageVariant = "source" | "cutout" | "ig-square" | "ig-portrait" | "facebook";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * Builds the relative path used both as the Supabase Storage object key and,
 * combined with the bucket's public URL, the path browsers/Meta fetch it from.
 */
export function buildRelativePath(productId: number, variant: ImageVariant, ext: string) {
  return `${productId}/${Date.now()}-${variant}.${ext}`;
}

// Stored on local disk this would break on Vercel: serverless functions get a fresh,
// isolated filesystem per invocation, so a file written in one request is gone by the
// next. Supabase Storage (same project as the database) gives every generated image a
// stable, publicly fetchable URL regardless of which function instance handles a request
// — required for Instagram's Graph API, which fetches the image itself from a URL.
export async function saveProductImageFile(relativePath: string, buffer: Buffer) {
  const ext = relativePath.split(".").pop()?.toLowerCase() ?? "";
  const { error } = await supabaseAdmin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(relativePath, buffer, {
      contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${relativePath}: ${error.message}`);
  }
}

export async function readProductImageFile(relativePath: string) {
  const { data, error } = await supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).download(relativePath);

  if (error || !data) {
    throw new Error(`Failed to download ${relativePath}: ${error?.message ?? "not found"}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export function publicImageUrl(relativePath: string) {
  return supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(relativePath).data.publicUrl;
}
