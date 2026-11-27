"use client";

import { useState } from "react";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { SignInForm } from "./signin-form";
import { RegisterForm } from "./register-form";

export type AuthMode = "signin" | "register";

// Sign in / create account, as a popup over the board.
export function AuthDialog({
  initialMode = "signin",
  next = "/",
  initialError,
  onClose,
}: {
  initialMode?: AuthMode;
  next?: string;
  initialError?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  return (
    <GlassDialog onClose={onClose} labelledBy="auth-title" className="max-w-md">
      {mode === "signin" ? (
        <SignInForm initialError={initialError} next={next} onSwitch={() => setMode("register")} />
      ) : (
        <RegisterForm next={next} onSwitch={() => setMode("signin")} />
      )}
    </GlassDialog>
  );
}
