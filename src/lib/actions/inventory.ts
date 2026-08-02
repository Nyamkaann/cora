"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, categories, brands } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { productSchema, categorySchema, brandSchema } from "@/lib/validation";

const MANAGE_ROLES = ["admin", "warehouse"] as const;

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || null,
    categoryId: formData.get("categoryId") || null,
    brandId: formData.get("brandId") || null,
    unit: formData.get("unit") || null,
    costPrice: formData.get("costPrice"),
    sellPrice: formData.get("sellPrice"),
    stockQty: formData.get("stockQty"),
    lowStockThreshold: formData.get("lowStockThreshold"),
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  await db.insert(products).values({
    name: parsed.data.name,
    sku: parsed.data.sku ?? null,
    categoryId: parsed.data.categoryId ?? null,
    brandId: parsed.data.brandId ?? null,
    unit: parsed.data.unit ?? null,
    costPrice: String(parsed.data.costPrice),
    sellPrice: String(parsed.data.sellPrice),
    stockQty: parsed.data.stockQty,
    lowStockThreshold: parsed.data.lowStockThreshold,
  });

  revalidatePath("/[locale]/(dashboard)/inventory", "page");
  return { success: true };
}

export async function updateProduct(
  id: number,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || null,
    categoryId: formData.get("categoryId") || null,
    brandId: formData.get("brandId") || null,
    unit: formData.get("unit") || null,
    costPrice: formData.get("costPrice"),
    sellPrice: formData.get("sellPrice"),
    stockQty: formData.get("stockQty"),
    lowStockThreshold: formData.get("lowStockThreshold"),
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  await db
    .update(products)
    .set({
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      categoryId: parsed.data.categoryId ?? null,
      brandId: parsed.data.brandId ?? null,
      unit: parsed.data.unit ?? null,
      costPrice: String(parsed.data.costPrice),
      sellPrice: String(parsed.data.sellPrice),
      stockQty: parsed.data.stockQty,
      lowStockThreshold: parsed.data.lowStockThreshold,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));

  revalidatePath("/[locale]/(dashboard)/inventory", "page");
  return { success: true };
}

export async function deleteProduct(id: number) {
  await requireRole(...MANAGE_ROLES);
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/[locale]/(dashboard)/inventory", "page");
}

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  await db.insert(categories).values({ name: parsed.data.name }).onConflictDoNothing();
  revalidatePath("/[locale]/(dashboard)/inventory", "page");
  return { success: true };
}

export async function createBrand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);

  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  await db.insert(brands).values({ name: parsed.data.name }).onConflictDoNothing();
  revalidatePath("/[locale]/(dashboard)/inventory", "page");
  return { success: true };
}
