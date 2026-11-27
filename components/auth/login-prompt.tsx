"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassDialog } from "@/components/ui/glass-dialog";
import { GoogleButton } from "./google-button";
import { withNext } from "@/lib/redirect";

type PromptProps = {
  title: string;
  message: string;
  // Where to come back to once signed in.
  next: string;
  // When given, email sign-in/registration opens in place instead of navigating.
  onEmail?: (mode: "signin" | "register") => void;
};

function PromptBody({ title, message, next, onEmail }: PromptProps) {
  return (
    <>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <LogIn className="size-6" />
      </span>
      <h2 id="login-prompt-title" className="font-display text-3xl font-bold leading-tight">
        {title}
      </h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{message}</p>
      <div className="space-y-3">
        <GoogleButton next={next} />
        {onEmail ? (
          <Button className="h-11 w-full" onClick={() => onEmail("signin")}>
            Sign in with email
          </Button>
        ) : (
          <Button asChild className="h-11 w-full">
            <Link href={withNext("/signin", next)}>Sign in with email</Link>
          </Button>
        )}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        New here?{" "}
        {onEmail ? (
          <button onClick={() => onEmail("register")} className="font-medium text-primary hover:underline">
            Create an account
          </button>
        ) : (
          <Link href={withNext("/register", next)} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        )}
      </p>
    </>
  );
}

// Shown when a guest tries something that needs an account.
export function LoginPrompt({ onClose, ...props }: PromptProps & { onClose: () => void }) {
  return (
    <GlassDialog onClose={onClose} labelledBy="login-prompt-title" className="text-center">
      <PromptBody {...props} />
    </GlassDialog>
  );
}

// Card version for pages that can't be used at all without an account.
export function LoginRequired({ children, ...props }: PromptProps & { children?: React.ReactNode }) {
  return (
    <GlassCard>
      <PromptBody {...props} />
      {children}
    </GlassCard>
  );
}
