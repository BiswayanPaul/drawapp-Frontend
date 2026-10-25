"use server";

import { signIn, signOut } from "@/auth";
import db from "@/lib/db";
import { getUserByEmail } from "@/utils/user";
import { CredentialSchema, RegisterSchema } from "@/utils/schema";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import z from "zod";

type ActionResult = { success?: string; error?: string };

async function credentialsSignIn(email: string, password: string) {
  try {
    const url = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    // Some next-auth versions report failures via the returned URL instead of throwing.
    if (typeof url === "string" && url.includes("error=")) {
      return { error: "Invalid email or password" };
    }
    return { success: "Signed in" };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Invalid email or password"
            : "Something went wrong. Please try again.",
      };
    }
    throw error;
  }
}

export async function Register(
  values: z.infer<typeof RegisterSchema>
): Promise<ActionResult> {
  const parsed = RegisterSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return {
        error: existingUser.password
          ? "An account with this email already exists"
          : "This email is linked to Google. Use “Continue with Google”.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { name, email, password: hashedPassword },
    });
  } catch (error) {
    console.error("[register] Failed to create user", error);
    return { error: "Couldn't create your account. Please try again." };
  }

  return credentialsSignIn(email, password);
}

export async function SignInWithCredentials(
  values: z.infer<typeof CredentialSchema>
): Promise<ActionResult> {
  const parsed = CredentialSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return credentialsSignIn(
    parsed.data.email.toLowerCase(),
    parsed.data.password
  );
}

export async function SignInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function SignOut() {
  await signOut({ redirectTo: "/signin" });
}
