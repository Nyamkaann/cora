"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { salesLog, products } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { salesLogSchema } from "@/lib/validation";

const CREATE_ROLES = ["admin", "sales"] as const;

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function createSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(...CREATE_ROLES);

  const parsed = salesLogSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    channel: formData.get("channel"),
    soldAt: formData.get("soldAt"),
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const { productId, quantity, unitPrice, channel, soldAt } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [product] = await tx
        .select({ stockQty: products.stockQty })
        .from(products)
        .where(eq(products.id, productId))
        .for("update");

      if (!product || product.stockQty < quantity) {
        throw new Error("insufficient_stock");
      }

      await tx
        .update(products)
        .set({ stockQty: sql`${products.stockQty} - ${quantity}`, updatedAt: new Date() })
        .where(eq(products.id, productId));

      await tx.insert(salesLog).values({
        productId,
        quantity,
        unitPrice: String(unitPrice),
        totalPrice: String(unitPrice * quantity),
        channel,
        soldAt,
        soldBy: Number(user.id),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "insufficient_stock") {
      return { error: "insufficient_stock" };
    }
    throw error;
  }

  revalidatePath("/[locale]/(dashboard)/sales", "page");
  revalidatePath("/[locale]/(dashboard)/inventory", "page");
  return { success: true };
}

export async function deleteSale(id: number) {
  await requireRole("admin");

  await db.transaction(async (tx) => {
    const [sale] = await tx.select().from(salesLog).where(eq(salesLog.id, id));
    if (!sale) return;

    await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} + ${sale.quantity}`, updatedAt: new Date() })
      .where(eq(products.id, sale.productId));

    await tx.delete(salesLog).where(eq(salesLog.id, id));
  });

  revalidatePath("/[locale]/(dashboard)/sales", "page");
  revalidatePath("/[locale]/(dashboard)/inventory", "page");
}
