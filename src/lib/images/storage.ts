import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const STORAGE_ROOT = path.join(process.cwd(), "storage", "product-images");

export type ImageVariant = "source" | "cutout" | "ig-square" | "ig-portrait" | "facebook";

/**
 * Builds the relative path used for both the DB column and the public URL.
 * Kept flat (no nested dirs beyond productId) so resolveStoragePath's
 * traversal guard only has to reason about one path segment.
 */
export function buildRelativePath(productId: number, variant: ImageVariant, ext: string) {
  return `${productId}/${Date.now()}-${variant}.${ext}`;
}

export async function saveProductImageFile(relativePath: string, buffer: Buffer) {
  const absolutePath = resolveStoragePath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
}

export async function readProductImageFile(relativePath: string) {
  return readFile(resolveStoragePath(relativePath));
}

/**
 * Resolves a relative path against STORAGE_ROOT and throws if the result
 * would escape it (path traversal guard) — used both when writing generated
 * files and when serving them back through the route handler.
 */
export function resolveStoragePath(relativePath: string) {
  const absolutePath = path.join(STORAGE_ROOT, relativePath);
  const relativeToRoot = path.relative(STORAGE_ROOT, absolutePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error("Path escapes storage root");
  }

  return absolutePath;
}

export function publicImagePath(relativePath: string) {
  return `/api/product-images/${relativePath}`;
}

export function publicImageUrl(relativePath: string) {
  const base = process.env.PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return new URL(publicImagePath(relativePath), base).toString();
}
