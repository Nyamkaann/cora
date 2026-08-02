"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  redirectTo: string,
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo,
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "invalid_credentials" };
    }
    throw error;
  }
}
