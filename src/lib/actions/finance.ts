"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { financeTransactions } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { financeTransactionSchema } from "@/lib/validation";

export type ActionState = { error?: string; success?: boolean } | undefined;

function parseInput(formData: FormData) {
  return financeTransactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    note: formData.get("note") || null,
    occurredAt: formData.get("occurredAt"),
  });
}

export async function createTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("admin");
  const parsed = parseInput(formData);

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  await db.insert(financeTransactions).values({
    type: parsed.data.type,
    category: parsed.data.category,
    amount: String(parsed.data.amount),
    note: parsed.data.note ?? null,
    occurredAt: parsed.data.occurredAt,
    createdBy: Number(user.id),
  });

  revalidatePath("/[locale]/(dashboard)/finance", "page");
  return { success: true };
}

export async function updateTransaction(
  id: number,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = parseInput(formData);

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  await db
    .update(financeTransactions)
    .set({
      type: parsed.data.type,
      category: parsed.data.category,
      amount: String(parsed.data.amount),
      note: parsed.data.note ?? null,
      occurredAt: parsed.data.occurredAt,
    })
    .where(eq(financeTransactions.id, id));

  revalidatePath("/[locale]/(dashboard)/finance", "page");
  return { success: true };
}

export async function deleteTransaction(id: number) {
  await requireRole("admin");
  await db.delete(financeTransactions).where(eq(financeTransactions.id, id));
  revalidatePath("/[locale]/(dashboard)/finance", "page");
}
