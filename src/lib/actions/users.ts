"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth-guard";
import { createUserSchema } from "@/lib/validation";

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    return { error: "email_taken" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.insert(users).values({
    name: parsed.data.name,
    email,
    role: parsed.data.role,
    passwordHash,
  });

  revalidatePath("/[locale]/(dashboard)/users", "page");
  return { success: true };
}

export async function setUserActive(id: number, isActive: boolean) {
  await requireRole("admin");
  await db.update(users).set({ isActive }).where(eq(users.id, id));
  revalidatePath("/[locale]/(dashboard)/users", "page");
}
