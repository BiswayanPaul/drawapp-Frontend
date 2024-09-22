"use server";

import { signIn, signOut } from "@/auth";
import db from "@/lib/db";
import { getUserByEmail } from "@/utils/user";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

export async function Register({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const existingUser = await getUserByEmail(email);
    console.log(existingUser);

    if (existingUser) {
      return { error: "User Already exist" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
      },
    });

    return { success: "New User Created", user };
  } catch (error) {
    console.log(error);
    throw new Error("Can't create User");
  }
}

export async function SignInWithCredentials({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return {
      success: "Logged In Success fully",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            error: "Invalid Credentials",
          };
        default:
          return {
            error: "Something Went Wrong",
          };
      }
    }
    throw error;
  }
}

export async function SingInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function SignOut() {
  await signOut({ redirectTo: "/register" });
}
